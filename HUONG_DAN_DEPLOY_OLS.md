# HƯỚNG DẪN TRIỂN KHAI LÊN VPS (OPENLITESPEED / CYBERPANEL)

Tài liệu này hướng dẫn cách đưa website lên mạng chạy trên VPS sử dụng **OpenLiteSpeed (OLS)** hoặc **CyberPanel**.

---

## 🚀 CÁCH 1: Cài đặt Tự động (Khuyên dùng)

Đây là cách nhanh nhất, chỉ cần chạy 1 lệnh là xong tất cả (Node.js, SSL, Cấu hình).

### 1. Chuẩn bị
- Một VPS đã cài sẵn **OpenLiteSpeed** (hoặc CyberPanel).
- Tên miền đã trỏ về IP của VPS.
- Đã tạo Website trong Admin Panel của OLS/CyberPanel (ví dụ: `lemyloi.work.gd`).

### 2. Thực hiện trên VPS
Mở SSH (Terminal) và chạy lần lượt các lệnh sau:

**Bước 1: Vào thư mục chứa web (Ví dụ: hoasaphcm.vn)**
```bash
cd /usr/local/lsws/hoasaphcm.vn/html
```

**Bước 2: Sao lưu SSL và Lấy code mới**
Nếu bạn đã có SSL (file `.htaccess` quan trọng), hãy làm theo cách này để không bị mất:
```bash
# 1. Tạm thời giấu file cấu hình SSL đi
mv .htaccess .htaccess_ssl_bak 2>/dev/null

# 2. Xóa các file cũ (trừ file bak vừa tạo)
rm -rf * .[^.]* 2>/dev/null
mv .htaccess_ssl_bak .htaccess

# 3. Clone code từ GitHub vào thư mục hiện tại
git clone https://github.com/Lexombien/tientiennew.git .
```

**Bước 3: Chạy Script cài đặt thông minh**
Lệnh này sẽ cài đặt NodeJS, Backend, Build giao diện và cấu hình Server:
```bash
bash ols-install.sh
```

**Lưu ý quan trọng khi chạy Script:**
Khi Script hỏi về SSL, hãy chọn như sau:
*   Nếu đã có SSL rồi: Nhấn **n** (No) hoặc **u** (Update - chỉ cập nhật cấu hình vào vhost).
*   Nếu chưa có SSL: Nhấn **y** (Yes) để cài mới.

**Bước 4: Kiểm tra kết quả**
*   Truy cập: `https://tenmien.com`
*   Nếu thấy lỗi 404 hoặc 403, hãy vào Admin (`/admin`) nhấn **Lưu** một lần để tạo lại dữ liệu.

### 3. Nhập thông tin
Script sẽ hỏi bạn vài câu đơn giản:
1. **Tên miền:** Nhập domain (VD: `lemyloi.work.gd`)
2. **Mật khẩu Admin:** Nhập mật khẩu để đăng nhập trang quản trị shop hoa.
3. **Cài SSL:** Chọn `y` để có ổ khóa xanh (HTTPS) miễn phí.

**🎉 XONG!** Web của bạn đã chạy.

---

## 🔧 CÁCH 2: Cập nhật code mới (Khi sửa code)

Mỗi khi bạn sửa code ở máy tính và chạy `dongbo githup.bat` xong, hãy làm như sau để cập nhật lên VPS:

1. SSH vào VPS.
2. Chạy lệnh:
```bash
cd /usr/local/lsws/lemyloi.work.gd/html
git pull
bash ols-install.sh
```
*(Chạy lại `ols-install.sh` giúp build lại giao diện mới nhất và restart server)*.

---

## ❓ Xử lý lỗi thường gặp

**1. Lỗi "404 Not Found" khi vào trang chủ**
- Nguyên nhân: OpenLiteSpeed chưa nhận đúng thư mục code.
- Khắc phục: Chạy lại `bash ols-install.sh` và nhập đúng tên miền.

**2. Lỗi "503 Service Unavailable" hoặc API lỗi**
- Nguyên nhân: Backend Server chưa chạy.
- Khắc phục: Kiểm tra bằng lệnh `pm2 list`. Nếu chưa có, chạy lại script install.

**3. Web không hiện ảnh sản phẩm**
- Nguyên nhân: Chưa trỏ đúng thư mục uploads.
- Khắc phục: Script install đã tự làm việc này. Nếu vẫn lỗi, vào OLS WebAdmin > Context > Kiểm tra mục `/uploads/`.

---

## 📂 Thông tin hệ thống

- **Web Root:** `/usr/local/lsws/<domain>/html/dist` (Giao diện React)
- **Backend:** Port `3001` (Chạy ngầm bằng PM2)
- **Uploads:** `/usr/local/lsws/<domain>/html/uploads` (Chứa ảnh)
- **Database:** `/usr/local/lsws/<domain>/html/database.json` (Lưu đơn hàng & sản phẩm)

**Chúc bạn thành công!** 🌸
