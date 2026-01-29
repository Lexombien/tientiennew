#!/bin/bash

# =================================================================
# 🚀 OLS ULTRA INSTALLER - AUTOMATIC NODE.JS & SSL SETUP
# =================================================================

# Color Palette
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}===================================================${NC}"
echo -e "${CYAN}        🌟 LUXURY FLORAL SHOP - OLS DEPLOY 🌟       ${NC}"
echo -e "${BLUE}===================================================${NC}"

# 1. CHECK PRIVILEGES
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Lỗi: Vui lòng chạy script bằng quyền root (sudo).${NC}"
    exit 1
fi

# 2. INPUT INFORMATION
echo -e "\n${YELLOW}[1/3] NHẬP THÔNG TIN TÊN MIỀN${NC}"
read -p "👉 Nhập tên miền (VD: tiemhoa.com): " DOMAIN_NAME
while [ -z "$DOMAIN_NAME" ]; do
    read -p "❌ Không được để trống. Nhập lại: " DOMAIN_NAME
done

echo -e "\n${YELLOW}[2/3] NHẬP THÔNG TIN QUẢN TRỊ ADMIN${NC}"
read -p "👉 Tên đăng nhập (Mặc định: admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -p "👉 Mật khẩu admin (Mặc định: admin123): " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}

# Xác định thư mục hoạt động
OLS_ROOT="/usr/local/lsws"
WORK_DIR="$OLS_ROOT/$DOMAIN_NAME/html"

echo -e "\n${BLUE}➤ Đang chuẩn cài đặt cho: ${GREEN}$DOMAIN_NAME${NC}"
echo -e "${BLUE}➤ Thư mục đích: ${GREEN}$WORK_DIR${NC}"
sleep 2

# 3. SYSTEM UPDATES & DEPENDENCIES
echo -e "\n${PURPLE}Step 1: Cập nhật hệ thống & Cài đặt công cụ hỗ trợ...${NC}"
apt update -y && apt install -y curl git certbot net-tools unzip wget

# 4. INSTALL NODE.JS & NPM (ULTRA STABLE METHOD)
echo -e "\n${PURPLE}Step 2: Cài đặt môi trường Node.js (Version 20)...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "✅ Node.js đã hiện diện: $(node -v)"
fi

# 5. INSTALL PM2 (ULTRA STABLE METHOD)
echo -e "\n${PURPLE}Step 3: Cài đặt trình quản lý PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    # Create symlink for global access
    ln -s "$(which pm2)" /usr/bin/pm2 2>/dev/null
fi
echo -e "✅ PM2 Status: $(pm2 -v)"

# 6. SYNC CODE & SETUP PERMISSIONS
echo -e "\n${PURPLE}Step 4: Chuẩn bị mã nguồn dự án...${NC}"
mkdir -p "$WORK_DIR"
# Copy toàn bộ file hiện tại vào thư mục web (nếu chạy script từ thư mục git)
cp -r . "$WORK_DIR/" 2>/dev/null
cd "$WORK_DIR" || exit

# 7. SETUP .ENV
echo -e "\n${PURPLE}Step 5: Cấu hình biến môi trường (.env)...${NC}"
cat > .env <<EOF
PORT=3001
HOST=0.0.0.0
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF
echo "✅ Đã cấu hình Admin: $ADMIN_USER"

# 8. INSTALL DEPENDENCIES & BUILD
echo -e "\n${PURPLE}Step 6: Cài đặt thư viện & Build giao diện (Vite)...${NC}"
# Xóa node_modules nếu lỗi để cài lại sạch
# rm -rf node_modules
# npm install --legacy-peer-deps
# npm run build

# Lưu ý: Nếu user đã build ở máy và dongbo githup.bat đã đẩy dist lên thì có thể skip
# Nhưng để chắc cú ta vẫn chạy build
npm install --legacy-peer-deps
npm run build

# 9. START BACKEND WITH PM2
echo -e "\n${PURPLE}Step 7: Khởi động hệ thống Backend...${NC}"
pm2 delete web-backend 2>/dev/null
pm2 start server.js --name "web-backend" --update-env
pm2 save
pm2 startup | grep "sudo" | bash 2>/dev/null

# 10. OPENLITESPEED VHOST CONFIGURATION
echo -e "\n${PURPLE}Step 8: Cấu hình Web Server (OpenLiteSpeed Proxy)...${NC}"
VHOST_CONF_DIR="$OLS_ROOT/conf/vhosts/$DOMAIN_NAME"
mkdir -p "$VHOST_CONF_DIR"
VHOST_CONF="$VHOST_CONF_DIR/$DOMAIN_NAME.conf"

# Script tự động lấy SSL nếu chưa có
echo -e "🌐 Đang kiểm tra/Cài đặt SSL cho $DOMAIN_NAME..."
certbot certonly --webroot -w "$OLS_ROOT/Example/html" -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" --non-interactive --agree-tos --email webmaster@$DOMAIN_NAME 2>/dev/null

SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
SSL_CFG=""

if [ -f "$SSL_KEY" ]; then
    echo -e "✅ Đã tìm thấy chứng chỉ SSL."
    SSL_CFG="
vhssl  {
  keyFile                 $SSL_KEY
  certFile                $SSL_CERT
  certChain               1
  sslProtocol             24
}"
else
    echo -e "${YELLOW}⚠️ Không tự động lấy được SSL (Có thể do domain chưa trỏ IP). Bạn có thể cài sau.${NC}"
fi

cat > "$VHOST_CONF" <<EOF
docRoot                   \$VH_ROOT/html
vhDomain                  $DOMAIN_NAME
vhAliases                 www.$DOMAIN_NAME
enableGzip                1

index  {
  useServer               0
  indexFiles              index.html
}

# PROXY TO NODE.JS (PORT 3001)
extprocessor node-backend {
  type                    proxy
  address                 127.0.0.1:3001
  maxConns                100
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context / {
  type                    proxy
  handler                 node-backend
  addDefaultCharset       off
}

$SSL_CFG
EOF

# Phân quyền cho OLS đọc cấu hình
chown -R lsadm:lsadm "$VHOST_CONF_DIR"

# Restart OLS
if [ -f "$OLS_ROOT/bin/lswsctrl" ]; then
    "$OLS_ROOT/bin/lswsctrl" restart > /dev/null
fi

# 11. FINAL CHECK & SUCCESS MESSAGE
echo -e "\n${GREEN}===================================================${NC}"
echo -e "${GREEN}🎉 CHÚC MỪNG! WEBSITE CỦA BẠN ĐÃ SẴN SÀNG.${NC}"
echo -e "${GREEN}===================================================${NC}"
echo -e "🔗 URL Website:  ${CYAN}https://$DOMAIN_NAME${NC}"
echo -e "🔗 Trang Admin:  ${CYAN}https://$DOMAIN_NAME/admin${NC}"
echo -e "👤 Tài khoản:    ${WHITE}$ADMIN_USER${NC}"
echo -e "🔑 Mật khẩu:     ${WHITE}$ADMIN_PASS${NC}"
echo -e "${YELLOW}(Lưu ý: Nếu không vào được bằng https màu xanh, hãy dùng http)${NC}"
echo -e "${BLUE}===================================================${NC}"

# Kiểm tra Backend status lần cuối
if netstat -tulpn | grep :3001 > /dev/null; then
    echo -e "🚀 Trạng thái Backend: ${GREEN}ĐANG CHẠY (ONLINE)${NC}"
else
    echo -e "🚀 Trạng thái Backend: ${RED}CÓ LỖI (Vui lòng chạy 'pm2 logs')${NC}"
fi
echo -e "${BLUE}===================================================${NC}"
