# Hướng dẫn sử dụng Tracking Codes (Google Ads & Analytics)

## ✅ Đã hoàn thành

### 1. **Admin Settings - Tracking Codes Section**

Đã thêm section mới trong Admin Panel → Settings với các trường:

- 🔍 **Google Analytics 4 (GA4)** - Measurement ID (G-XXXXXXXXXX)
- 🏷️ **Google Tag Manager (GTM)** - Container ID (GTM-XXXXXXX)
- 🎯 **Google Ads Conversion ID** - (AW-XXXXXXXXX)
- 🏁 **Google Ads Conversion Label** - Tracking label cho sự kiện "Đặt hàng"
- 📘 **Facebook Pixel ID** - Meta Ads tracking

### 2. **Tracking Scripts**

Đã tạo các utility files:
- `utils/tracking.ts` - Full tracking implementation với TypeScript
- `utils/trackingInjector.ts` - Simple script injector

### 3. **Auto-inject Scripts**

Scripts sẽ tự động được inject vào `<head>` khi:
- Admin nhập mã tracking vào Settings
- Lưu settings (onBlur hoặc click Save)

---

## 📝 Hướng dẫn cấu hình

### **Bước 1: Lấy mã tracking**

#### **Google Analytics 4 (GA4)**
1. Truy cập: https://analytics.google.com
2. Chọn Admin → Property → Data Streams
3. Chọn web stream  
4. Copy **Measurement ID** (`G-XXXXXXXXXX`)

#### **Google Tag Manager (GTM)**
1. Tr cập: https://tagmanager.google.com
2. Tạo Container mới hoặc chọn container hiện tại
3. Copy **Container ID** (`GTM-XXXXXXX`)

#### **Google Ads Conversion**
1. Truy cập: https://ads.google.com
2. Tools → Conversions
3. Create Conversion Action (chọn "Website")
4. Tạo conversion "Purchase" hoặc "Submit Lead Form"
5. Copy:
   - **Conversion ID**: `AW-123456789`
   - **Conversion Label**: `abcdEFGH123_xyz`

#### **Facebook Pixel**
1. Truy cập: https://business.facebook.com/events_manager2
2. Chọn Pixel hoặc tạo mới
3. Copy **Pixel ID** (15-16 số)

---

### **Bước 2: Nhập vào Admin Settings**

1. Vào **Admin Panel** → Tab **"Cài đặt"**
2. Scroll xuống phần **"📈 Mã theo dõi quảng cáo & Analytics"**
3. Nhập các mã vừa lấy được:
   ```
   Google Analytics 4: G-ABC123XYZ
   Google Tag Manager: GTM-ABC12XY
   Google Ads Conversion ID: AW-987654321
   Google Ads Conversion Label: purchase_xyz123
   Facebook Pixel ID: 123456789012345
   ```

4. **Click ra ngoài** (onBlur) hoặc nhấn Save để lưu

---

### **Bước 3: Kiểm tra tracking hoạt động**

#### **Test Google Analytics (GA4)**
1. Mở website trên trình duyệt
2. Mở DevTools (F12) → Console
3. Kiểm tra log: `📊 GA4 loaded: G-XXXXXXXXXX`
4. Vào GA4 Realtime Report để xem traffic

#### **Test Google Tag Manager**
1. Mở website
2. Console log: `📊 GTM loaded: GTM-XXXXXXX`
3. Dùng GTM Preview Mode để debug

#### **Test Facebook Pixel**
1. Cài extension [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
2. Mở website, icon sẽ bật xanh nếu pixel hoạt động
3. Console log: `📘 Facebook Pixel loaded: 123456789012345`

---

## 🎯 Conversion Tracking (Khi khách đặt hàng)

### **Tự động tracking khi đặt hàng thành công:**

Khi khách click "Đặt hàng" và đơn hàng được lưu thành công, hệ thống sẽ tự động gọi:

```javascript
trackConversion(globalSettings, totalPrice);
```

**Sự kiện được gửi:**
- ✅ Google Ads Conversion (với giá trị đơn hàng)
- ✅ Facebook Pixel "Purchase" event
- ✅ GA4 "purchase" event

**Console logs:**
```
🎯 Google Ads Conversion tracked: 500000
📘 Facebook Pixel Purchase tracked: 500000
📊 GA4 Purchase tracked: 500000
```

---

## 🔄 Cách tích hợp vào code

### **1. Import tracking injector**

Trong `App.tsx`, thêm import:
```typescript
import { injectTrackingScripts, trackConversion } from './utils/trackingInjector';
```

### **2. Inject scripts khi load settings**

Thêm vào nơi khởi tạo `globalSettings` hoặc sau khi load từ database:

```typescript
// After fetching globalSettings from server/localStorage
useEffect(() => {
  injectTrackingScripts(globalSettings);
}, [globalSettings.googleAnalyticsId, globalSettings.googleTagManagerId, 
    globalSettings.googleAdsConversionId, globalSettings.facebookPixelId]);
```

### **3. Track conversion khi đặt hàng**

Trong `ProductOrderModal.tsx` hoặc component xử lý đơn hàng:

```typescript
// When order submitted successfully
if (response.ok) {
  // Track conversion
  trackConversion(globalSettings, finalTotalPrice);
  
  // Show success message
  setShowSuccessScreen(true);
}
```

---

## 📊 Data được tracking

### **Google Analytics (GA4)**
- ✅ Lượt xem trang (Page Views)
- ✅ Sự kiện đặt hàng (Purchase Event)
- ✅ Giá trị đơn hàng (Transaction Value)

### **Google Ads**
- ✅ Conversion khi đặt hàng
- ✅ ROAS (Return on Ad Spend)
- ✅ Attribution tracking (nguồn traffic)

### **Facebook Pixel**
- ✅ PageView events
- ✅ Purchase events
- ✅ Custom Audiences retargeting

---

## ⚡ Troubleshooting

### **Tracking không hoạt động?**
1. Check Console logs (F12) để xem có load scripts không
2. Verify mã tracking nhập đúng format
3. Check Ad Blockers có chặn scripts không
4. Clear cache và refresh

### **Conversion không được ghi nhận?**
1. Verify Google Ads Conversion Label đã nhập đúng
2. Check thời gian delay (có thể mất 1-2 giờ để hiển thị trong Google Ads)
3. Test bằng Google Ads Tag Assistant

---

## 🎓 Best Practices

1. **Google Tag Manager** (recommended) - Dùng GTM để quản lý tất cả tags thay vì nhập trực tiếp GA4, Ads, FB Pixel
2. **Test Mode** - Dùng Preview Mode của GTM hoặc GA4 trước khi go-live
3. **Data Layer** - Gửi thêm thông tin chi tiết (product name, category) vào data layer
4. **Privacy** - Tuân thủ GDPR/cookie consent nếu có khách quốc tế

---

## 📞 Support

Nếu gặp vấn đề, check:
- Google Analytics Help: https://support.google.com/analytics
- Google Ads Help: https://support.google.com/google-ads
- Facebook Business Help: https://www.facebook.com/business/help

---

**📅 Created:** 2026-02-02  
**👤 By:** Antigravity AI Assistant
