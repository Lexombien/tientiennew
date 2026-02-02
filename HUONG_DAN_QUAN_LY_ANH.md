# 🎨 Hướng dẫn Sắp xếp và Quản lý Ảnh Sản phẩm

## ✨ Tính năng mới đã thêm

### 1. 🔀 Kéo thả để sắp xếp ảnh
- **Cách sử dụng**: Di chuột vào ảnh bất kỳ, nhấn và giữ vào biểu tượng **kẻ ngang màu xanh** (≡) ở góc trên bên trái
- **Kéo thả**: Kéo ảnh sang vị trí mong muốn và thả ra
- **Quy tắc hiển thị**: 
  - ✅ **Ảnh bên TRÁI nhất** sẽ hiển thị **ĐẦU TIÊN** trên trang chủ
  - ✅ Thứ tự từ trái sang phải = thứ tự carousel trên trang chủ
  - ✅ Trong chế độ admin, luôn hiển thị ảnh đầu tiên (thumbnail)

### 2. 📚 Chọn ảnh từ thư viện
- **Nút "📚 Chọn từ thư viện"**: Mở modal thư viện ảnh đã upload
- **Lợi ích**: 
  - Không cần upload lại ảnh đã có
  - Tiết kiệm băng thông và dung lượng server
  - Tìm kiếm nhanh theo tên file
- **Cách dùng**:
  1. Nhấn "📚 Chọn từ thư viện"
  2. Tìm kiếm hoặc chọn ảnh (có thể chọn nhiều ảnh)
  3. Nhấn "Thêm (n)" để thêm vào sản phẩm

### 3. 🖼️ Giao diện Grid View
- **Hiển thị**: Lưới 2-3-5 cột tùy kích thước màn hình
- **Badge "Ảnh 1, 2, 3..."**: Hiển thị thứ tự ảnh
- **Biểu tượng Drag**: Icon ≡ màu xanh góc trái
- **Nút xóa**: Icon ✕ màu đỏ góc phải (chỉ hiện khi hover)

## 🎯 Quy trình làm việc khuyến nghị

### Thêm sản phẩm mới
1. Nhập thông tin cơ bản (Tên, giá, danh mục)
2. **Chọn ảnh**:
   - Nếu ảnh đã có trong thư viện → "📚 Chọn từ thư viện"
   - Nếu ảnh mới → "+ Tải ảnh mới"
3. **Sắp xếp thứ tự**: Kéo thả ảnh để sắp xếp
   - Ảnh CHÍNH (hiển thị đầu) đặt ở **vị trí TRÁI NHẤT**
4. Gán biến thể (nếu có)
5. Lưu sản phẩm

### Chỉnh sửa sản phẩm
1. Nhấn icon ✏️ trên card sản phẩm (chế độ admin)
2. Kéo thả để đổi thứ tự ảnh
3. Thêm/xóa ảnh theo nhu cầu
4. Lưu thay đổi

## 🔧 Kỹ thuật triển khai

### Dependencies mới
- `@dnd-kit/core`: Core drag-and-drop engine
- `@dnd-kit/sortable`: Sortable list functionality
- `@dnd-kit/utilities`: Helper utilities

### Components
- **MediaLibraryPicker.tsx**: Modal chọn ảnh từ thư viện
- **SortableImageItem**: Item component hỗ trợ drag-and-drop (trong ProductFormModal)

### State Management
- Thứ tự ảnh được lưu trong `imagesWithMetadata` array
- Kéo thả trigger `handleDragEnd` → cập nhật array
- Đồng bộ với `images` array (URL only)

## 📝 Lưu ý quan trọng

⚠️ **Thứ tự ảnh ảnh hưởng đến**:
- Ảnh hiển thị đầu tiên trên trang chủ
- Thumbnail trong danh sách sản phẩm (admin)
- Thứ tự carousel khi khách hàng xem

✅ **Best Practices**:
- Đặt ảnh đẹp nhất, rõ nét nhất ở **VỊ TRÍ ĐẦU TIÊN** (trái nhất)
- Sử dụng thư viện để tái sử dụng ảnh
- Đặt tên file ảnh có ý nghĩa để dễ tìm

## 🐛 Troubleshooting

**Q: Tại sao ảnh không kéo được?**
- A: Đảm bảo di chuột vào icon ≡ màu xanh, KHÔNG kéo trực tiếp vào ảnh

**Q: Ảnh hiển thị sai thứ tự trên trang chủ?**
- A: Kiểm tra lại thứ tự trong modal edit. Ảnh TRÁI NHẤT = Ảnh ĐẦU TIÊN

**Q: Không thấy ảnh trong thư viện?**
- A: Ảnh phải được upload ít nhất 1 lần qua "+ Tải ảnh mới" trước

---

**Phiên bản**: 2.0  
**Ngày cập nhật**: 2026-02-02
