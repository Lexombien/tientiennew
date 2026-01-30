# ⚡ Quick Guide: Thêm Shipping Fees Manager vào Admin Panel

## Bước 1: Import Component

Thêm vào đầu file `App.tsx`:

```tsx
import ShippingFeesManager from './components/ShippingFeesManager';
```

## Bước 2: Thêm State cho Tab (NẾU CHƯA CÓ)

Nếu App.tsx chưa có tab system, bỏ qua bước này.

```tsx
const [adminTab, setAdminTab] = useState('products'); // hoặc tên tab tương tự
```

## Bước 3: Thêm Button Vào Menu Admin

Tìm phần menu Admin (nơi có các button như "Sản phẩm", "Đơn hàng"...) và thêm:

```tsx
<button
  onClick={() => setAdminTab('shipping')}
  className={`px-6 py-3 rounded-lg font-semibold transition-all ${
    adminTab === 'shipping'
      ? 'bg-green-500 text-white shadow-lg'
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`}
>
  💰 Phí Ship
</button>
```

## Bước 4: Thêm Component Vào Render

Tìm phần conditional rendering của Admin (dạng `{adminTab === '...' && ...}`), thêm:

```tsx
{adminTab === 'shipping' && (
  <div className="p-6">
    <ShippingFeesManager backendUrl={BACKEND_URL} />
  </div>
)}
```

## HOẶC: Cách Đơn Giản Hơn (Nếu App.tsx phức tạp)

Tạo một route riêng `/admin/shipping`:

```tsx
// Trong routing logic
if (window.location.hash === '#admin-shipping') {
  return <ShippingFeesManager backendUrl={BACKEND_URL} />;
}
```

Sau đó truy cập: `http://localhost:3000/#admin-shipping`

---

## Test

1. Restart frontend (Ctrl+C → `npm run dev`)
2. Vào Admin Panel
3. Click nút "💰 Phí Ship"
4. Thử thay đổi giá → Lưu
5. Vào phần đặt hàng → Chọn quận → Xem phí ship

✅ Done!
