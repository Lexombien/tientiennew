#!/bin/bash

# =================================================================
# 🚀 OLS MASTER INSTALLER V4 - AUTO SHARP + AUTO SSL + PM2
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
echo -e "${CYAN}        🌸 LUXURY FLOWERS - VPS MASTER SETUP 🌸      ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. KIỂM TRA QUYỀN ROOT
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Lỗi: Bạn phải chạy script này bằng quyền root (sudo).${NC}"
    exit 1
fi

# 2. NHẬP THÔNG TIN CƠ BẢN
echo -e "\n${YELLOW}[1/3] THÔNG TIN TÊN MIỀN${NC}"
read -p "👉 Nhập tên miền của bạn (VD: lemyloi.work.gd): " DOMAIN_NAME
while [ -z "$DOMAIN_NAME" ]; do
    read -p "❌ Không được để trống. Nhập lại: "   DOMAIN_NAME
done

echo -e "\n${YELLOW}[2/3] CẤU HÌNH TÀI KHOẢN ADMIN (Cho trang quản lý)${NC}"
read -p "👉 Tên đăng nhập (mặc định admin): " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}
read -p "👉 Mật khẩu (mặc định admin123): " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-admin123}

OLS_ROOT="/usr/local/lsws"
WORK_DIR="$OLS_ROOT/$DOMAIN_NAME/html"

# 3. CÀI ĐẶT CÔNG CỤ HỆ THỐNG
echo -e "\n${PURPLE}Step 1: Cập nhật hệ thống & Cài đặt công cụ nền...${NC}"
apt update -y
apt install -y curl git certbot net-tools npm nodejs build-essential

# 4. CÀI ĐẶT NODE.JS 20 (PHIÊN BẢN ỔN ĐỊNH)
echo -e "\n${PURPLE}Step 2: Đang thiết lập môi trường Node.js 20...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v) != v20* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo -e "✅ Node.js: $(node -v)"

# 5. CÀI ĐẶT PM2 & FIX BIẾN MÔI TRƯỜNG
echo -e "\n${PURPLE}Step 3: Cài đặt PM2 (Quản lý chạy ngầm)...${NC}"
npm install -g pm2
ln -s "$(which pm2)" /usr/bin/pm2 2>/dev/null
echo -e "✅ PM2 đã sẵn sàng."

# 6. ĐỒNG BỘ MÃ NGUỒN VÀO THƯ MỤC WEB
echo -e "\n${PURPLE}Step 4: Đồng bộ mã nguồn vào $WORK_DIR...${NC}"
mkdir -p "$WORK_DIR"
# Copy tất cả file trừ node_modules (nếu có) để nhẹ máy
cp -r . "$WORK_DIR/" 2>/dev/null
cd "$WORK_DIR" || exit

# 7. CÀI ĐẶT THƯ VIỆN & FIX LỖI SHARP (QUAN TRỌNG CHO 503)
echo -e "\n${PURPLE}Step 5: Cài đặt thư viện & Sửa lỗi Sharp (Linux x64)...${NC}"
npm install --legacy-peer-deps
# Ép cài đặt Sharp bản dành cho Linux để tránh lỗi 503 khi xử lý ảnh
npm install --os=linux --cpu=x64 sharp
# Build giao diện web
npm run build

# 8. CẤU HÌNH .ENV & KHỞI ĐỘNG BACKEND
echo -e "\n${PURPLE}Step 6: Khởi động hệ thống Backend...${NC}"
cat > .env <<EOF
PORT=3001
HOST=0.0.0.0
ADMIN_USERNAME=$ADMIN_USER
ADMIN_PASSWORD=$ADMIN_PASS
EOF
pm2 delete web-backend 2>/dev/null
pm2 start server.js --name "web-backend"
pm2 save
pm2 startup | grep "sudo" | bash 2>/dev/null

# 9. CÀI ĐẶT SSL TỰ ĐỘNG (TÙY CHỌN)
echo -e "\n${YELLOW}[3/3] CẤU HÌNH SSL (HTTPS)${NC}"
read -p "👉 Bạn có muốn cài đặt SSL mới không? (y/n/u - y: Cài mới, n: Bỏ qua, u: Chỉ cập nhật cấu hình cũ): " INSTALL_SSL
INSTALL_SSL=${INSTALL_SSL:-y}

SSL_KEY="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
SSL_CERT="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
SSL_CFG=""
REDIRECT_CFG=""

if [[ "$INSTALL_SSL" == "y" || "$INSTALL_SSL" == "Y" ]]; then
    echo -e "\n${PURPLE}Step 7: ĐANG CÀI ĐẶT SSL (HTTPS) TỰ ĐỘNG...${NC}"
    echo -e "⏳ Đang tạm dừng OLS để xác thực cổng 80..."
    "$OLS_ROOT/bin/lswsctrl" stop > /dev/null

    # Dùng standalone mode để lấy SSL một cách tin cậy nhất
    certbot certonly --standalone -d "$DOMAIN_NAME" --non-interactive --agree-tos --email admin@$DOMAIN_NAME --quiet

    if [ -f "$SSL_KEY" ]; then
        echo -e "${GREEN}✅ Thành công! Đã cấp chứng chỉ SSL cho $DOMAIN_NAME.${NC}"
    else
        echo -e "${RED}❌ Thất bại: Không lấy được SSL. Kiểm tra lại DNS trỏ về IP VPS chưa?${NC}"
    fi
    "$OLS_ROOT/bin/lswsctrl" start > /dev/null
fi

# Cấu hình chuỗi SSL cho VHost nếu file tồn tại (áp dụng cho cả 'y' thành công và 'u')
if [[ "$INSTALL_SSL" != "n" && -f "$SSL_KEY" ]]; then
    SSL_CFG="
vhssl  {
  keyFile                 $SSL_KEY
  certFile                $SSL_CERT
  certChain               1
  sslProtocol             30
}"
    REDIRECT_CFG="
rewrite  {
  enable                  1
  rules                   <<<END_REWRITE
RewriteCond %{SERVER_PORT} 80
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]
END_REWRITE
}"
fi

# 10. GHI CẤU HÌNH VHOST VÀO OPENLITESPEED
echo -e "\n${PURPLE}Step 8: Cập nhật cấu hình OpenLiteSpeed...${NC}"
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

# PROXY TRỰC TIẾP VÀO NODEJS (BACKEND)
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

$REDIRECT_CFG
EOF

# Phân quyền chuẩn cho OLS
chown -R lsadm:lsadm "$VHOST_CONF_DIR"
"$OLS_ROOT/bin/lswsctrl" restart > /dev/null

# 11. TỔNG KẾT
echo -e "\n${GREEN}====================================================${NC}"
echo -e "${WHITE}✨ XONG! WEB CỦA BẠN ĐÃ LÊN SÓNG THÀNH CÔNG ✨${NC}"
echo -e "${GREEN}====================================================${NC}"
echo -e "🌍 Trang chủ:   ${CYAN}https://$DOMAIN_NAME${NC}"
echo -e "🔐 Quản trị:    ${CYAN}https://$DOMAIN_NAME/admin${NC}"
echo -e "👤 Tài khoản:   ${WHITE}$ADMIN_USER${NC}"
echo -e "🔑 Mật khẩu:    ${WHITE}$ADMIN_PASS${NC}"
echo -e "----------------------------------------------------"
if netstat -tulpn | grep :3001 > /dev/null; then
    echo -e "🚀 Backend:      ${GREEN}✅ ONLINE${NC}"
else
    echo -e "🚀 Backend:      ${RED}❌ DỪNG (pm2 logs để xem lỗi)${NC}"
fi
echo -e "🔒 SSL/HTTPS:    $( [ -f "$SSL_KEY" ] && echo -e "${GREEN}✅ ĐÃ CÀI${NC}" || echo -e "${RED}❌ CHƯA CÀI${NC}" )"
echo -e "${GREEN}====================================================${NC}"
