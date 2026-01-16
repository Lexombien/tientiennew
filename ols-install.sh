#!/bin/bash

# =================================================================
# OLS ONE-CLICK DEPLOY SCRIPT (OPENLITESPEED SPECIAL EDITION)
# Tự động hóa toàn bộ: Node, PM2, Build, Config OLS, SSL
# FIX SSL LOGIC: Config OLS trước -> Cài Code -> Cài SSL -> Update Config
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
# 1. THU THẬP THÔNG TIN
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

# Tìm file config OLS ngay từ đầu
OLS_ROOT="/usr/local/lsws"
CONF_DIR="$OLS_ROOT/conf/vhosts"
VHOST_CONF=""

# Smart Find Config
if [ -f "$CONF_DIR/$DOMAIN_NAME/vhconf.conf" ]; then
    VHOST_CONF="$CONF_DIR/$DOMAIN_NAME/vhconf.conf"
elif [ -f "$CONF_DIR/$DOMAIN_NAME/vhost.conf" ]; then
    VHOST_CONF="$CONF_DIR/$DOMAIN_NAME/vhost.conf"
elif [ -f "$CONF_DIR/$DOMAIN_NAME/$DOMAIN_NAME.conf" ]; then
    VHOST_CONF="$CONF_DIR/$DOMAIN_NAME/$DOMAIN_NAME.conf"
else
    # Fallback search
    ANY_CONF=$(find "$CONF_DIR/$DOMAIN_NAME" -maxdepth 1 -name "*.conf" 2>/dev/null | head -n 1)
    if [ ! -z "$ANY_CONF" ]; then
        VHOST_CONF="$ANY_CONF"
    fi
fi

if [ -z "$VHOST_CONF" ]; then
    echo -e "\n${RED}❌ LỖI: Không tìm thấy file config cho domain $DOMAIN_NAME trong $CONF_DIR${NC}"
    echo "Hãy chắc chắn bạn đã tạo Website trên CyberPanel/OLS trước khi chạy script này."
    exit 1
fi

echo -e "\n${GREEN}✅ Đã tìm thấy config: $VHOST_CONF${NC}"
echo "---------------------------------------------------"
echo "Bấm Enter để BẮT ĐẦU CÀI ĐẶT..."
read -r

# =================================================================
# 2. CẤU HÌNH OLS LẦN 1 (ĐỂ CHUẨN BỊ CHO SSL)
# =================================================================
echo -e "\n${GREEN}[1/6] Cấu hình OpenLiteSpeed (Phase 1)...${NC}"
echo "Mục tiêu: Trỏ WebRoot vào thư mục dist để Certbot có thể xác thực."

# Backup config gốc
if [ ! -f "$VHOST_CONF.orig" ]; then
    cp "$VHOST_CONF" "$VHOST_CONF.orig"
fi

# Hàm ghi config (Reusable)
write_ols_config() {
    local SSL_BLOCK_CONTENT=$1
    
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
$SSL_BLOCK_CONTENT
EOF
}

# Ghi config lần 1 (Chưa có SSL)
write_ols_config ""

# Restart OLS ngay để nhận config mới
echo "🔄 Restarting OLS (Phase 1)..."
if [ -f "/usr/local/lsws/bin/lswsctrl" ]; then
    /usr/local/lsws/bin/lswsctrl restart > /dev/null
else
    service lsws restart
fi

# =================================================================
# 3. CÀI ĐẶT MÔI TRƯỜNG & BUILD CODE
# =================================================================
echo -e "\n${GREEN}[2/6] Setup Code & Build React...${NC}"

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

if ! command -v node &> /dev/null; then
    echo "📦 Đang cài Node.js..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20
    nvm use 20
fi

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    pm2 startup
fi

# Tạo .env
cat > .env <<EOF
PORT=3001
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
BOT_TOKEN=
OWNER_ZALO_IDS=
WEBHOOK_SECRET=tientienflorist-secret-2026
SHOP_NAME=Tientienflorist
EOF

# Build Code
if [ -d "node_modules" ]; then rm -rf node_modules; fi
npm install --legacy-peer-deps
npm run build
mkdir -p uploads

# Start Backend
if pm2 list | grep -q "web-backend"; then
    pm2 reload web-backend --update-env
else
    pm2 start server.js --name "web-backend"
    pm2 save
fi

# =================================================================
# 4. CÀI ĐẶT SSL (LÚC NÀY CERTBOT SẼ THÀNH CÔNG)
# =================================================================
SSL_KEY=""
SSL_CERT=""

if [ "$SETUP_SSL" == "y" ]; then
    echo -e "\n${GREEN}[3/6] Cài đặt SSL Let's Encrypt...${NC}"
    
    if ! command -v certbot &> /dev/null; then
        apt-get update -qq
        apt-get install -y certbot -qq
    fi

    echo "🔒 Đang xin chứng chỉ..."
    # Quan trọng: Tạo folder verify
    mkdir -p "$CURRENT_DIR/dist/.well-known/acme-challenge"
    chmod -R 755 "$CURRENT_DIR/dist/.well-known"
    
    # Chạy Certbot
    certbot certonly --webroot -w "$CURRENT_DIR/dist" -d "$DOMAIN_NAME" --agree-tos --email "admin@$DOMAIN_NAME" --non-interactive --force-renewal

    if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem" ]; then
        echo "✅ SSL OK!"
        SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
        SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
    else
        echo "⚠️  Lỗi SSL: Vẫn không thể verify. Web sẽ chạy HTTP."
    fi
fi

# =================================================================
# 5. CẤU HÌNH OLS LẦN 2 (CẬP NHẬT SSL VAO CONFIG)
# =================================================================
echo -e "\n${GREEN}[4/6] Cập nhật config OLS (Phase 2)...${NC}"

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
    
    # Ghi lại config với SSL Block
    write_ols_config "$SSL_BLOCK"
    echo "✅ Đã thêm SSL vào config."
else
    echo "ℹ️  Giữ nguyên config HTTP (không có SSL)."
fi

# =================================================================
# 6. CONFIG .HTACCESS (HTTPS REDIRECT)
# =================================================================
echo -e "\n${GREEN}[5/6] Cấu hình .htaccess (HTTPS + React)...${NC}"

if [ ! -z "$SSL_KEY" ]; then
    # Có SSL -> Force HTTPS
    cat > "$CURRENT_DIR/dist/.htaccess" <<EOF
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF
else
    # Không SSL -> Chỉ React Router
    cat > "$CURRENT_DIR/dist/.htaccess" <<EOF
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF
fi

# =================================================================
# 7. HOÀN TẤT
# =================================================================
echo -e "\n${GREEN}[6/6] Khởi động lại Server lần cuối...${NC}"
if [ -f "/usr/local/lsws/bin/lswsctrl" ]; then
    /usr/local/lsws/bin/lswsctrl restart > /dev/null
else
    service lsws restart
fi

echo -e "\n${BLUE}===================================================${NC}"
echo -e "   🎉 TRIỂN KHAI THÀNH CÔNG (Phiên bản FIX SSL)!"
echo -e "${BLUE}===================================================${NC}"
echo -e "🌐 Website:  ${YELLOW}https://$DOMAIN_NAME${NC}"
echo -e "🔑 Admin:    ${YELLOW}https://$DOMAIN_NAME/#admin${NC}"
echo -e "👤 User:     ${YELLOW}$ADMIN_USER${NC}"
echo -e "🔑 Pass:     ${YELLOW}$ADMIN_PASS${NC}"
echo -e "${BLUE}===================================================${NC}"
