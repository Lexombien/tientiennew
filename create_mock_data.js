
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(dbFile, 'utf8'));

// Sample content for generation
const flowers = [
    'Hoa Hồng', 'Hoa Lan', 'Hoa Hướng Dương', 'Hoa Cẩm Tú Cầu',
    'Hoa Tulip', 'Hoa Baby', 'Hoa Cúc', 'Hoa Ly', 'Hoa Mẫu Đơn'
];
const adjectives = [
    'Rực Rỡ', 'Tinh Khôi', 'Sang Trọng', 'Quyến Rũ',
    'Ngọt Ngào', 'Lãng Mạn', 'Tươi Thắm', 'Thanh Lịch', 'Cao Cấp'
];
const colors = ['Đỏ', 'Hồng', 'Vàng', 'Trắng', 'Tím', 'Cam', 'Xanh', 'Pastel'];
const styles = ['Bó Tròn', 'Bó Dài', 'Giỏ', 'Hộp', 'Kệ', 'Bình'];

// Categories from existing DB
const categories = db.categories.length > 0 ? db.categories : [
    "Bó hoa 300-500K",
    "Bó Hoa 1tr",
    "Bó Hoa Lớn",
    "Chậu Giỏ Hoa",
    "Gấu Hoa"
];

const generateProducts = (count) => {
    const products = [];
    for (let i = 0; i < count; i++) {
        const id = Date.now().toString() + i; // Ensure unique ID
        const flower = flowers[Math.floor(Math.random() * flowers.length)];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const style = styles[Math.floor(Math.random() * styles.length)];

        const title = `${flower} ${adj} ${color} - ${style}`;
        const category = categories[Math.floor(Math.random() * categories.length)];

        // Price logic based on category (rough approximation)
        let basePrice = 500000;
        if (category.includes('300-500K')) basePrice = 400000;
        if (category.includes('1tr')) basePrice = 1000000;
        if (category.includes('Lớn')) basePrice = 2000000;
        if (category.includes('Gấu')) basePrice = 600000;

        const variation = Math.floor(Math.random() * 200000);
        const originalPrice = basePrice + variation;
        const salePrice = originalPrice * 0.9; // 10% off

        const imageSeed = id;
        const imageUrl1 = `https://picsum.photos/seed/${imageSeed}-1/800/1000`;
        const imageUrl2 = `https://picsum.photos/seed/${imageSeed}-2/800/1000`;

        products.push({
            id: id,
            title: title,
            sku: `SP-${i + 100}`,
            originalPrice: Math.round(originalPrice / 1000) * 1000,
            salePrice: Math.round(salePrice / 1000) * 1000,
            category: category,
            categories: [category],
            images: [imageUrl1, imageUrl2],
            imagesWithMetadata: [
                {
                    url: imageUrl1,
                    filename: `generated-${id}-1.jpg`,
                    alt: title,
                    title: title,
                    variantId: `${id}-v1`
                },
                {
                    url: imageUrl2,
                    filename: `generated-${id}-2.jpg`,
                    alt: `${title} view 2`,
                    title: title,
                    variantId: `${id}-v2`
                }
            ],
            variants: [
                { id: `${id}-v1`, name: 'Tiêu chuẩn', sku: `SP-${i + 100}-STD` },
                { id: `${id}-v2`, name: 'Cao cấp (+20%)', sku: `SP-${i + 100}-PRE` }
            ]
        });
    }
    return products;
};

// Generate 100 products
const newProducts = generateProducts(100);

// Use new products
db.products = newProducts;

fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));

console.log(`Successfully generated ${newProducts.length} mock products in database.json`);
