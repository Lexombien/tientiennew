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

# 0. Sửa lỗi Quyền sở hữu Git (Dubious Ownership)
echo -e "${YELLOW}[1/7] Cấu hình quyền hạn Git...${NC}"
git config --global --add safe.directory $(pwd)

# 1. Sao lưu file .htaccess (Cấu hình SSL quan trọng)
echo -e "${YELLOW}[2/7] Đang bảo vệ cấu hình SSL (.htaccess)...${NC}"
if [ -f ".htaccess" ]; then
    cp .htaccess .htaccess_production_bak
fi

# 2. Kéo code mới nhất từ GitHub
echo -e "${YELLOW}[3/7] Đang lấy code mới nhất từ GitHub...${NC}"
git fetch --all
git reset --hard origin/main
git pull origin main

# 3. Khôi phục lại file SSL sau khi kéo code
if [ -f ".htaccess_production_bak" ]; then
    mv .htaccess_production_bak .htaccess
    echo -e "✅ Đã khôi phục cấu hình SSL."
fi

# 4. Cài đặt thư viện & Sửa lỗi quyền thực thi
echo -e "${YELLOW}[4/7] Cài đặt thư viện & Cấp quyền thực thi...${NC}"
npm install --legacy-peer-deps --quiet
# Sửa lỗi "vite: Permission denied"
chmod -R 755 node_modules/.bin

# 5. Build lại giao diện Front-end
echo -e "${YELLOW}[5/7] Đang đóng gói giao diện mới (Build)...${NC}"
rm -rf dist
npm run build

# 6. Khởi động lại Backend (PM2)
echo -e "${YELLOW}[6/7] Đang khởi động lại Backend...${NC}"
pm2 restart web-backend --update-env || pm2 start server.js --name web-backend
pm2 save

# 7. Khởi động lại Web Server (OpenLiteSpeed)
echo -e "${YELLOW}[7/7] Đang khởi động lại Web Server...${NC}"
if [ -f "/usr/local/lsws/bin/lswsctrl" ]; then
    /usr/local/lsws/bin/lswsctrl restart > /dev/null
fi

# HIỂN THỊ LOG ĐỂ KIỂM TRA (GIỐNG NHƯ ẢNH BẠN GỬI)
echo -e "\n${CYAN}====================================================${NC}"
echo -e "${CYAN}    📡 ĐANG KIỂM TRA TRẠNG THÁI HỆ THỐNG...        ${NC}"
echo -e "${CYAN}====================================================${NC}"
# Đợi 2 giây cho log kịp sinh ra rồi hiển thị trong 5 giây
sleep 2
timeout 5s pm2 logs web-backend --lines 25 --raw

# HOÀN TẤT
echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✅ CẬP NHẬT THÀNH CÔNG!                          ${NC}"
echo -e "${GREEN}   👉 Nếu bảng trên hiện màu XANH là OK.            ${NC}"
echo -e "${GREEN}   👉 Nhấn Ctrl + F5 trên trình duyệt để tải lại.   ${NC}"
echo -e "${GREEN}====================================================${NC}"
