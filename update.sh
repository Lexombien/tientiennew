#!/bin/bash

# Màu sắc cho thông báo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    🚀 ĐANG CẬP NHẬT TÍNH NĂNG MỚI LÊN VPS...      ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 0. Cấu hình Git an toàn (Sửa lỗi ownership nếu có)
git config --global --add safe.directory $(pwd)

# 1. Kéo code từ GitHub
echo -e "\n${YELLOW}[1/6] Đang lấy code mới nhất từ GitHub...${NC}"
git fetch --all
git reset --hard origin/main
git pull origin main

# 2. Xóa sạch folder build cũ
echo -e "\n${YELLOW}[2/6] Dọn dẹp bản build cũ...${NC}"
rm -rf dist

# 3. Cài đặt dependencies
echo -e "\n${YELLOW}[3/6] Đang cài đặt/cập nhật thư viện...${NC}"
npm install --legacy-peer-deps
# Đảm bảo Sharp tương thích với Linux VPS
npm install --os=linux --cpu=x64 sharp --quiet

# 4. Build lại giao diện mới
echo -e "\n${YELLOW}[4/6] Đang Build lại giao diện web (Vite)...${NC}"
npm run build

# 5. Khởi động lại hệ thống
echo -e "\n${YELLOW}[5/6] Đang khởi động lại PM2 & Web Server...${NC}"
# Khởi động lại backend
pm2 restart all --update-env || pm2 start server.js --name web-backend
# Khởi động lại OpenLiteSpeed
if [ -f "/usr/local/lsws/bin/lswsctrl" ]; then
    /usr/local/lsws/bin/lswsctrl restart > /dev/null
fi

# 6. Hoàn tất
echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✅ CẬP NHẬT THÀNH CÔNG!                          ${NC}"
echo -e "${GREEN}   👉 LƯU Ý: Hãy nhấn Ctrl + F5 trên trình duyệt    ${NC}"
echo -e "${GREEN}   để xóa cache và thấy giao diện mới nhất.         ${NC}"
echo -e "${GREEN}====================================================${NC}"
