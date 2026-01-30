# 💰 Hướng Dẫn Sử Dụng Tính Năng Phí Ship Realtime

## 🎯 Tổng Quan

Tính năng này cho phép:
1. **Khách hàng** thấy phí ship realtime khi chọn quận
2. **Admin** tự thiết lập phí ship cho từng quận trong Admin Panel
3. **Tự động** hiển thị 50k cho tỉnh khác

---

## 📱 Phần Khách Hàng (Frontend)

### Giao Diện Đặt Hàng

Khi khách hàng đặt hàng, họ sẽ thấy:

#### 1. Toggle "Giao hàng tại TP.HCM"
- **BẬT** (mặc định): Hiển thị dropdown chọn quận
- **TẮT**: Hiển thị ô nhập địa chỉ đầy đủ (cho tỉnh khác)

#### 2. Card Phí Ship Realtime

Ngay khi chọn quận, hiển thị ngay card màu xanh lá:

```
┌─────────────────────────────────┐
│ 📊 Phí vận chuyển               │
│    Quận 1                        │
│                     25.000 ₫    │
└─────────────────────────────────┘
```

**Màu sắc:**
- 🟢 Xanh lá gradient (from-green-50 to-emerald-50)
- Border màu xanh lá nhạt
- Số tiền màu xanh đậm, font-size to (2xl)

**Logic hiển thị:**
- Chỉ hiển thị khi:
  - Đã chọn quận (HCM) HOẶC
  - Toggle sang Tỉnh khác
- Khi chưa chọn quận: "💡 Chọn quận để xem phí ship"
- Khi chọn Tỉnh khác: Hiển thị "Tỉnh khác - 50.000 ₫"

---

## 🔧 Phần Admin Panel

### Cách Thêm Vào App.tsx

Bước 1: Import component

```tsx
import ShippingFeesManager from './components/ShippingFeesManager';
```

Bước 2: Thêm tab mới trong menu Admin

```tsx
// Trong state management
const [activeTab, setActiveTab] = useState<string>('products');

// Trong UI menu
<button
  onClick={() => setActiveTab('shipping')}
  className={`px-4 py-2 rounded-lg ${activeTab === 'shipping' ? 'bg-green-500 text-white' : 'bg-gray-100'}`}
>
  💰 Phí Ship
</button>
```

Bước 3: Thêm component vào render

```tsx
{activeTab === 'shipping' && (
  <ShippingFeesManager backendUrl={BACKEND_URL} />
)}
```

### Giao Diện Admin

![Admin Panel Preview](shipping_fees_admin_panel_1769741186127.png)

**Tính năng:**

1. **Phân nhóm theo khu vực:**
   - Nội thành (trung tâm): 6 quận
   - Trung tâm mở rộng: 5 quận
   - Xa trung tâm: 5 quận
   - Xa & Thủ Đức: 3 quận
   - Huyện ngoại thành: 5 huyện

2. **Input số tiền:**
   - Nhập trực tiếp
   - Tăng/giảm theo bước 1,000đ
   - Tự động format hiển thị

3. **Thống kê nhanh:**
   - 📉 Phí thấp nhất
   - 📈 Phí cao nhất
   - 📊 Phí trung bình
   - 🗺️ Phí tỉnh khác (cố định 50k)

4. **Actions:**
   - 🔄 Tải lại: Load lại từ server
   - 💾 Lưu thay đổi: Sync lên database

---

## 🗄️ Cấu Trúc Database

### File `database.json`

Thêm field mới `shippingFees`:

```json
{
  "products": [...],
  "categories": [...],
  "settings": {...},
  "orders": [...],
  "shippingFees": {
    "Quận 1": 25000,
    "Quận 2": 30000,
    "Quận 3": 25000,
    ...
    "Huyện Cần Giờ": 70000
  }
}
```

### Default Values (lần đầu)

Nếu chưa có trong database, hệ thống tự động tạo với giá mặc định:

| Khu vực | Quận/Huyện | Phí mặc định |
|---------|-----------|-------------|
| Nội thành | Q1, Q3, Q4, Q5, Q10, Phú Nhuận | 25,000₫ |
| Trung tâm mở rộng | Q2, Q6, Q11, Bình Thạnh, Tân Bình | 30,000₫ |
| Xa trung tâm | Q7, Q8, Bình Tân, Gò Vấp, Tân Phú | 35,000₫ |
| Xa & Thủ Đức | Q9, Q12, Thủ Đức | 40,000₫ |
| Huyện | Bình Chánh, Cần Giờ, Củ Chi, Hóc Môn, Nhà Bè | 45-70k₫ |

---

## 🔌 API Endpoints

### 1. GET `/api/shipping-fees`

Lấy bảng phí ship hiện tại

**Response:**
```json
{
  "success": true,
  "fees": {
    "Quận 1": 25000,
    "Quận 2": 30000,
    ...
  }
}
```

### 2. PUT `/api/shipping-fees`

Cập nhật bảng phí ship (Admin only)

**Request:**
```json
{
  "fees": {
    "Quận 1": 28000,
    "Quận 2": 32000,
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Đã cập nhật phí vận chuyển!",
  "fees": {...}
}
```

---

## 📦 Flow Hoạt Động

### 1. Khách Hàng Đặt Hàng

```
1. Khách hàng mở modal đặt hàng
2. useEffect load shipping fees từ /api/shipping-fees
3. Khách chọn quận (ví dụ: Quận 1)
4. useEffect tính phí realtime:
   - Tìm "Quận 1" trong bảng fees
   - Set shippingFee = 25000
5. Hiển thị card: "Quận 1 - 25.000 ₫"
6. Submit đơn hàng (phí ship chỉ để hiển thị, không lưu vào order)
```

### 2. Admin Cập Nhật Phí

```
1. Admin vào tab "Phí Ship"
2. Component load fees từ /api/shipping-fees
3. Admin sửa giá (ví dụ: Quận 1 = 28000)
4. Click "Lưu thay đổi"
5. PUT /api/shipping-fees với data mới
6. Server lưu vào database.json
7. Phí mới áp dụng ngay lập tức cho đơn hàng tiếp theo
```

---

## 💡 Các Tính Năng Nâng Cao

### 1. Hiển thị Phí Ship trong Order List (Admin)

```tsx
import { calculateShippingFee } from '../utils/shippingFees';

// Trong component Order List
const order = {...}; // Order object

const shippingFee = isHCMAddress && order.district
  ? shippingFees[order.district] || 50000
  : 50000;

const totalAmount = order.productPrice + shippingFee;

<div>
  <p>Sản phẩm: {formatPrice(order.productPrice)}</p>
  <p>Phí ship ({order.district || 'Tỉnh khác'}): {formatPrice(shippingFee)}</p>
  <p className="font-bold">Tổng cộng: {formatPrice(totalAmount)}</p>
</div>
```

### 2. Filter Đơn Hàng Theo Quận

```tsx
const [selectedDistrict, setSelectedDistrict] = useState('');

const filteredOrders = orders.filter(order => {
  if (!selectedDistrict) return true;
  return order.district === selectedDistrict;
});
```

### 3. Thống Kê Doanh Thu Theo Quận

```tsx
const revenueByDistrict = orders.reduce((acc, order) => {
  const district = order.district || 'Tỉnh khác';
  if (!acc[district]) {
    acc[district] = { count: 0, revenue: 0 };
  }
  acc[district].count++;
  acc[district].revenue += order.productPrice;
  return acc;
}, {});
```

---

## 🎨 Customization

### Thay Đổi Màu Sắc

**ProductOrderModal.tsx** - Card phí ship:
```tsx
// Từ xanh lá sang màu khác
className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200"
```

**ShippingFeesManager.tsx** - Header:
```tsx
// Từ xanh lá sang màu khác
className="bg-gradient-to-r from-purple-50 to-indigo-50"
```

### Thay Đổi Phí Mặc Định Cho Tỉnh Khác

**ProductOrderModal.tsx**:
```tsx
const DEFAULT_SHIPPING_FEE = 60000; // Tăng từ 50k lên 60k
```

**ShippingFeesManager.tsx**:
```tsx
const DEFAULT_SHIPPING_FEE = 60000;
```

---

## ✅ Checklist Triển Khai

- [x] Frontend hiển thị phí ship realtime
- [x] Component quản lý phí ship cho Admin
- [x] API GET shipping fees
- [x] API PUT shipping fees
- [x] Lưu phí ship vào database
- [x] Load phí ship khi khởi động
- [x] UI đẹp mắt với animation
- [x] Phân nhóm quận theo khu vực
- [x] Thống kê quick stats
- [x] Message success/error
- [x] Default values cho lần đầu sử dụng
- [ ] Thêm vào App.tsx (bạn cần làm)
- [ ] Deploy lên production

---

## 🚀 Deploy

### Development (đang chạy)
✅ Frontend: http://localhost:3000
✅ Backend: http://localhost:3001

### Production

1. **Build frontend:**
```bash
npm run build
```

2. **Restart backend:**
```bash
pm2 restart server
# hoặc
pm2 restart all
```

3. **Kiểm tra:**
- Vào website → Thử đặt hàng → Xem phí ship
- Vào Admin → Tab "Phí Ship" → Thay đổi giá → Lưu
- Đặt hàng lại → Kiểm tra phí mới

---

## 📞 Support

Nếu gặp vấn đề:

1. **Phí ship không hiển thị:**
   - Check console log
   - Verify API `/api/shipping-fees` hoạt động
   - Kiểm tra `database.json` có field `shippingFees`

2. **Lưu không được:**
   - Check quyền write file `database.json`
   - Xem log server `node server.js`

3. **Giá không đúng:**
   - Reload trang Admin
   - Clear cache browser
   - Kiểm tra database.json bằng text editor

---

**✨ Done! Tính năng phí ship realtime với admin panel đã hoàn thiện!**

Developed by **Antigravity** 🤖
