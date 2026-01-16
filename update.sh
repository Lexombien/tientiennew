#!/bin/bash

# =================================================================
# SCRIPT CẬP NHẬT CODE SIÊU TỐC (UPDATE ONLY)
# Phiên bản: Có load NVM để fix lỗi command not found
# =================================================================

# Màu sắc
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 🔥 QUAN TRỌNG: LOAD NVM (NODE JS) TRƯỚC KHI CHẠY
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}  🚀 ĐANG CẬP NHẬT WEBSITE... (UPDATE ONLY)       ${NC}"
echo -e "${BLUE}===================================================${NC}"

# Check xem Node đã nhận chưa
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Lỗi: Không tìm thấy Node.js. Đang thử load lại NVM...${NC}"
    # Dự phòng cho trường hợp path khác
    export NVM_DIR="/root/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# 1. Kéo code mới
echo -e "\n${GREEN}[1/4] Git Pull (Lấy code mới)...${NC}"
git pull

# 2. Cài đặt lại thư viện (đề phòng có cái mới)
echo -e "\n${GREEN}[2/4] Cài đặt dependencies...${NC}"
npm install --legacy-peer-deps

# 3. Build lại Frontend (React)
echo -e "\n${GREEN}[3/4] Build Frontend (React)...${NC}"
npm run build

# Fix lại quyền truy cập cho thư mục Uploads
mkdir -p uploads
chmod -R 777 uploads

# 4. Khởi động lại Backend
echo -e "\n${GREEN}[4/4] Restart Backend (Node.js)...${NC}"
pm2 reload web-backend --update-env || pm2 start server.js --name "web-backend"

echo -e "\n${BLUE}===================================================${NC}"
echo -e "   🎉 CẬP NHẬT HOÀN TẤT!${NC}"
echo -e "   Website đã chạy phiên bản mới nhất."
echo -e "${BLUE}===================================================${NC}"
