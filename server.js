import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import sharp from 'sharp';
import compression from 'compression'; // Quay lại Gzip chân ái
import helmet from 'helmet'; // Bảo mật HTTP Headers


// Get __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// SECURITY HARDENING
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Cho phép load ảnh từ domain khác nếu cần
    contentSecurityPolicy: false // Tạm tắt CSP để tránh lỗi load script/ảnh inline (React)
}));

app.use(compression()); // Kích hoạt Gzip (không bao giờ lỗi)
app.enable('trust proxy'); // Cần thiết khi chạy sau Nginx (để nhận diện đúng https)
const PORT = process.env.PORT || 3001; // Ưu tiên PORT từ env
const HOST = '0.0.0.0'; // Bind tất cả IP để tránh lỗi kết nối từ OLS

// Nếu không có HOST trong env, ta sẽ cố gắng sử dụng request header để xác định host động trong các API upload
const USE_DYNAMIC_HOST = !process.env.HOST;


// Cấu hình CORS (Đã fix lỗi wildcard *)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-bot-api-secret-token'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// LOGGING MIDDLEWARE để biết có request nào đang đến không
app.use((req, res, next) => {
    if (req.url.includes('/api/')) {
        console.log(`📡 [${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    }
    next();
});

// Tạo folder uploads nếu chưa có (giống WordPress /wp-content/uploads)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Database file (lưu products, categories, settings giống WordPress database)
const dbFile = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify({
        products: [],
        categories: [],
        settings: {},
        categorySettings: {},
        media: {}, // Storage for image SEO metadata: { filename: { alt, title, description } }
        zaloNumber: '',
        orders: [] // NEW: Order management
    }, null, 2));
}

// ==================== SHIPPING FEES APIs (URGENT FIX) ====================
app.get('/api/shipping-fees', (req, res) => {
    try {
        console.log('📥 GET /api/shipping-fees request received');
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        const fees = db.shippingFees || {};
        const defaultShippingFee = db.defaultShippingFee || 50000;
        res.json({ success: true, fees, defaultShippingFee });
    } catch (error) {
        console.error('❌ Lỗi lấy shipping fees:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/shipping-fees', (req, res) => {
    try {
        console.log('📥 PUT /api/shipping-fees request received');
        const { fees, defaultShippingFee } = req.body;
        if (!fees || typeof fees !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid fees data' });
        }
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        db.shippingFees = fees;
        if (defaultShippingFee !== undefined) db.defaultShippingFee = Number(defaultShippingFee);
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
        console.log('💾 Shipping fees updated in database');
        res.json({ success: true, message: 'Cập nhật thành công!', fees: db.shippingFees, defaultShippingFee: db.defaultShippingFee });
    } catch (error) {
        console.error('❌ Lỗi cập nhật shipping fees:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== AUTHENTICATION API ====================
// Credentials được lưu trong biến môi trường
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    console.error("❌ LỖI BẢO MẬT: Chưa cấu hình ADMIN_USERNAME hoặc ADMIN_PASSWORD trong file .env");
    console.error("👉 Vui lòng tạo file .env và thêm ADMIN_USERNAME=... ADMIN_PASSWORD=...");
    process.exit(1);
}

// API: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({
            success: true,
            message: 'Đăng nhập thành công!'
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Sai tài khoản hoặc mật khẩu!'
        });
    }
});


// ==================== DATABASE API ====================



// Serve static files từ folder uploads
app.use('/uploads', express.static(uploadsDir, {
    // Cache lâu dài (1 năm) để tối ưu tốc độ load ảnh
    // Vì tên file đã có suffix random nên ít khi bị trùng, nếu trùng thì tên file khác -> URL khác -> không lo cache cũ
    maxAge: '1y',
    etag: true,
    lastModified: true
}));

// ==================== DATABASE API ====================

// GET: Lấy toàn bộ database
app.get('/api/database', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST: Lưu toàn bộ database (Merge with existing data to preserve orders)
app.post('/api/database', (req, res) => {
    try {
        const newData = req.body;

        // Read current database to preserve fields not sent by frontend (like orders)
        let currentDb = {};
        if (fs.existsSync(dbFile)) {
            currentDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        }

        // Merge new data into current database
        // This ensures that if frontend doesn't send 'orders', it's not deleted
        const updatedDb = {
            ...currentDb,
            ...newData,
            // Explicitly preserve orders if not provided in newData (just to be safe, though spread handles it)
            orders: newData.orders || currentDb.orders || []
        };

        fs.writeFileSync(dbFile, JSON.stringify(updatedDb, null, 2));

        // ==================== AUTO-UPDATE INDEX.HTML ====================
        // Update index.html meta tags to prevent flickering
        if (updatedDb.settings) {
            // Update both source and built index.html
            const indexFiles = [
                path.join(__dirname, 'index.html'),           // Source file (for dev)
                path.join(__dirname, 'dist', 'index.html')    // Built file (for production)
            ];

            indexFiles.forEach(indexFile => {
                if (!fs.existsSync(indexFile)) {
                    console.log(`⚠️  Skipping ${indexFile} (not found)`);
                    return;
                }

                let indexContent = fs.readFileSync(indexFile, 'utf8');
                const s = updatedDb.settings;

                // Helper to replace content in meta tags
                const replaceMeta = (name, content) => {
                    // Escape special characters in content
                    const escapedContent = content.replace(/"/g, '&quot;');

                    // Try both attribute orders
                    const regex1 = new RegExp(`<meta\\s+name="${name}"\\s+content="[^"]*">`, 'gi');
                    const regex2 = new RegExp(`<meta\\s+content="[^"]*"\\s+name="${name}">`, 'gi');

                    // Replace with name-first format
                    indexContent = indexContent.replace(regex1, `<meta name="${name}" content="${escapedContent}">`);
                    indexContent = indexContent.replace(regex2, `<meta name="${name}" content="${escapedContent}">`);
                };

                const replaceProperty = (property, content) => {
                    const escapedContent = content.replace(/"/g, '&quot;');

                    const regex1 = new RegExp(`<meta\\s+property="${property}"\\s+content="[^"]*">`, 'gi');
                    const regex2 = new RegExp(`<meta\\s+content="[^"]*"\\s+property="${property}">`, 'gi');

                    indexContent = indexContent.replace(regex1, `<meta property="${property}" content="${escapedContent}">`);
                    indexContent = indexContent.replace(regex2, `<meta property="${property}" content="${escapedContent}">`);
                };

                // 1. Title
                const title = s.seoTitle || s.websiteName || 'Tiệm Hoa Tươi';
                indexContent = indexContent.replace(/<title>.*<\/title>/, `<title>${title}</title>`);

                // 2. Description & Keywords
                if (s.seoDescription) {
                    replaceMeta('description', s.seoDescription);
                    replaceProperty('og:description', s.seoDescription);
                    replaceProperty('twitter:description', s.seoDescription);
                }

                if (s.seoKeywords) {
                    replaceMeta('keywords', s.seoKeywords);
                }

                // 3. OG Title & Twitter Title
                replaceMeta('title', title);
                replaceProperty('og:title', title);
                replaceProperty('twitter:title', title);

                // 4. Favicon
                if (s.faviconUrl) {
                    // Support both <link rel="icon" href="..."> and type="image/..."
                    indexContent = indexContent.replace(/<link rel="icon"([^>]*)href="[^"]*"/, `<link rel="icon"$1href="${s.faviconUrl}"`);
                }

                // 5. Social Share Image (og:image & twitter:image)
                if (s.socialShareImage) {
                    replaceProperty('og:image', s.socialShareImage);
                    replaceProperty('twitter:image', s.socialShareImage);
                }

                fs.writeFileSync(indexFile, indexContent, 'utf8');
                console.log(`✅ Updated ${indexFile.includes('dist') ? 'dist/' : ''}index.html`);
                console.log('   📝 Title:', title);
                console.log('   📝 Description:', s.seoDescription?.substring(0, 50) + '...');
                console.log('   📝 Keywords:', s.seoKeywords?.substring(0, 50) + '...');
            });
        }

        res.json({ success: true, message: 'Đã lưu database thành công!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ANALYTICS API ====================

// Analytics file (lưu riêng để dễ quản lý)
const analyticsFile = path.join(__dirname, 'analytics.json');
if (!fs.existsSync(analyticsFile)) {
    fs.writeFileSync(analyticsFile, JSON.stringify({
        pageViews: [],
        productClicks: [],
        sessionStart: Date.now()
    }, null, 2));
}

// POST: Track page view
app.post('/api/analytics/page-view', (req, res) => {
    try {
        const { path: viewPath, referrer, userAgent, sessionId } = req.body;

        const analyticsData = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));

        analyticsData.pageViews.push({
            timestamp: Date.now(),
            path: viewPath || '/',
            referrer: referrer || '',
            userAgent: userAgent || '',
            sessionId: sessionId || '',
            ip: req.ip || req.connection.remoteAddress
        });

        // Giới hạn 50,000 records để tránh file quá lớn
        if (analyticsData.pageViews.length > 50000) {
            analyticsData.pageViews = analyticsData.pageViews.slice(-50000);
        }

        fs.writeFileSync(analyticsFile, JSON.stringify(analyticsData, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking page view:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Track product click
app.post('/api/analytics/product-click', (req, res) => {
    try {
        const { productId, productTitle, category, sessionId } = req.body;

        if (!productId) {
            return res.status(400).json({ error: 'ProductId is required' });
        }

        const analyticsData = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));

        analyticsData.productClicks.push({
            timestamp: Date.now(),
            productId,
            productTitle: productTitle || '',
            category: category || '',
            sessionId: sessionId || '',
            ip: req.ip || req.connection.remoteAddress
        });

        // Giới hạn 50,000 records
        if (analyticsData.productClicks.length > 50000) {
            analyticsData.productClicks = analyticsData.productClicks.slice(-50000);
        }

        fs.writeFileSync(analyticsFile, JSON.stringify(analyticsData, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error tracking product click:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Get analytics data
app.get('/api/analytics', (req, res) => {
    try {
        const analyticsData = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));
        res.json({ success: true, data: analyticsData });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Clear analytics data
app.delete('/api/analytics', (req, res) => {
    try {
        const { olderThan } = req.query; // Optional: timestamp để xóa data cũ hơn thời điểm này

        if (olderThan) {
            const cutoff = parseInt(olderThan);
            const analyticsData = JSON.parse(fs.readFileSync(analyticsFile, 'utf8'));

            analyticsData.pageViews = analyticsData.pageViews.filter(v => v.timestamp >= cutoff);
            analyticsData.productClicks = analyticsData.productClicks.filter(c => c.timestamp >= cutoff);

            fs.writeFileSync(analyticsFile, JSON.stringify(analyticsData, null, 2));
            res.json({ success: true, message: 'Đã xóa dữ liệu analytics cũ!' });
        } else {
            // Xóa toàn bộ
            fs.writeFileSync(analyticsFile, JSON.stringify({
                pageViews: [],
                productClicks: [],
                sessionStart: Date.now()
            }, null, 2));
            res.json({ success: true, message: 'Đã xóa toàn bộ dữ liệu analytics!' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== IMAGE UPLOAD API ====================


// Cấu hình Multer để lưu file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên file unique ngắn gọn: 6 số ngẫu nhiên theo yêu cầu
        const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        // Sanitize filename
        const safeName = nameWithoutExt.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        cb(null, safeName + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Max 5MB
    },
    fileFilter: (req, file, cb) => {
        // Cho phép upload ảnh và font chữ
        const allowedTypes = /jpeg|jpg|png|gif|webp|ttf|otf|woff|woff2/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().replace('.', ''));
        // Mimetype cho font có thể phức tạp, nên check extname là chính
        // const mimetype = allowedTypes.test(file.mimetype);

        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh (JPEG, PNG, GIF, WebP) hoặc font (TTF, OTF, WOFF)!'));
        }
    }
});

// API: Upload single image với auto-optimization
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Không có file nào được upload!' });
        }

        const originalPath = req.file.path;
        const ext = path.extname(req.file.filename);
        const nameWithoutExt = path.basename(req.file.filename, ext);

        // Logic tối ưu hình ảnh thông minh:
        // 1. File .ico hoặc file ảnh nhỏ (< 200KB) -> Giữ nguyên gốc (Logo/Favicon)
        // 2. File ảnh lớn -> Convert sang WebP để tối ưu tốc độ

        const isSmallFile = req.file.size < 200 * 1024; // < 200KB
        const isIco = ext.toLowerCase() === '.ico';
        const isGif = ext.toLowerCase() === '.gif'; // GIF động không nên convert static
        const isFont = /^\.(ttf|otf|woff|woff2)$/i.test(ext); // Font file

        if (isIco || isGif || isSmallFile || isFont) {
            // GIỮ NGUYÊN FILE GỐC
            // Rename file để đảm bảo format an toàn (đã được tạo ở storage filename, chỉ cần move file nếu cần thiết, 
            // nhưng multer đã lưu file ở 'originalPath' = safeName-uniqueSuffix.ext rồi)

            // Chỉ cần trả về đường dẫn file gốc
            const savedFilename = path.basename(originalPath);
            const imageUrl = `/uploads/${savedFilename}`;

            res.json({
                success: true,
                url: imageUrl,
                filename: savedFilename,
                originalName: req.file.originalname,
                size: req.file.size,
                optimized: false // Báo là không convert
            });
        } else {
            // CONVERT SANG WEBP (Sản phẩm, Banner lớn)
            const optimizedFilename = `${nameWithoutExt}.webp`;
            const optimizedPath = path.join(uploadsDir, optimizedFilename);

            await sharp(originalPath)
                .resize(1920, 1920, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .webp({ quality: 85 })
                .toFile(optimizedPath);

            // Xóa file gốc sau khi convert thành công
            fs.unlinkSync(originalPath);

            const imageUrl = `/uploads/${optimizedFilename}`;

            res.json({
                success: true,
                url: imageUrl,
                filename: optimizedFilename,
                originalName: req.file.originalname,
                size: fs.statSync(optimizedPath).size,
                optimized: true
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Upload multiple images (tối đa 5)
app.post('/api/upload-multiple', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Không có file nào được upload!' });
        }

        // Trả về array URLs (tương đối)
        const images = req.files.map(file => ({
            url: `/uploads/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
            size: file.size
        }));

        res.json({
            success: true,
            images: images,
            count: images.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Delete image - Sử dụng cú pháp chuẩn để tránh lỗi server
app.delete('/api/upload/:filename', (req, res) => {
    try {
        const filename = decodeURIComponent(req.params.filename);
        const filePath = path.normalize(path.join(uploadsDir, filename));

        console.log(`\n--- YÊU CẦU XÓA FILE ---`);
        console.log(`- Filename nhận được: ${req.params.filename}`);
        console.log(`- Filename sau decode: ${filename}`);
        console.log(`- Folder uploads: ${uploadsDir}`);
        console.log(`- Đường dẫn file: ${filePath}`);

        // Bảo mật: Không cho phép xóa file ngoài folder uploads
        if (!filePath.startsWith(uploadsDir)) {
            console.error('🔥 Cảnh báo bảo mật: Cố gắng xóa file ngoài phạm vi cho phép!');
            return res.status(403).json({ error: 'Không có quyền truy cập file này!' });
        }

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('✅ Kết quả: Đã xóa file thành công!');
            res.json({ success: true, message: 'Đã xóa ảnh thành công!' });
        } else {
            console.warn('⚠️ File không tồn tại (coi như đã xóa)!');
            // Trả về success để frontend không báo lỗi
            res.json({ success: true, message: 'Ảnh đã được xóa (hoặc không tồn tại)!' });
        }
    } catch (error) {
        console.error('🔥 Lỗi server khi xóa:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: List all uploaded images
app.get('/api/uploads', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const images = files
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => ({
                filename: file,
                url: `/uploads/${file}`, // Use relative URL instead of absolute
                size: fs.statSync(path.join(uploadsDir, file)).size,
                uploadedAt: fs.statSync(path.join(uploadsDir, file)).mtime
            }));

        res.json({
            success: true,
            images: images,
            count: images.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: Rename image file (for SEO optimization)
app.put('/api/rename-upload/:oldFilename', (req, res) => {
    try {
        const oldFilename = decodeURIComponent(req.params.oldFilename);
        const { newFilename } = req.body;

        if (!newFilename) {
            return res.status(400).json({ error: 'Tên file mới không được để trống!' });
        }

        console.log(`\n--- YÊU CẦU ĐỔI TÊN FILE ---`);
        console.log(`- Tên cũ: ${oldFilename}`);
        console.log(`- Tên mới được đề xuất: ${newFilename}`);

        // Create SEO-friendly filename
        const ext = path.extname(oldFilename);
        const randomId = Math.floor(100000 + Math.random() * 900000); // 6 chữ số ngẫu nhiên

        // Sanitize new filename: remove Vietnamese accents, special chars, convert to lowercase
        const slug = newFilename
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Handle đ separately
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

        const finalFilename = `${slug}-${randomId}${ext}`;
        console.log(`- Tên file cuối cùng (SEO): ${finalFilename}`);

        const oldPath = path.normalize(path.join(uploadsDir, oldFilename));
        const newPath = path.normalize(path.join(uploadsDir, finalFilename));

        // Security check
        if (!oldPath.startsWith(uploadsDir) || !newPath.startsWith(uploadsDir)) {
            console.error('🔥 Cảnh báo bảo mật: Cố gắng rename file ngoài phạm vi cho phép!');
            return res.status(403).json({ error: 'Không có quyền truy cập file này!' });
        }

        // Check if old file exists
        if (!fs.existsSync(oldPath)) {
            console.warn('❌ File cũ không tồn tại!');
            return res.status(404).json({ error: 'Không tìm thấy file cần đổi tên!' });
        }

        // Check if new filename already exists
        if (fs.existsSync(newPath)) {
            console.warn('❌ File mới đã tồn tại!');
            return res.status(409).json({ error: 'Tên file này đã tồn tại!' });
        }

        // Rename the file
        fs.renameSync(oldPath, newPath);
        console.log('✅ Đã đổi tên file thành công!');

        // Generate new URL
        const protocol = req.get('x-forwarded-proto') || req.protocol;
        const host = req.get('host');
        const newUrl = `${protocol}://${host}/uploads/${finalFilename}`;

        res.json({
            success: true,
            message: 'Đã đổi tên file thành công!',
            oldFilename: oldFilename,
            newFilename: finalFilename,
            newUrl: newUrl
        });
    } catch (error) {
        console.error('🔥 Lỗi khi đổi tên file:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== ZALO BOT WEBHOOK & TRACKING ====================

// ==================== ZALO BOT TRACKING ====================

// Helper function to get Zalo configuration from Database or Env
const getZaloConfig = () => {
    try {
        let settings = {};
        if (fs.existsSync(dbFile)) {
            const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
            settings = db.settings || {};
        }

        // Prioritize Database settings, fallback to Environment variables
        const botToken = settings.zaloBotToken || process.env.BOT_TOKEN || '';
        const ownerIdsString = settings.zaloAdminIds || process.env.OWNER_ZALO_ID || '';

        return {
            botToken: botToken,
            ownerIds: ownerIdsString
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0),
            shopName: process.env.SHOP_NAME || 'Tientienflorist'
        };
    } catch (error) {
        console.error('Error reading Zalo config:', error);
        return { botToken: '', ownerIds: [], shopName: 'Tientienflorist' };
    }
};

// Tracking endpoint - nhận click từ website
app.post('/api/track-click', async (req, res) => {
    try {
        const { productName, productUrl, productId } = req.body;

        if (!productName || !productUrl) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: productName, productUrl'
            });
        }

        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const time = new Date().toLocaleString('vi-VN', {
            timeZone: 'Asia/Ho_Chi_Minh',
            dateStyle: 'short',
            timeStyle: 'medium'
        });

        const { botToken, ownerIds, shopName } = getZaloConfig();

        // Format message
        let message = `🔔 [${shopName}] THÔNG BÁO CLICK\n\n`;
        message += `📦 Sản phẩm: ${productName}\n`;
        message += `🔗 Link: ${productUrl}\n`;
        message += `⏰ Thời gian: ${time}\n`;
        if (productId) message += `🆔 ID: ${productId}\n`;
        if (userIp) message += `🌐 IP: ${userIp}\n`;

        console.log('\n🔔 ===== TRACKING CLICK =====');
        console.log(`Sản phẩm: ${productName}`);
        console.log(`IP: ${userIp}`);

        // Gửi thông báo đến TẤT CẢ chủ shop/nhân viên qua Zalo Bot
        if (ownerIds.length > 0 && botToken) {
            console.log(`📤 Gửi thông báo đến ${ownerIds.length} người...`);

            for (const ownerId of ownerIds) {
                try {
                    await axios.post(
                        `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`,
                        {
                            chat_id: ownerId,
                            text: message
                        },
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                    console.log(`✅ Đã gửi thông báo Zalo đến ${ownerId}`);
                } catch (zaloError) {
                    console.error(`⚠️ Lỗi gửi Zalo cho ${ownerId}:`, zaloError.response?.data || zaloError.message);
                }
            }
        } else {
            console.log('⚠️ Chưa cấu hình Zalo Bot Token hoặc Admin IDs trong Admin Settings');
        }

        res.json({ success: true, message: 'Tracked successfully' });
    } catch (error) {
        console.error('❌ Lỗi track click:', error);
        res.status(500).json({ success: false, message: 'Error' });
    }
});

// ==================== SUBMIT ORDER ====================

app.post('/api/submit-order', async (req, res) => {
    try {
        const {
            productName,
            productId,
            productPrice,
            customerName,
            customerPhone,
            customerAddress,
            note,
            // Thông tin địa chỉ HCM
            isHCMAddress,
            district,
            // Thông tin quà tặng
            isGift,
            senderName,
            senderPhone,
            // Thông tin biến thể
            variantId,
            variantName,
            variantSKU,
            // Thông tin thiệp/bảng chữ
            isCard,
            cardType,
            cardContent,
            // Thông tin giao hàng
            deliveryMode,
            deliveryTime,
            deliverySession, // NEW
            // Thông tin thanh toán
            paymentMethod,
            shippingFee,
            totalPrice,
            couponCode,
            discountAmount,
            productImage
        } = req.body;

        const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        console.log('\n🛒 ===== ĐƠN HÀNG MỚI (DEBUG) =====');
        console.log('📦 Body nhận được:', JSON.stringify(req.body, null, 2));

        // Format message cho Zalo Bot
        let message = isGift
            ? `🎁 === ĐƠN HÀNG QUÀ TẶNG ===\n\n`
            : `🛒 === ĐƠN HÀNG MỚI ===\n\n`;

        // ===== THÔNG TIN NGƯỜI NHẬN =====
        message += `👤 Người nhận: ${customerName}\n`;
        message += `📞 SĐT nhận: ${customerPhone}\n`;

        // Hiển thị địa chỉ với thông tin quận (nếu là HCM)
        if (isHCMAddress && district) {
            message += `📍 Quận/Huyện: ${district}\n`;
            message += `🏠 Địa chỉ: ${customerAddress}\n`;
        } else {
            message += `📍 Địa chỉ: ${customerAddress}\n`;
        }

        // Separator nếu có người tặng
        if (isGift && senderName && senderPhone) {
            message += `\n━━━━━━━━━━━━━━\n\n`;
            message += `💝 Người tặng: ${senderName}\n`;
            message += `📱 SĐT người tặng: ${senderPhone}\n`;
        }

        // ===== SEPARATOR TRƯỚC THÔNG TIN ĐƠN HÀNG =====
        message += `\n━━━━━━━━━━━━━━\n\n`;

        message += `📦 Sản phẩm: ${productName}\n`;

        // Thông tin biến thể (nếu có) ← NEW
        if (variantName) {
            message += `🎨 Biến thể: ${variantName}\n`;
        }
        if (variantSKU) {
            message += `🏷️ SKU: ${variantSKU}\n`;
        }

        // Tạm thời ẩn giá lẻ ở đây để gom xuống phần THANH TOÁN cho đẹp
        // message += `💰 Giá: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productPrice)}\n`;
        // BỎ dòng Mã SP
        if (note) message += `📝 Ghi chú: ${note}\n`;

        // Thông tin thiệp/bảng chữ (nếu có)
        if (isCard) {
            const typeName = cardType === 'banner' ? 'Bảng chữ (Banner)' : 'Thiệp nhỏ';
            message += `✍️ ${typeName}: ${cardContent}\n`;
        }

        // Thông tin giao hàng
        if (deliveryMode === 'scheduled' && deliveryTime) {
            const date = new Date(deliveryTime);
            if (deliverySession) {
                // If there's a session, just show date + session
                const formattedDate = date.toLocaleDateString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                message += `🕒 Hẹn giao: ${formattedDate} - Buổi ${deliverySession}\n`;
            } else {
                // Normal mode: show date + time
                const formattedDate = date.toLocaleString('vi-VN', {
                    timeZone: 'Asia/Ho_Chi_Minh',
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                message += `🕒 Hẹn giao: ${formattedDate}\n`;
            }
        } else {
            message += `⚡ Giao hàng: Giao liền (Càng sớm càng tốt)\n`;
        }

        // Thông tin thanh toán ← NEW
        const methodText = paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Thanh toán khi nhận hàng (COD)';
        message += `💳 Thanh toán: ${methodText}\n`;
        message += `💰 Giá gốc: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(productPrice)}\n`;

        if (couponCode) {
            message += `🎫 Mã giảm giá: ${couponCode} (-${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)})\n`;
        }

        message += `🚚 Phí ship: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(shippingFee)}\n`;
        message += `💵 TỔNG CỘNG: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}\n`;

        message += `\n⏰ Thời gian: ${time}`;

        console.log('📨 Message gửi Zalo:', message);

        // 1. LƯU ĐƠN HÀNG VÀO DATABASE
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        if (!db.orders) db.orders = [];

        const orderId = Date.now().toString();
        const orderNumber = `#${String(db.orders.length + 1).padStart(4, '0')}`;

        const newOrder = {
            id: orderId,
            orderNumber,
            createdAt: Date.now(),
            status: 'pending',
            customerName,
            customerPhone,
            customerAddress,
            isHCMAddress,
            district,
            isGift,
            senderName,
            senderPhone,
            productId,
            productName,
            productPrice,
            variantId,
            variantName,
            variantSKU,
            isCard,
            cardType,
            cardContent,
            deliveryMode,
            deliveryTime,
            deliverySession, // NEW: Lưu thông tin buổi giao hàng
            note,
            // Thông tin thanh toán
            paymentMethod,
            shippingFee,
            totalPrice,
            couponCode,
            discountAmount,
            productImage
        };

        db.orders.unshift(newOrder); // Thêm vào đầu array
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
        console.log(`💾 Đã lưu đơn hàng ${orderNumber} vào database`);

        // 2. GỬI THÔNG BÁO ZALO
        const { botToken, ownerIds } = getZaloConfig();

        // Gửi đơn hàng đến TẤT CẢ chủ shop/nhân viên qua Zalo Bot
        if (ownerIds.length > 0 && botToken) {
            console.log(`📤 Gửi đơn hàng đến ${ownerIds.length} người...`);

            let sentCount = 0;
            for (const ownerId of ownerIds) {
                try {
                    await axios.post(
                        `https://bot-api.zaloplatforms.com/bot${botToken}/sendMessage`,
                        {
                            chat_id: ownerId,
                            text: message
                        },
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                    console.log(`✅ Đã gửi đơn hàng qua Zalo đến ${ownerId}`);
                    sentCount++;
                } catch (zaloError) {
                    console.error(`⚠️ Lỗi gửi Zalo cho ${ownerId}:`, zaloError.response?.data || zaloError.message);
                }
            }

            if (sentCount > 0) {
                res.json({
                    success: true,
                    message: `Đơn hàng đã được gửi đến ${sentCount} người!`,
                    orderId,
                    orderNumber
                });
            } else {
                // Vẫn response success vì đã lưu order
                res.json({
                    success: true,
                    message: 'Đơn hàng đã được lưu nhưng không gửi được Zalo',
                    orderId,
                    orderNumber
                });
            }
        } else {
            console.log('⚠️ Chưa cấu hình Zalo Bot Token hoặc Admin IDs');
            // Vẫn response success vì đã lưu order
            res.json({
                success: true,
                message: 'Đơn hàng đã được lưu',
                orderId,
                orderNumber
            });
        }
    } catch (error) {
        console.error('❌ Lỗi submit order:', error);
        res.status(500).json({ success: false, message: 'Lỗi xử lý đơn hàng' });
    }
});


// ==================== ORDER MANAGEMENT APIs ====================

// GET: Get all orders
app.get('/api/orders', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        const orders = db.orders || [];

        // Optional: Filter by status and phone
        const { status, phone } = req.query;
        let filteredOrders = orders;

        if (status) {
            filteredOrders = filteredOrders.filter(order => order.status === status);
        }

        if (phone) {
            // Normalize phone for comparison (remove spaces, dots, etc if needed, but simple includes/exact match is okay for now)
            filteredOrders = filteredOrders.filter(order =>
                (order.customerPhone && order.customerPhone.includes(phone)) ||
                (order.senderPhone && order.senderPhone.includes(phone))
            );
        }

        res.json({ success: true, orders: filteredOrders });
    } catch (error) {
        console.error('❌ Lỗi lấy orders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET: Get single order by ID
app.get('/api/orders/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        const order = db.orders?.find(o => o.id === req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT: Update order (status, admin notes)
app.put('/api/orders/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        const orderIndex = db.orders?.findIndex(o => o.id === req.params.id);

        if (orderIndex === -1 || orderIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        const { status, adminNotes } = req.body;

        if (status) {
            db.orders[orderIndex].status = status;
        }

        if (adminNotes !== undefined) {
            db.orders[orderIndex].adminNotes = adminNotes;
        }

        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

        res.json({
            success: true,
            message: 'Đã cập nhật đơn hàng',
            order: db.orders[orderIndex]
        });
    } catch (error) {
        console.error('❌ Lỗi cập nhật order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE: Delete order
app.delete('/api/orders/:id', (req, res) => {
    try {
        const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
        const orderIndex = db.orders?.findIndex(o => o.id === req.params.id);

        if (orderIndex === -1 || orderIndex === undefined) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
        }

        db.orders.splice(orderIndex, 1);
        fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

        res.json({ success: true, message: 'Đã xóa đơn hàng' });
    } catch (error) {
        console.error('❌ Lỗi xóa order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    const { botToken, ownerIds } = getZaloConfig();
    res.json({
        status: 'OK',
        message: 'Server đang chạy!',
        uploadsFolder: uploadsDir,
        zaloBotConfigured: !!(botToken && ownerIds.length > 0),
        ownerCount: ownerIds.length
    });
});

// ==================== FRONTEND STATIC FILES ====================
// Phục vụ file tĩnh từ thư mục dist (React App)
app.use(express.static(path.join(__dirname, 'dist')));

// QUAN TRỌNG: Tất cả request không phải API sẽ trả về index.html
// Sử dụng Regex /(.*)/ để bắt tất cả các đường dẫn (thay thế cho *)
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==================== START SERVER ====================

// Listen trên 0.0.0.0 để cho phép truy cập từ tất cả IPs trong mạng
app.listen(PORT, '0.0.0.0', () => {
    const { botToken, ownerIds } = getZaloConfig(); // Lấy config từ DB

    console.log(`✅ Backend server đang chạy tại:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - LAN:   http://${HOST}:${PORT}`);
    console.log(`📁 Ảnh được lưu trong: ${uploadsDir}`);
    console.log(`🌐 Upload API: http://${HOST}:${PORT}/api/upload`);
    console.log(`\n🤖 Zalo Bot Tracking:`);
    console.log(`   - Tracking: http://${HOST}:${PORT}/api/track-click`);
    console.log(`   - Bot Token: ${botToken ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   - Owner IDs: ${ownerIds.length > 0 ? `✅ ${ownerIds.length} người` : '❌ Missing (nhắn tin cho bot để lấy)'}`);
});

