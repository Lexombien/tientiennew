# 🔧 Hướng dẫn Deploy Fix SEO Meta Tags

## 📌 Tóm tắt các bug đã sửa

### 1️⃣ **Bug Regex (.test() trước .replace())**
- **Vấn đề**: Code cũ dùng `.test()` để kiểm tra trước khi `.replace()`, nhưng `.test()` di chuyển con trỏ regex, khiến `.replace()` không hoạt động.
- **Kết quả**: File `index.html` KHÔNG được cập nhật dù log báo "✅ Updated".
- **Giải pháp**: Bỏ `.test()`, chỉ dùng `.replace()` trực tiếp.

### 2️⃣ **Bug ENOENT (file không tồn tại)**
- **Vấn đề**: OpenLiteSpeed serve từ `/dist/index.html` (sau build), nhưng code chỉ cập nhật `index.html` gốc.
- **Kết quả**: Lỗi "ENOENT: no such file or directory, stat '/usr/local/lsws/.../dist/index.html'".
- **Giải pháp**: Cập nhật CẢ HAI file: `index.html` (source) và `dist/index.html` (production).

### 3️⃣ **Chức năng tự động lưu SEO**
- Thêm `onBlur` handler vào các ô nhập SEO để tự động gọi `saveGlobalSettings()`.
- Thêm nút **"Clear Cache"** trong Admin để xóa localStorage và reload cài đặt từ server.

---

## 🚀 Bước Deploy lên VPS

### **1. SSH vào VPS**
```bash
ssh user@your-vps-ip
cd /đường/dẫn/đến/project
```

### **2. Chạy script update**
```bash
bash update.sh
```

Script sẽ tự động:
- ✅ Pull code mới từ GitHub
- ✅ Cài đặt dependencies
- ✅ Build frontend → tạo `dist/index.html`
- ✅ Restart PM2 backend
- ✅ Restart OpenLiteSpeed

### **3. Kiểm tra log**
Sau khi update xong, kiểm tra log để đảm bảo không còn lỗi:

```bash
pm2 logs web-backend --lines 30
```

Bạn sẽ thấy:
```
✅ Updated dist/index.html
   📝 Title: Thế Giới Hoa Sáp...
   📝 Description: TEST XEM THỬ...
   📝 Keywords: hoa sáp, hoa sáp hcm...
```

### **4. Test chức năng SEO**
1. Vào **Admin** → **Cài đặt** → **Tối ưu SEO**
2. Sửa "Tiêu đề SEO" thành: **"XIN CHÀO TEST CUỐI CÙNG"**
3. Nhấp chuột ra ngoài (blur) hoặc nhấn **Save**
4. Kiểm tra log PM2:
   ```bash
   pm2 logs web-backend --lines 5
   ```
5. Xem file đã thay đổi chưa:
   ```bash
   cat dist/index.html | grep -i "XIN CHÀO TEST"
   ```

Nếu thấy kết quả → **THÀNH CÔNG!** ✅

---

## 🔍 Kiểm tra SEO trên công cụ

Sau khi cập nhật xong, hãy kiểm tra trên các công cụ:

### **Cách 1: View Page Source**
1. Mở website của bạn
2. Nhấn **Ctrl + U** (hoặc chuột phải → View Page Source)
3. Tìm `<title>` và `<meta name="description"`
4. Xem đã có nội dung mới chưa

### **Cách 2: Facebook Debugger**
- https://developers.facebook.com/tools/debug/
- Nhập URL website → **Scrape Again**

### **Cách 3: Google Search Console**
- https://search.google.com/test/rich-results
- Nhập URL → kiểm tra thẻ meta

---

## 📝 Lưu ý quan trọng

### **Nếu vẫn không thấy thay đổi:**

1. **Xóa cache trình duyệt:**
   - Nhấn **Ctrl + Shift + Delete**
   - Hoặc mở tab ẩn danh (Ctrl + Shift + N)

2. **Xóa cache localStorage:**
   - Vào Admin
   - Nhấn nút **"🔄 Clear Cache"** (màu cam)
   - Hoặc F12 → Console → gõ:
     ```javascript
     localStorage.clear()
     location.reload()
     ```

3. **Kiểm tra file thực tế:**
   ```bash
   # Xem file dist/index.html
   cat dist/index.html | head -30
   
   # Hoặc dùng nano/vi để xem toàn bộ
   nano dist/index.html
   ```

---

## ✅ Kết luận

Sau khi deploy version mới này:
- ✅ SEO meta tags sẽ **tự động cập nhật** khi bạn sửa trong Admin
- ✅ Không còn lỗi ENOENT
- ✅ File `dist/index.html` (production) được cập nhật chính xác
- ✅ Các công cụ SEO sẽ thấy thông tin mới ngay lập tức

Nếu còn vấn đề gì, hãy gửi log PM2 cho tôi để kiểm tra!
