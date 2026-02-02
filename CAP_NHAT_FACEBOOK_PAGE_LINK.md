# 📘 Hướng Dẫn Thay Đổi Link Facebook Page

## 🎯 Cách cập nhật link Facebook Page của bạn

### Link Facebook Page của bạn:
```
https://www.facebook.com/hoahongsapthomtaitphcm/
```

### Cách 1: Thông qua Admin Panel (Khuyến nghị)

1. **Đăng nhập vào Admin:**
   - Truy cập: `/admin` (hoặc thêm `/admin` vào URL)
   - Nhập mật khẩu admin

2. **Mở Settings:**
   - Click tab **"⚙️ Cài đặt"**
   - Cuộn xuống phần **"📝 Thông tin Footer (Chân trang)"**

3. **Cấu hình Facebook Widget:**
   - ✅ Tick vào: **"Hiển thị widget Facebook dưới footer"**
   - Nhập URL vào ô input:
   ```
   https://www.facebook.com/hoahongsapthomtaitphcm/
   ```
   - Lưu tự động!

4. **Xem kết quả:**
   - Quay về trang chủ
   - Cuộn xuống footer
   - Widget Facebook sẽ hiển thị page của bạn

---

### Cách 2: Thay đổi trực tiếp Default Setting (Cho developer)

Mở file: `App.tsx`

Tìm dòng (khoảng dòng 98-99):
```tsx
// Facebook Page Settings
facebookPageUrl: '', // URL của Facebook Fanpage
showFacebookWidget: false, // Hiển thị widget Facebook hay không
```

Thay đổi thành:
```tsx
// Facebook Page Settings
facebookPageUrl: 'https://www.facebook.com/hoahongsapthomtaitphcm/',
showFacebookWidget: true,
```

---

## 🎨 Cấu hình mới của Widget

Widget đã được cập nhật theo yêu cầu của bạn:

### Thông số hiện tại:
- ✅ **Width**: 340px (desktop), auto-fit (mobile)
- ✅ **Height**: **350px** (tăng từ 300px)
- ✅ **Timeline**: Hiển thị
- ✅ **Cover**: Hiển thị
- ✅ **Facepile**: Hiển thị (danh sách người like)
- ✅ **Small Header**: Không (header đầy đủ)
- ✅ **Adapt Container Width**: Có (tự động điều chỉnh)

### So sánh:
```
Trước: 340px × 300px
Sau:   340px × 350px  (+50px chiều cao)
```

---

## 🔧 Chi tiết kỹ thuật

### Files đã cập nhật:

1. **App.tsx**
   - Line 3487: `height={350}` (thay vì 300)

2. **FacebookPagePlugin.tsx**
   - Line 16: Default height = 350

3. **index.css**
   - Line 1044: `min-height: 370px` (wrapper)
   - Line 1062: `min-height: 370px` (mobile)

### HTML Output (sau khi render):
```html
<div class="fb-page" 
  data-href="https://www.facebook.com/hoahongsapthomtaitphcm/"
  data-tabs="timeline"
  data-width="340"
  data-height="350"
  data-small-header="false"
  data-adapt-container-width="true"
  data-hide-cover="false"
  data-show-facepile="true">
  <!-- Facebook iframe sẽ được inject ở đây -->
</div>
```

Match với code bạn cung cấp! ✅

---

## 📱 Responsive Behavior

### Desktop (>768px):
- Width: 340px
- Height: 350px
- Layout: 2 cột (Footer info | Facebook widget)

### Mobile (<768px):
- Width: Auto-fit (window.innerWidth - 80px)
- Height: 350px
- Layout: 1 cột (dọc)

---

## ✨ Kết quả cuối cùng

Widget sẽ hiển thị:
- 🏢 **Tên Page**: "Hoa hồng sáp thơm tại TPHCM" (hoặc tên page của bạn)
- 👥 **Số followers**: Số người theo dõi
- 📰 **Timeline**: Các bài đăng gần đây
- ❤️ **Like Button**: Nút like trang
- 📤 **Share Button**: Nút chia sẻ
- 👤 **Facepile**: Danh sách người đã like

---

## 🚀 Next Steps

1. ✅ Vào Admin Panel
2. ✅ Bật "Hiển thị widget Facebook"
3. ✅ Nhập: `https://www.facebook.com/hoahongsapthomtaitphcm/`
4. ✅ Xem kết quả trên trang chủ!

---

## ⚠️ Lưu ý quan trọng

### URL phải chính xác:
- ✅ Đúng: `https://www.facebook.com/hoahongsapthomtaitphcm/`
- ❌ Sai: `facebook.com/hoahongsapthomtaitphcm/` (thiếu https://)
- ❌ Sai: `www.facebook.com/hoahongsapthomtaitphcm/` (thiếu https://)

### Nếu widget không hiển thị:
1. Clear cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+F5)
3. Kiểm tra console có lỗi không (F12)
4. Đảm bảo internet stable
5. Tắt AdBlock/extension block Facebook

---

**🎉 Hoàn tất!** Widget Facebook đã được cấu hình theo yêu cầu của bạn với height 350px và sẵn sàng hiển thị page **hoahongsapthomtaitphcm**!
