# Tính năng Chọn Quận HCM cho Phí Ship

## 📋 Tổng quan

Tính năng này cho phép khách hàng chọn quận/huyện khi đặt hàng tại TP.HCM, giúp bạn dễ dàng tính phí ship theo từng khu vực.

## 🎯 Tính năng chính

### 1. **Toggle "Giao hàng tại TP.HCM"**
- Mặc định: **BẬT** (người dùng ở HCM)
- Khi BẬT: Hiển thị dropdown chọn quận/huyện
- Khi TẮT: Chỉ hiển thị ô nhập địa chỉ đầy đủ (cho tỉnh khác)

### 2. **Dropdown chọn Quận/Huyện**
Danh sách 24 quận/huyện TP.HCM:
- Quận 1-12
- Quận Bình Tân, Bình Thạnh, Gò Vấp, Phú Nhuận, Tân Bình, Tân Phú, Thủ Đức
- Huyện Bình Chánh, Cần Giờ, Củ Chi, Hóc Môn, Nhà Bè

### 3. **Ô nhập địa chỉ thông minh**
- **Khi chọn HCM**: Placeholder = "Địa chỉ chi tiết (Số nhà, đường, phường...)"
- **Khi chọn Tỉnh khác**: Placeholder = "Địa chỉ đầy đủ (Số nhà, đường, phường, quận/huyện, tỉnh/thành phố)"

## 📊 Dữ liệu lưu trong Database

Mỗi đơn hàng sẽ có thêm 2 trường:

```json
{
  "orderId": "1234567890",
  "orderNumber": "#0001",
  "customerName": "Nguyễn Văn A",
  "customerPhone": "0912345678",
  "customerAddress": "123 Nguyễn Huệ, Phường Bến Nghé",
  "isHCMAddress": true,           // ← MỚI: true = HCM, false = Tỉnh khác
  "district": "Quận 1",           // ← MỚI: Quận được chọn (chỉ có khi isHCMAddress = true)
  "productName": "Hoa Hồng Ecuador",
  "productPrice": 500000,
  // ... các field khác
}
```

## 📱 Message Zalo Bot

Khi có đơn hàng HCM, admin sẽ nhận message:

```
🛒 === ĐƠN HÀNG MỚI ===

👤 Người nhận: Nguyễn Văn A
📞 SĐT nhận: 0912345678
📍 Quận/Huyện: Quận 1          ← Hiển thị quận
🏠 Địa chỉ: 123 Nguyễn Huệ, Phường Bến Nghé

━━━━━━━━━━━━━━

📦 Sản phẩm: Hoa Hồng Ecuador
💰 Giá: 500.000 ₫
⚡ Giao hàng: Giao liền (Càng sớm càng tốt)

⏰ Thời gian: 30/01/2026, 09:30:00
```

## 💡 Cách sử dụng để tính phí ship

### Bước 1: Xem đơn hàng trong Admin Panel

Bạn có thể filter đơn hàng theo quận bằng cách:

```javascript
// Trong App.tsx (Admin Panel), thêm filter theo quận:
const filteredOrders = orders.filter(order => {
  if (selectedDistrict && order.isHCMAddress) {
    return order.district === selectedDistrict;
  }
  return true;
});
```

### Bước 2: Tạo bảng phí ship theo quận

Tạo file `shippingFees.ts`:

```typescript
export const HCM_SHIPPING_FEES: Record<string, number> = {
  'Quận 1': 25000,
  'Quận 2': 30000,
  'Quận 3': 25000,
  'Quận 4': 25000,
  'Quận 5': 25000,
  'Quận 6': 30000,
  'Quận 7': 35000,
  'Quận 8': 35000,
  'Quận 9': 40000,
  'Quận 10': 25000,
  'Quận 11': 30000,
  'Quận 12': 40000,
  'Quận Bình Tân': 35000,
  'Quận Bình Thạnh': 30000,
  'Quận Gò Vấp': 35000,
  'Quận Phú Nhuận': 25000,
  'Quận Tân Bình': 30000,
  'Quận Tân Phú': 35000,
  'Quận Thủ Đức': 40000,
  'Huyện Bình Chánh': 50000,
  'Huyện Cần Giờ': 70000,
  'Huyện Củ Chi': 60000,
  'Huyện Hóc Môn': 50000,
  'Huyện Nhà Bè': 45000,
};

export const DEFAULT_SHIPPING_FEE = 50000; // Cho tỉnh khác

export function calculateShippingFee(order: Order): number {
  if (order.isHCMAddress && order.district) {
    return HCM_SHIPPING_FEES[order.district] || DEFAULT_SHIPPING_FEE;
  }
  return DEFAULT_SHIPPING_FEE;
}
```

### Bước 3: Hiển thị phí ship trong Admin Panel

```typescript
// Trong Order List Component
const shippingFee = calculateShippingFee(order);
const totalAmount = order.productPrice + shippingFee;

<div>
  <p>Giá sản phẩm: {formatPrice(order.productPrice)}</p>
  <p>Phí ship ({order.district || 'Tỉnh khác'}): {formatPrice(shippingFee)}</p>
  <p className="font-bold">Tổng cộng: {formatPrice(totalAmount)}</p>
</div>
```

## 🔧 Validation

Form sẽ validate:
- ✅ Nếu chọn HCM → **BẮT BUỘC** chọn quận
- ✅ Nếu chọn Tỉnh khác → Không cần chọn quận
- ✅ Địa chỉ chi tiết luôn bắt buộc

## 🎨 UI/UX

- **Toggle switch**: Màu xanh dương gradient (blue-50 to indigo-50)
- **Dropdown**: Rounded-xl với border xanh nhạt
- **Animation**: Smooth fadeIn khi toggle
- **Responsive**: Hoạt động tốt trên mobile và desktop

## 📝 Ghi chú

- Có thể dễ dàng thêm/bớt quận bằng cách sửa array `HCM_DISTRICTS` trong `ProductOrderModal.tsx`
- Phí ship có thể điều chỉnh trong file `shippingFees.ts` (cần tạo)
- Database tự động lưu thông tin quận, không cần migration

## 🚀 Deploy

Khi deploy lên production:

1. Build frontend: `npm run build`
2. Restart server: `pm2 restart all`
3. Tất cả đơn hàng cũ sẽ có `isHCMAddress = undefined`, có thể coi như tỉnh khác

---

**✨ Tính năng này giúp bạn:**
- Tính phí ship chính xác hơn
- Sắp xếp lộ trình giao hàng theo quận
- Filter và thống kê đơn hàng theo khu vực
- Báo giá nhanh cho khách hàng qua Zalo

**Developed by Antigravity** 🤖
