#!/bin/bash

# =================================================================
# AUTO SETUP SCRIPT CHO OPENLITESPEED (OLS)
# Hỗ trợ: Node.js, React Build, PM2, SSL (Certbot)
# =================================================================

# Màu sắc hiển thị
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}   CÀI ĐẶT TỰ ĐỘNG WEBSITE (OLS/CyberPanel)      ${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""

# 1. NHẬP THÔNG TIN
echo -e "${YELLOW}[?] Nhập tên miền của bạn (VD: lemyloi.work.gd):${NC}"
read -r DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}❌ Lỗi: Tên miền không được để trống!${NC}"
    exit 1
fi

echo -e "${YELLOW}[?] Thư mục cài đặt hiện tại là: $(pwd)${NC}"
echo -e "    Bạn có muốn cài đặt tại đây không? (y/n)"
read -r CONFIRM_DIR

if [ "$CONFIRM_DIR" != "y" ]; then
    echo -e "${RED}❌ Vui lòng 'cd' vào đúng thư mục mong muốn và chạy lại script!${NC}"
    exit 1
fi

CURRENT_DIR=$(pwd)

# 2. KIỂM TRA & CÀI ĐẶT MÔI TRƯỜNG
echo -e "\n${GREEN}[1/6] Kiểm tra môi trường Node.js & PM2...${NC}"

# Cài Node.js nếu chưa có
if ! command -v node &> /dev/null; then
    echo "📦 Đang cài Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "✅ Node.js: $(node -v)"
fi

# Cài PM2 nếu chưa có
if ! command -v pm2 &> /dev/null; then
    echo "📦 Đang cài PM2..."
    npm install -g pm2
    pm2 startup
else
    echo "✅ PM2: Installed"
fi

# Cài Certbot nếu cần SSL
if ! command -v certbot &> /dev/null; then
    echo "📦 Đang cài Certbot..."
    apt-get update
    apt-get install -y certbot
fi

# 3. SETUP CODE
echo -e "\n${GREEN}[2/6] Setup Code & Build...${NC}"
# Xóa node_modules cũ để tránh lỗi xung đột platform
if [ -d "node_modules" ]; then
    echo "🧹 Clean node_modules..."
    rm -rf node_modules
fi

echo "📦 Installing Dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building Frontend..."
npm run build

echo "✅ Build xong! Thư mục dist đã sẵn sàng."

# 4. KHỞI ĐỘNG BACKEND
echo -e "\n${GREEN}[3/6] Khởi động Backend Server...${NC}"
mkdir -p uploads

if pm2 list | grep -q "web-backend"; then
    pm2 reload web-backend --update-env
    echo "🔄 Reload backend thành công."
else
    pm2 start server.js --name "web-backend"
    pm2 save
    echo "▶️ Backend đã khởi động (Port 3001)."
fi

# 5. CÀI ĐẶT SSL (CERTBOT)
echo -e "\n${GREEN}[4/6] Cài đặt SSL (HTTPS)...${NC}"
echo -e "${YELLOW}Bạn có muốn cài SSL cho tên miền $DOMAIN_NAME không? (y/n)${NC}"
read -r SETUP_SSL

if [ "$SETUP_SSL" == "y" ]; then
    # Dừng OLS tạm thời để Certbot chạy Standalone hoặc dùng webroot nếu server đang chạy
    # Ở đây dùng Webroot an toàn hơn
    echo "🔒 Đang lấy chứng chỉ SSL..."
    certbot certonly --webroot -w "$CURRENT_DIR/dist" -d "$DOMAIN_NAME" --agree-tos --email "admin@$DOMAIN_NAME" --non-interactive

    if [ -d "/etc/letsencrypt/live/$DOMAIN_NAME" ]; then
        echo -e "${GREEN}✅ SSL đã được tạo thành công!${NC}"
        CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
        KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    else
        echo -e "${RED}❌ Lỗi cài SSL. Kiểm tra lại DNS trỏ về IP chưa.${NC}"
        CERT_PATH=""
        KEY_PATH=""
    fi
fi

# 6. TỰ ĐỘNG CẤU HÌNH OLS (CƠ BẢN)
# Cố gắng tìm file config của Vhost để inject rule Rewrite cho React
echo -e "\n${GREEN}[5/6] Thử cấu hình .htaccess cho React Router...${NC}"

# Tạo file .htaccess trong dist để OLS nhận diện rewrite map
cat > "$CURRENT_DIR/dist/.htaccess" <<EOF
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF

echo "✅ Đã tạo file .htaccess cho React."
echo "⚠️  LƯU Ý: Bạn cần bật 'Auto Load from .htaccess' trong cấu hình vhost OLS."


echo -e "\n${GREEN}[6/6] HOÀN TẤT!${NC}"
echo -e "${BLUE}===================================================${NC}"
echo -e "1. Website Root (Document Root): ${YELLOW}$CURRENT_DIR/dist${NC}"
echo -e "2. Backend API: ${YELLOW}http://127.0.0.1:3001${NC}"
if [ ! -z "$CERT_PATH" ]; then
    echo -e "3. SSL Cert: ${YELLOW}$CERT_PATH${NC}"
    echo -e "4. SSL Key:  ${YELLOW}$KEY_PATH${NC}"
fi
echo -e "${BLUE}===================================================${NC}"
echo -e "👉 Vui lòng vào OLS WebAdmin (Port 7080) để Cập nhật lại đường dẫn Root và SSL Certificates (nếu chưa tự nhận)."
