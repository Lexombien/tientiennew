#!/bin/bash

# =================================================================
# AUTO SETUP SCRIPT CHO OPENLITESPEED (OLS)
# Hỗ trợ: NVM, Node.js, React Build, PM2, SSL (Certbot)
# =================================================================

# Màu sắc hiển thị
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}   CÀI ĐẶT TỰ ĐỘNG WEBSITE (ALL-IN-ONE)        ${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""

# 1. NHẬP THÔNG TIN
echo -e "${YELLOW}[?] Nhập tên miền của bạn (VD: lemyloi.work.gd):${NC}"
read -r DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo -e "${RED}❌ Lỗi: Tên miền không được để trống!${NC}"
    exit 1
fi

CURRENT_DIR=$(pwd)

# 2. SỬA LỖI & CÀI ĐẶT NODE.JS (AUTO FIX)
echo -e "\n${GREEN}[1/6] Kiểm tra & Sửa lỗi Node.js (Sử dụng NVM)...${NC}"

# Hàm reload profile
load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js chưa cài hoặc bị lỗi. Tiến hành cài đặt lại bằng NVM..."
    
    # 1. Cài NVM
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    # 2. Reload môi trường
    load_nvm
    
    # 3. Cài Node 20
    echo "📦 Installing Node 20..."
    nvm install 20
    nvm use 20
    nvm alias default 20
else
    echo "✅ Node.js OK: $(node -v)"
fi

# Đảm bảo Node hoạt động
if ! command -v node &> /dev/null; then
    load_nvm
fi

# Cài PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 Global..."
    npm install -g pm2
    pm2 startup
else
    echo "✅ PM2 OK"
fi

# 3. SETUP CODE
echo -e "\n${GREEN}[2/6] Clean Install Dependencies...${NC}"

# Xóa node_modules cũ để tránh lỗi xung đột hệ điều hành (Windows vs Linux)
if [ -d "node_modules" ]; then
    echo "🧹 Clean old node_modules..."
    rm -rf node_modules
fi

echo "📦 npm install..."
npm install --legacy-peer-deps

echo -e "\n${GREEN}[3/6] Build Frontend...${NC}"
npm run build

echo "✅ Build xong! (Check folder 'dist')"

# 4. KHỞI ĐỘNG BACKEND
echo -e "\n${GREEN}[4/6] Khởi động Backend Server...${NC}"
mkdir -p uploads

# Check process chạy chưa
if pm2 list | grep -q "web-backend"; then
    echo "🔄 Reloading Backend..."
    pm2 reload web-backend --update-env
else
    echo "▶️ Starting Backend..."
    pm2 start server.js --name "web-backend"
    pm2 save
fi

# 5. CÀI ĐẶT SSL (CERTBOT - WEBROOT MODE)
echo -e "\n${GREEN}[5/6] Cài đặt SSL (HTTPS)...${NC}"
echo -e "${YELLOW}Bạn có muốn cài SSL cho tên miền $DOMAIN_NAME không? (y/n)${NC}"
read -r SETUP_SSL

if [ "$SETUP_SSL" == "y" ]; then
    echo "📦 Kiểm tra Certbot..."
    if ! command -v certbot &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y certbot
    fi

    echo "🔒 Đang tạo chứng chỉ SSL (Webroot Mode)..."
    # Dùng mode webroot trỏ thẳng vào dist để verify
    certbot certonly --webroot -w "$CURRENT_DIR/dist" -d "$DOMAIN_NAME" --agree-tos --email "admin@$DOMAIN_NAME" --non-interactive

    if [ -d "/etc/letsencrypt/live/$DOMAIN_NAME" ]; then
        echo -e "${GREEN}✅ SSL THÀNH CÔNG!${NC}"
        CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
        KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
    else
        echo -e "\n${RED}⚠️  Cảnh báo: SSL thất bại với lỗi 404 hoặc DNS.${NC}"
        echo "💡 Mẹo: Hãy đảm bảo WebAdmin OLS đã trỏ 'Virtual Host Root' vào: $CURRENT_DIR/dist"
        echo "   Sau đó chạy lại lệnh này thủ công: certbot certonly --webroot -w $CURRENT_DIR/dist -d $DOMAIN_NAME"
    fi
fi

# 6. CONFIG OLS HELPER
echo -e "\n${GREEN}[6/6] Cấu hình file .htaccess cho React...${NC}"
cat > "$CURRENT_DIR/dist/.htaccess" <<EOF
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF

echo -e "\n${BLUE}===================================================${NC}"
echo -e "   🎉 CÀI ĐẶT HOÀN TẤT!"
echo -e "${BLUE}===================================================${NC}"
echo -e "📂 Web Root: ${YELLOW}$CURRENT_DIR/dist${NC}"
echo -e "🔌 API Port: ${YELLOW}3001${NC}"
if [ ! -z "$CERT_PATH" ]; then
    echo -e "🔐 SSL Cert: ${YELLOW}$CERT_PATH${NC}"
    echo -e "🗝️ SSL Key:  ${YELLOW}$KEY_PATH${NC}"
fi
echo -e "${BLUE}===================================================${NC}"
echo "👉 Đừng quên cấu hình trong OpenLiteSpeed WebAdmin!"
