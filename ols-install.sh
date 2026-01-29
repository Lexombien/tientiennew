#!/bin/bash

# =================================================================
# 🚀 OLS ULTRA INSTALLER V2 - AUTOMATIC NODE.JS, SHARP & SSL
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
sleep 1

# 3. SYSTEM UPDATES & DEPENDENCIES
echo -e "\n${PURPLE}Step 1: Cập nhật hệ thống & Cài đặt công cụ nền...${NC}"
apt update -y
apt install -y curl git certbot net-tools unzip wget build-essential

# 4. INSTALL NODE.JS & NPM (VERSION 20)
echo -e "\n${PURPLE}Step 2: Cấu hình môi trường Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "✅ Node.js hiện tại: $(node -v)"
fi

# 5. INSTALL PM2 GLOBAL
echo -e "\n${PURPLE}Step 3: Thiết lập trình quản lý PM2...${NC}"
npm install -g pm2
# Đảm bảo lệnh pm2 dùng được toàn hệ thống
ln -s "$(which pm2)" /usr/bin/pm2 2>/dev/null
echo -e "✅ PM2 đã sẵn sàng."

# 6. SYNC CODE & SETUP FOLDERS
echo -e "\n${PURPLE}Step 4: Chuẩn bị mã nguồn dự án...${NC}"
mkdir -p "$WORK_DIR"
cp -r . "$WORK_DIR/" 2>/dev/null
cd "$WORK_DIR" || exit

# 7. CONFIG .ENV
echo -e "\n${PURPLE}Step 5: Cấu hình file .env bảo mật...${NC}"
cat > .env <<EOF
PORT=3001
HOST=0.0.0.0
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF
echo "✅ Đã cấu hình tài khoản quản trị."

# 8. INSTALL DEPENDENCIES & FIX SHARP (IMPORTANT!)
echo -e "\n${PURPLE}Step 6: Cài đặt thư viện & Build Project...${NC}"
echo "⏳ Đang cài đặt node_modules (có thể mất 1-2 phút)..."
npm install --legacy-peer-deps

echo -e "🎨 [FIX] Cấu hình thư viện ảnh Sharp cho Linux..."
# Đây là phần quan trọng nhất để tránh lỗi 503
npm install --os=linux --cpu=x64 sharp

echo -e "🏗️  Đang Build giao diện Front-end..."
npm run build

# 9. START BACKEND WITH PM2
echo -e "\n${PURPLE}Step 7: Khởi động Backend (PM2)...${NC}"
pm2 delete web-backend 2>/dev/null
pm2 start server.js --name "web-backend" --update-env
pm2 save
pm2 startup | grep "sudo" | bash 2>/dev/null

# 10. SSL AUTOMATION (CERTBOT)
echo -e "\n${PURPLE}Step 8: Cài đặt chứng chỉ bảo mật SSL (HTTPS)...${NC}"
echo -e "🌐 Đang xin cấp SSL cho $DOMAIN_NAME và www.$DOMAIN_NAME..."

# Tạm thời tạo folder webroot nếu OLS chưa tạo xong
mkdir -p "$WORK_DIR/dist"

# Lệnh Certbot tự động
certbot certonly --webroot -w "$WORK_DIR/dist" -d "$DOMAIN_NAME" --non-interactive --agree-tos --email webmaster@$DOMAIN_NAME --quiet

SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
SSL_CFG=""

if [ -f "$SSL_KEY" ]; then
    echo -e "${GREEN}✅ Thành công! Đã cài đặt SSL miễn phí.${NC}"
    SSL_CFG="
vhssl  {
  keyFile                 $SSL_KEY
  certFile                $SSL_CERT
  certChain               1
  sslProtocol             30
}"
else
    echo -e "${RED}⚠️ Cảnh báo: Không tự động lấy được SSL.${NC}"
    echo -e "👉 Nguyên nhân: Domain chưa trỏ IP về VPS hoặc DNS chưa cập nhật."
fi

# 11. CONFIGURE OPENLITESPEED VHOST
echo -e "\n${PURPLE}Step 9: Áp cấu hình cho OpenLiteSpeed...${NC}"
VHOST_CONF_DIR="$OLS_ROOT/conf/vhosts/$DOMAIN_NAME"
mkdir -p "$VHOST_CONF_DIR"
VHOST_CONF="$VHOST_CONF_DIR/$DOMAIN_NAME.conf"

cat > "$VHOST_CONF" <<EOF
docRoot                   \$VH_ROOT/html/dist
vhDomain                  $DOMAIN_NAME
vhAliases                 www.$DOMAIN_NAME
enableGzip                1

index  {
  useServer               0
  indexFiles              index.html
}

# CHỐNG TRUY CẬP TRỰC TIẾP FILE CONFIG
context /.env {
  location                \$VH_ROOT/html/.env
  allow                   none
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

# Phân quyền cho OLS
chown -R lsadm:lsadm "$VHOST_CONF_DIR"
chown -R lsadm:lsadm "$VHOST_CONF"

# Restart OLS
if [ -f "$OLS_ROOT/bin/lswsctrl" ]; then
    "$OLS_ROOT/bin/lswsctrl" restart > /dev/null
fi

# 12. SUMMARY
echo -e "\n${GREEN}===================================================${NC}"
echo -e "� HOÀN TẤT CÀI ĐẶT 🎊"
echo -e "===================================================${NC}"
echo -e "🌍 Website:   ${CYAN}https://$DOMAIN_NAME${NC}"
echo -e "� Admin:     ${CYAN}$ADMIN_USER${NC} / ${CYAN}$ADMIN_PASS${NC}"
echo -e "� WebRoot:   ${WHITE}$WORK_DIR${NC}"
echo -e "===================================================${NC}"

# Final Health Check
if netstat -tulpn | grep :3001 > /dev/null; then
    echo -e "✅ Backend:   ${GREEN}ONLINE (Port 3001)${NC}"
else
    echo -e "❌ Backend:   ${RED}ERROR (Vui lòng chạy 'pm2 logs')${NC}"
fi
echo -e "✅ WebServer: ${GREEN}OpenLiteSpeed Restarted${NC}"
echo -e "===================================================${NC}"
