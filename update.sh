#!/bin/bash

# =================================================================
# SCRIPT CẬP NHẬT CODE SIÊU TỐC (UPDATE ONLY)
# Phiên bản: Fix lỗi 'vite: Permission denied'
# =================================================================

# Màu sắc
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo -e "${BLUE}===================================================${NC}"
echo -e "${BLUE}  🚀 ĐANG CẬP NHẬT WEBSITE... (UPDATE ONLY)       ${NC}"
echo -e "${BLUE}===================================================${NC}"

# 1. Kéo code mới
echo -e "\n${GREEN}[1/4] Git Pull...${NC}"
git pull

# 2. Cài đặt dependencies
echo -e "\n${GREEN}[2/4] Install Dependencies...${NC}"
npm install --legacy-peer-deps

# 🔥 FIX LỖI QUYỀN THỰC THI CHO VITE 🔥
echo -e "\n${GREEN}[Step] Cấp quyền thực thi cho node_modules/.bin...${NC}"
chmod -R +x node_modules/.bin/
# Cụ thể hơn cho vite
if [ -f "node_modules/.bin/vite" ]; then
    chmod +x node_modules/.bin/vite
fi

# 3. Build React
echo -e "\n${GREEN}[3/4] Build Frontend (React)...${NC}"
npm run build

# Check xem build có thành công không
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Lỗi: Build thất bại. Kiểm tra lại log.${NC}"
else 
    echo -e "✅ Build thành công."
fi

# 4. Restart Backend
echo -e "\n${GREEN}[4/4] Restart Backend...${NC}"
mkdir -p uploads
chmod -R 777 uploads
pm2 reload web-backend --update-env || pm2 start server.js --name "web-backend"

echo -e "\n${BLUE}===================================================${NC}"
echo -e "   🎉 DONE!${NC}"
echo -e "${BLUE}===================================================${NC}"
