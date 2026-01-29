#!/bin/bash

# Màu sắc cho thông báo
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}    🚀 ĐANG CẬP NHẬT TÍNH NĂNG MỚI LÊN VPS...      ${NC}"
echo -e "${BLUE}====================================================${NC}"

# 1. Kéo code từ GitHub
echo -e "\n${YELLOW}[1/5] Đang lấy code mới từ GitHub...${NC}"
git reset --hard origin/main
git pull origin main

# 2. Cài đặt dependencies (nếu có thư viện mới)
echo -e "\n${YELLOW}[2/5] Đang kiểm tra và cài đặt thư viện...${NC}"
npm install --legacy-peer-deps
# Đảm bảo Sharp luôn đúng bản Linux
npm install --os=linux --cpu=x64 sharp --quiet

# 3. Build lại giao diện mới
echo -e "\n${YELLOW}[3/5] Đang Build lại giao diện web (Vite)...${NC}"
npm run build

# 4. Restart Backend & Web Server
echo -e "\n${YELLOW}[4/5] Đang khởi động lại hệ thống...${NC}"
pm2 restart web-backend --update-env
/usr/local/lsws/bin/lswsctrl restart > /dev/null

# 5. Hoàn tất
echo -e "\n${GREEN}====================================================${NC}"
echo -e "${GREEN}   ✅ CẬP NHẬT THÀNH CÔNG! HÃY KIỂM TRA WEB NGAY.   ${NC}"
echo -e "${GREEN}====================================================${NC}"
