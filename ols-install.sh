#!/bin/bash

# =================================================================
# 🚀 OLS ULTRA INSTALLER V3 - PROXY MODE + AUTO SSL + SHARP FIX
# =================================================================

# Color Palette
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m'

clear
echo -e "${BLUE}====================================================${NC}"
echo -e "${CYAN}        🌸 LUXURY FLOWERS - AUTO DECODER V3 🌸      ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. CHECK ROOT
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Lỗi: Vui lòng chạy bằng quyền root (sudo).${NC}"
    exit 1
fi

# 2. INPUT INFO
echo -e "\n${YELLOW}[1/3] THÔNG TIN TÊN MIỀN${NC}"
read -p "👉 Tên miền (hỗ trợ lemyloi.work.gd): " DOMAIN_NAME
while [ -z "$DOMAIN_NAME" ]; do
    read -p "❌ Không được để trống: " DOMAIN_NAME
done

echo -e "\n${YELLOW}[2/3] CẤU HÌNH ADMIN${NC}"
read -p "👉 User (admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}
read -p "👉 Pass (admin123): " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}

OLS_ROOT="/usr/local/lsws"
WORK_DIR="$OLS_ROOT/$DOMAIN_NAME/html"

# 3. INSTALL TOOLS
echo -e "\n${PURPLE}Step 1: Cài đặt công cụ nền...${NC}"
apt update -y
apt install -y curl git certbot net-tools npm nodejs build-essential

# 4. NODEJS 20 (CLEAN INSTALL)
echo -e "\n${PURPLE}Step 2: Cài đặt Node.js 20...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "✅ Node.js: $(node -v)"

# 5. PM2 SYMLINK FIX
echo -e "\n${PURPLE}Step 3: Cài đặt PM2...${NC}"
npm install -g pm2
ln -s "$(which pm2)" /usr/bin/pm2 2>/dev/null
echo -e "✅ PM2 ready."

# 6. CODE SYNC
echo -e "\n${PURPLE}Step 4: Đồng bộ mã nguồn...${NC}"
mkdir -p "$WORK_DIR"
cp -r . "$WORK_DIR/" 2>/dev/null
cd "$WORK_DIR" || exit

# 7. DEPENDENCIES + SHARP LINUX FIX
echo -e "\n${PURPLE}Step 5: Cài đặt thư viện & Fix Sharp (Linux)...${NC}"
npm install --legacy-peer-deps
# Fix Sharp lỗi 503
npm install --os=linux --cpu=x64 sharp
# Build frontend
npm run build

# 8. PM2 START
echo -e "\n${PURPLE}Step 6: Khởi động Backend (Port 3001)...${NC}"
cat > .env <<EOF
PORT=3001
HOST=0.0.0.0
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF
pm2 delete web-backend 2>/dev/null
pm2 start server.js --name "web-backend"
pm2 save

# 9. INITIAL OLS CONFIG (HTTP ONLY) - TO VALIDATE SSL
echo -e "\n${PURPLE}Step 7: Cấu hình OpenLiteSpeed (HTTP)...${NC}"
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

# CONTEXT CHO SSL CHECK (CERTBOT)
context /.well-known/acme-challenge/ {
  location                \$VH_ROOT/html/dist/.well-known/acme-challenge/
  allow                   *
}

# PROXY TO NODE.JS
extprocessor node-backend {
  type                    proxy
  address                 127.0.0.1:3001
  maxConns                100
}

context / {
  type                    proxy
  handler                 node-backend
}
EOF

chown -R lsadm:lsadm "$VHOST_CONF_DIR"
"$OLS_ROOT/bin/lswsctrl" restart > /dev/null

# 10. AUTO SSL INSTALLATION
echo -e "\n${PURPLE}Step 8: Cài đặt SSL tự động (Let's Encrypt)...${NC}"
mkdir -p "$WORK_DIR/dist/.well-known/acme-challenge"
certbot certonly --webroot -w "$WORK_DIR/dist" -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@$DOMAIN_NAME --quiet

SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"

if [ -f "$SSL_KEY" ]; then
    echo -e "${GREEN}✅ Đã lấy được chứng chỉ SSL thành công!${NC}"
    # Cập nhật file cấu hình OLS với SSL & Force HTTPS
    cat >> "$VHOST_CONF" <<EOF

vhssl  {
  keyFile                 $SSL_KEY
  certFile                $SSL_CERT
  certChain               1
  sslProtocol             30
}

rewrite  {
  enable                  1
  rules                   <<<END_REWRITE
RewriteCond %{SERVER_PORT} 80
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
END_REWRITE
}
EOF
else
    echo -e "${RED}⚠️ SSL Thất bại: Domain chưa trỏ IP hoặc lỗi DNS.${NC}"
fi

# 11. RESTART & FINISH
"$OLS_ROOT/bin/lswsctrl" restart > /dev/null

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${WHITE}🚀 CÀI ĐẶT HOÀN TẤT! WEBSITE ĐÃ SẴN SÀNG.${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "🔗 Link:      ${CYAN}https://$DOMAIN_NAME${NC}"
echo -e "👤 Admin:     ${WHITE}$ADMIN_USER / $ADMIN_PASS${NC}"
echo -e "🛠️  Backend:   ${GREEN}ONLINE (Port 3001)${NC}"
echo -e "${GREEN}====================================================${NC}"
