#!/bin/bash

# Màu sắc cho thông báo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    🚀 BẮT ĐẦU CẬP NHẬT TÍNH NĂNG MỚI LÊN VPS...   ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 0. Sửa lỗi Quyền sở hữu Git
git config --global --add safe.directory $(pwd)

# 1. SAO LƯU CẤU HÌNH SSL TRÊN VPS (CỰC KỲ QUAN TRỌNG)
echo -e "${YELLOW}[1/7] Đang bảo vệ cấu hình SSL & Web server...${NC}"
if [ -f ".htaccess" ]; then
    cp .htaccess .htaccess_ssl_vps_bak
    echo -e "✅ Đã tạm giữ cấu hình SSL của VPS."
fi

# 2. Kéo code mới nhất từ GitHub
echo -e "${YELLOW}[2/7] Đang lấy code mới nhất từ GitHub...${NC}"
git fetch --all
git reset --hard origin/main
git pull origin main

# 3. KHÔI PHỤC CẤU HÌNH SSL CỦA VPS (Ghi đè hoàn toàn file từ GitHub)
if [ -f ".htaccess_ssl_vps_bak" ]; then
    mv .htaccess_ssl_vps_bak .htaccess
    echo -e "✅ Đã khôi phục cấu hình SSL nguyên bản của VPS (Bỏ qua file GitHub)."
fi

# 4. Cài đặt thư viện & Sửa lỗi quyền thực thi
echo -e "${YELLOW}[3/7] Cài đặt thư viện & Cấp quyền thực thi...${NC}"
npm install --legacy-peer-deps --quiet
chmod -R 755 node_modules/.bin
chmod +x node_modules/vite/bin/vite.js 2>/dev/null

# 5. Build lại giao diện Front-end
echo -e "${YELLOW}[4/7] Đang đóng gói giao diện mới (Build)...${NC}"
rm -rf dist
if ! ./node_modules/.bin/vite build; then
    echo -e "${RED}❌ LỖI: Build không thành công. Hệ thống vẫn giữ bản cũ.${NC}"
    exit 1
fi

# 6. Khởi động lại Backend (PM2)
echo -e "${YELLOW}[5/7] Đang khởi động lại Backend...${NC}"
pm2 restart web-backend --update-env || pm2 start server.js --name web-backend
pm2 save

# 7. Khởi động lại Web Server (OpenLiteSpeed)
echo -e "${YELLOW}[6/7] Đang khởi động lại Web Server...${NC}"
if [ -f "/usr/local/lsws/bin/lswsctrl" ]; then
    /usr/local/lsws/bin/lswsctrl restart > /dev/null
fi

# 8. HIỂN THỊ TRẠNG THÁI
echo -e "\n${CYAN}====================================================${NC}"
echo -e "${CYAN}    📡 TRẠNG THÁI HỆ THỐNG HIỆN TẠI                ${NC}"
echo -e "${CYAN}====================================================${NC}"
sleep 1
timeout 5s pm2 logs web-backend --lines 20 --raw

echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✅ CẬP NHẬT THÀNH CÔNG & ĐÃ GIỮ LẠI SSL!         ${NC}"
echo -e "${GREEN}   👉 Nhấn Ctrl + F5 để xem thay đổi.               ${NC}"
echo -e "${GREEN}====================================================${NC}"
