#!/bin/bash

# Màu sắc thông báo
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    🚀 BẮT ĐẦU CẬP NHẬT TÍNH NĂNG MỚI LÊN VPS...   ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 0. Sửa lỗi quyền Git
git config --global --add safe.directory $(pwd)

# 1. BẢO VỆ SSL TRÊN VPS (CỰC KỲ QUAN TRỌNG)
echo -e "${YELLOW}[1/7] Đang bảo vệ cấu hình SSL từ VPS...${NC}"
if [ -f ".htaccess" ]; then
    cp .htaccess .htaccess_ssl_vps_safe
    echo -e "✅ Đã đóng băng cấu hình SSL."
fi

# 2. LẤY CODE MỚI NHẤT
echo -e "${YELLOW}[2/7] Đang kéo code mới nhất từ GitHub...${NC}"
git fetch --all
git reset --hard origin/main
git pull origin main

# 3. KHÔI PHỤC SSL (Ghi đè file GitHub)
if [ -f ".htaccess_ssl_vps_safe" ]; then
    mv .htaccess_ssl_vps_safe .htaccess
    echo -e "✅ Đã khôi phục cấu hình SSL nguyên bản của VPS."
fi

# 4. FIX LỖI QUYỀN THỰC THI (FIX EACCES ESBUILD)
echo -e "${YELLOW}[3/7] Đang cài đặt thư viện & Mở khóa quyền thực thi...${NC}"
npm install --legacy-peer-deps --quiet
# Cấp quyền thực thi mạnh mẽ cho toàn bộ thư mục node_modules để tránh lỗi EACCES
chmod -R +x node_modules
echo -e "✅ Đã mở khóa bộ máy Build (Esbuild/Vite)."

# 5. BUILD GIAO DIỆN (Dừng nếu lỗi)
echo -e "${YELLOW}[4/7] Đang đóng gói giao diện mới (Build)...${NC}"
rm -rf dist
if ! ./node_modules/.bin/vite build; then
    echo -e "${RED}❌ LỖI: Build thất bại do quyền hạn hoặc lỗi code!${NC}"
    exit 1
fi

# 6. KHỞI ĐỘNG LẠI HỆ THỐNG
echo -e "${YELLOW}[5/7] Đang khởi động lại Backend & Web Server...${NC}"
pm2 restart web-backend --update-env || pm2 start server.js --name web-backend
pm2 save
/usr/local/lsws/bin/lswsctrl restart > /dev/null

# 7. HIỂN THỊ TRẠNG THÁI (URL, UPLOAD, ZALO BOT)
echo -e "\n${CYAN}====================================================${NC}"
echo -e "${CYAN}    📡 ĐANG KIỂM TRA TRẠNG THÁI HỆ THỐNG...        ${NC}"
echo -e "${CYAN}====================================================${NC}"
sleep 1
timeout 7s pm2 logs web-backend --lines 25 --raw

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✨ CHÚC MỪNG! WEBSITE ĐÃ CẬP NHẬT THÀNH CÔNG ✨   ${NC}"
echo -e "${GREEN}   🔒 SSL CỦA BẠN VẪN AN TOÀN TUYỆT ĐỐI.            ${NC}"
echo -e "${GREEN}====================================================${NC}"
