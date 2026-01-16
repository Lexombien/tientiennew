#!/bin/bash

# =================================================================
# OLS ONE-CLICK DEPLOY SCRIPT (OPENLITESPEED SPECIAL EDITION)
# Tự động hóa toàn bộ: Node, PM2, Build, Config OLS, SSL
# =================================================================

# Màu sắc
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

clear
echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}  🚀 OLS ONE-CLICK DEPLOY (For Tientien Florist)  ${NC}"
echo -e "${BLUE}     Phiên bản dành riêng cho VPS OpenLiteSpeed    ${NC}"
echo -e "${BLUE}===================================================${NC}"
echo ""

# Check Root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Lỗi: Vui lòng chạy script bằng quyền root (sudo).${NC}"
    exit 1
fi

# =================================================================
# 1. THU THẬP THÔNG TIN (CHỈ HỎI 1 LẦN)
# =================================================================
echo -e "${YELLOW}[1/4] Nhập tên miền (VD: lemyloi.work.gd):${NC}"
read -r DOMAIN_NAME

while [ -z "$DOMAIN_NAME" ]; do
    read -p "❌ Không được để trống. Nhập lại: " DOMAIN_NAME
done

echo -e "\n${YELLOW}[2/4] Nhập TÊN TÀI KHOẢN ADMIN (Mặc định: admin):${NC}"
read -r ADMIN_USER
if [ -z "$ADMIN_USER" ]; then
    ADMIN_USER="admin"
fi

echo -e "\n${YELLOW}[3/4] Nhập MẬT KHẨU ADMIN:${NC}"
read -s ADMIN_PASS
echo -e "✅ Mật khẩu đã lưu."

echo -e "\n${YELLOW}[4/4] Bạn có muốn cài SSL (HTTPS) luôn không? (y/n):${NC}"
read -r SETUP_SSL

# Xác nhận thư mục
CURRENT_DIR=$(pwd)
echo -e "\n${BLUE}ℹ️  Thư mục hiện tại: ${YELLOW}$CURRENT_DIR${NC}"
echo -e "${BLUE}ℹ️  Tên miền:         ${YELLOW}$DOMAIN_NAME${NC}"
echo -e "${BLUE}ℹ️  Tài khoản Admin:  ${YELLOW}$ADMIN_USER${NC}"
echo "---------------------------------------------------"
echo "Bấm Enter để BẮT ĐẦU CÀI ĐẶT..."
read -r

# =================================================================
# 2. CÀI ĐẶT MÔI TRƯỜNG (NodeJS + PM2) - AUTO FIX
# =================================================================
echo -e "\n${GREEN}[1/5] Kiểm tra & Cài đặt Node.js/PM2...${NC}"

# Hàm load NVM
load_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
}

# Kiểm tra Node
if ! command -v node &> /dev/null; then
    echo "📦 Đang cài đặt Node.js (via NVM)..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    load_nvm
    nvm install 20
    nvm use 20
    nvm alias default 20
else
    # Check version
    NODE_VER=$(node -v)
    echo "✅ Node.js đã có sẵn: $NODE_VER"
    # Ensure it's active
    load_nvm
fi

# Cài PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Đang cài PM2..."
    npm install -g pm2
    pm2 startup
else
    echo "✅ PM2 đã cài đặt."
fi

# =================================================================
# 3. BUILD & SETUP CODE
# =================================================================
echo -e "\n${GREEN}[2/5] Setup Code & Build React...${NC}"

# Tạo file .env
echo "📝 Tạo file .env..."
cat > .env <<EOF
# Config tự động
PORT=3001
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
# Zalo Config (Mặc định)
BOT_TOKEN=
OWNER_ZALO_IDS=
WEBHOOK_SECRET=tientienflorist-secret-2026
SHOP_NAME=Tientienflorist
EOF

# Clean install
if [ -d "node_modules" ]; then
    rm -rf node_modules
fi

echo "📦 Installing Dependencies..."
npm install --legacy-peer-deps

echo "🔨 Building Frontend..."
npm run build

# Backend Start
echo -e "\n${GREEN}[3/5] Khởi động Backend (Port 3001)...${NC}"
mkdir -p uploads

if pm2 list | grep -q "web-backend"; then
    pm2 reload web-backend --update-env
else
    pm2 start server.js --name "web-backend"
    pm2 save
fi

# =================================================================
# 4. CHỮNG CHỈ SSL (CERTBOT LET'S ENCRYPT)
# =================================================================
SSL_KEY=""
SSL_CERT=""

if [ "$SETUP_SSL" == "y" ]; then
    echo -e "\n${GREEN}[4/5] Cài đặt SSL Let's Encrypt...${NC}"
    
    if ! command -v certbot &> /dev/null; then
        apt-get update -qq
        apt-get install -y certbot -qq
    fi

    # Webroot mode trỏ thẳng vào dist
    echo "🔒 Đang xin chứng chỉ..."
    mkdir -p "$CURRENT_DIR/dist/.well-known/acme-challenge"
    chmod -R 755 "$CURRENT_DIR/dist/.well-known"
    
    certbot certonly --webroot -w "$CURRENT_DIR/dist" -d "$DOMAIN_NAME" --agree-tos --email "admin@$DOMAIN_NAME" --non-interactive --force-renewal

    if [ -d "/etc/letsencrypt/live/$DOMAIN_NAME" ]; then
        echo "✅ SSL OK!"
        SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
        SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
    else
        echo "⚠️  Lỗi cài SSL. Web sẽ chạy HTTP tạm thời."
    fi
fi

# =================================================================
# 5. CẤU HÌNH OPENLITESPEED (OLS CONFIG INJECTION)
# =================================================================
echo -e "\n${GREEN}[5/5] Cấu hình OpenLiteSpeed...${NC}"

# Tìm file config
OLS_ROOT="/usr/local/lsws"
CONF_DIR="$OLS_ROOT/conf/vhosts"
VHOST_CONF=""

# Smart Find
if [ -f "$CONF_DIR/$DOMAIN_NAME/vhconf.conf" ]; then
    VHOST_CONF="$CONF_DIR/$DOMAIN_NAME/vhconf.conf"
elif [ -f "$CONF_DIR/$DOMAIN_NAME/vhost.conf" ]; then
    VHOST_CONF="$CONF_DIR/$DOMAIN_NAME/vhost.conf"
elif [ -f "$CONF_DIR/$DOMAIN_NAME/$DOMAIN_NAME.conf" ]; then
    VHOST_CONF="$CONF_DIR/$DOMAIN_NAME/$DOMAIN_NAME.conf"
else
    # Fallback search
    ANY_CONF=$(find "$CONF_DIR/$DOMAIN_NAME" -maxdepth 1 -name "*.conf" | head -n 1)
    if [ ! -z "$ANY_CONF" ]; then
        VHOST_CONF="$ANY_CONF"
    fi
fi

if [ ! -z "$VHOST_CONF" ]; then
    echo "📝 Đang ghi đè file config: $VHOST_CONF"
    cp "$VHOST_CONF" "$VHOST_CONF.bak_auto"

    # Block SSL Config
    SSL_BLOCK=""
    if [ ! -z "$SSL_KEY" ]; then
        SSL_BLOCK="
vhssl  {
  keyFile                 $SSL_KEY
  certFile                $SSL_CERT
  certChain               1
  sslProtocol             24
  enableSpdy              1
  enableQuic              1
}"
    fi

    # Write Config
    cat > "$VHOST_CONF" <<EOF
docRoot                   \$VH_ROOT/html/dist
vhDomain                  $DOMAIN_NAME
vhAliases                 www.$DOMAIN_NAME
adminEmails               admin@$DOMAIN_NAME
enableGzip                1
enableIpGeo               1

index  {
  useServer               0
  indexFiles              index.html
}

errorlog \$VH_ROOT/logs/$DOMAIN_NAME.error_log {
  useServer               0
  logLevel                ERROR
  rollingSize             10M
}

accesslog \$VH_ROOT/logs/$DOMAIN_NAME.access_log {
  useServer               0
  logFormat               "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\""
  logHeaders              5
  rollingSize             10M
  keepDays                30
  compressArchive         1
}

scripthandler  {
  add                     lsapi:lsphp81 php
}

extprocessor node-backend {
  type                    proxy
  address                 127.0.0.1:3001
  maxConns                100
  pcKeepAliveTimeout      60
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context /api/ {
  type                    proxy
  handler                 node-backend
  addDefaultCharset       off
}

context /uploads/ {
  location                \$VH_ROOT/html/uploads/
  allowBrowse             1
  addDefaultCharset       off
}

context / {
  location                \$VH_ROOT/html/dist/
  allowBrowse             1
  indexFiles              index.html
  
  rewrite  {
    enable                1
    inherit               1
    RewriteFile           .htaccess
  }
}

rewrite  {
  enable                  1
  autoLoadHtaccess        1
}
$SSL_BLOCK
EOF

    # Restart OLS
    echo "🔄 Restarting OLS Service..."
    if [ -f "/usr/local/lsws/bin/lswsctrl" ]; then
        /usr/local/lsws/bin/lswsctrl restart > /dev/null
    else
        service lsws restart
    fi
    echo "✅ OpenLiteSpeed Restarted."
else
    echo "⚠️  Không tìm thấy file config OLS. Bạn cần trỏ DocumentRoot thủ công."
fi

# =================================================================
# HOÀN TẤT
# =================================================================
echo -e "\n${BLUE}===================================================${NC}"
echo -e "   🎉 TRIỂN KHAI THÀNH CÔNG!"
echo -e "${BLUE}===================================================${NC}"
echo -e "🌐 Website:  ${YELLOW}https://$DOMAIN_NAME${NC}"
echo -e "🔑 Admin:    ${YELLOW}https://$DOMAIN_NAME/#admin${NC}"
echo -e "👤 User:     ${YELLOW}$ADMIN_USER${NC}"
echo -e "🔑 Pass:     ${YELLOW}$ADMIN_PASS${NC}"
echo -e "📡 API:      ${YELLOW}https://$DOMAIN_NAME/api/ping${NC}"
echo -e "${BLUE}===================================================${NC}"
