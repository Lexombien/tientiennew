#!/bin/bash

# ==========================================
# SETUP DỰ ÁN TIENTIENFLORIST TRÊN VPS
# ==========================================

# Màu sắc
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 BẮT ĐẦU CÀI ĐẶT DỰ ÁN TRÊN VPS...${NC}"

# 1. Kiểm tra Node.js
echo -e "\n${GREEN}[1/5] Kiểm tra Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js chưa cài đặt. Đang cài Node 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js đã cài đặt: $(node -v)"
fi

# 2. Kiểm tra PM2
echo -e "\n${GREEN}[2/5] Kiểm tra PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    echo "📦 Đang cài đặt PM2..."
    sudo npm install -g pm2
    pm2 startup
else
    echo "✅ PM2 đã cài đặt."
fi

# 3. Cài đặt thư viện
echo -e "\n${GREEN}[3/5] Cài đặt dependencies (npm install)...${NC}"
# Xóa node_modules cũ nếu cần thiết để sạch sẽ
# rm -rf node_modules
npm install --legacy-peer-deps

# 4. Build dự án
echo -e "\n${GREEN}[4/5] Build Frontend (npm run build)...${NC}"
npm run build

# 5. Khởi chạy Server
echo -e "\n${GREEN}[5/5] Khởi động Backend...${NC}"

# Tạo folder uploads nếu chưa có
mkdir -p uploads

# Restart hoặc Start mới
if pm2 list | grep -q "tientienflorist"; then
    echo "🔄 Reloading application..."
    pm2 reload tientienflorist --update-env
else
    echo "▶️ Starting application..."
    pm2 start server.js --name "tientienflorist" --update-env
    pm2 save
fi

echo -e "\n${GREEN}✅ CÀI ĐẶT HOÀN TẤT!${NC}"
echo "------------------------------------------------"
echo "👉 Frontend (Dist): $(pwd)/dist"
echo "👉 Backend: Port 3001"
echo "------------------------------------------------"
echo "💡 BƯỚC TIẾP THEO (Nếu dùng OpenLiteSpeed):"
echo "1. Vào OLS WebAdmin > Virtual Hosts"
echo "2. Trỏ Root vào: $(pwd)/dist"
echo "3. Tạo Proxy /api/ trỏ về 127.0.0.1:3001"
echo "------------------------------------------------"
