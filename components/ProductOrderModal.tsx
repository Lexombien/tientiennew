import React, { useState, useEffect } from 'react';
import { FlowerProduct } from '../types';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { vi } from 'date-fns/locale';
import '../styles/datepicker-custom.css';
import { trackConversion } from '../utils/trackingInjector';

registerLocale('vi', vi);

interface ProductOrderModalProps {
  product: FlowerProduct;
  onClose: () => void;
  mediaMetadata?: Record<string, { alt?: string, title?: string, description?: string }>;
  onImageClick?: (images: { url: string, alt: string }[], index: number, productInfo?: any) => void;
  globalSettings?: any;
}

const ProductOrderModal: React.FC<ProductOrderModalProps> = ({ product, onClose, mediaMetadata = {}, onImageClick, globalSettings }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isGiftMode, setIsGiftMode] = useState(false); // Tặng người khác mode
  const [showSuccessScreen, setShowSuccessScreen] = useState(false); // Success screen
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    note: '',
    // Thông tin người tặng (chỉ hiện khi isGiftMode = true)
    senderName: '',
    senderPhone: ''
  });
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null); // Selected variant ID
  const [isCardOption, setIsCardOption] = useState(false); // Ghi thiệp / Bảng chữ
  const [cardType, setCardType] = useState<'card' | 'banner'>('card');
  const [cardContent, setCardContent] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'instant' | 'scheduled'>('instant');
  const [deliveryTime, setDeliveryTime] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  // Address configuration - HCM or Other Province
  const [isHCMAddress, setIsHCMAddress] = useState(true); // Mặc định là HCM
  const [district, setDistrict] = useState(''); // Quận được chọn
  const [shippingFee, setShippingFee] = useState(0); // Phí ship realtime
  const [shippingFees, setShippingFees] = useState<Record<string, number>>({}); // Bảng phí ship từ DB
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'transfer'>('transfer'); // Phương thức thanh toán mặc định là chuyển khoản
  const [busyInterval, setBusyInterval] = useState(30); // NEW: Interval thời gian (mặc định 30ph)
  const [deliverySession, setDeliverySession] = useState<string | null>(null); // NEW: Khung giờ buổi (Sáng/Trưa/Chiều/Tối)

  // 🆕 Tự động chuyển sang Chuyển khoản khi bật chế độ Gửi tặng
  useEffect(() => {
    if (isGiftMode) {
      setPaymentMethod('transfer');
    }
  }, [isGiftMode]);

  // Coupon states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, percent: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Danh sách các quận ở TP.HCM
  const HCM_DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Quận Bình Tân', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận',
    'Quận Tân Bình', 'Quận Tân Phú', 'Quận Thủ Đức', 'Huyện Bình Chánh', 'Huyện Cần Giờ',
    'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè'
  ];

  const DEFAULT_SHIPPING_FEE = 50000; // Phí ship mặc định cho tỉnh khác

  // Load shipping fees từ database
  useEffect(() => {
    const loadShippingFees = async () => {
      try {
        const backendUrl = window.location.hostname === 'localhost'
          ? `http://${window.location.hostname}:3001`
          : '';
        const response = await fetch(`${backendUrl}/api/shipping-fees`);
        if (response.ok) {
          const data = await response.json();
          setShippingFees(data.fees || {});
          // Update default shipping fee nếu có
          if (data.defaultShippingFee) {
            setShippingFee(prev => !isHCMAddress && !district ? data.defaultShippingFee : prev);
          }
        }
      } catch (error) {
        console.error('Error loading shipping fees:', error);
      }
    };
    loadShippingFees();

    // Load busy mode interval from settings
    try {
      const savedSettings = localStorage.getItem('global_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.holidayMode) {
          setBusyInterval(parsed.holidayInterval || 120);
        } else {
          setBusyInterval(30);
        }
      }
    } catch (e) {
      console.error('Error loading busy interval:', e);
    }
  }, []);

  // Tính phí ship realtime khi chọn quận hoặc toggle HCM
  useEffect(() => {
    const calculateFee = async () => {
      if (isHCMAddress && district) {
        // Lấy phí từ database, nếu không có thì dùng default
        const fee = shippingFees[district] || DEFAULT_SHIPPING_FEE;
        setShippingFee(fee);
      } else if (!isHCMAddress) {
        // Tỉnh khác: Load từ DB hoặc dùng default
        try {
          const backendUrl = window.location.hostname === 'localhost'
            ? `http://${window.location.hostname}:3001`
            : '';
          const response = await fetch(`${backendUrl}/api/shipping-fees`);
          if (response.ok) {
            const data = await response.json();
            setShippingFee(data.defaultShippingFee || DEFAULT_SHIPPING_FEE);
          } else {
            setShippingFee(DEFAULT_SHIPPING_FEE);
          }
        } catch (error) {
          setShippingFee(DEFAULT_SHIPPING_FEE);
        }
      } else {
        // Chưa chọn quận
        setShippingFee(0);
      }
    };
    calculateFee();
  }, [isHCMAddress, district, shippingFees]);

  // Get Zalo link from localStorage or use default
  const getZaloLink = () => {
    try {
      const settings = localStorage.getItem('global_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        const phone = parsed.phoneNumber || '0900000000';
        return `https://zalo.me/${phone}`;
      }
    } catch {
      // Ignore
    }
    return 'https://zalo.me/0900000000';
  };

  // Get images with metadata
  const getFilenameFromUrl = (url: string) => {
    try {
      const parts = url.split('/');
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return '';
    }
  };

  const imagesToDisplay = (product.imagesWithMetadata && product.imagesWithMetadata.length > 0
    ? product.imagesWithMetadata
    : product.images.map(url => ({ url, alt: product.title, title: product.title })))
    .map(img => {
      const filename = getFilenameFromUrl(img.url);
      const meta = mediaMetadata[filename];
      return {
        ...img,
        alt: meta?.alt || img.alt || product.title,
        title: meta?.title || img.title || product.title
      };
    });

  // 🆕 Auto-select first variant when modal opens
  useEffect(() => {
    const visibleVariants = product.variants?.filter(v => !v.isHidden) || [];
    if (visibleVariants.length > 0 && !selectedVariant) {
      setSelectedVariant(visibleVariants[0].id);
    }
  }, [product.variants]);

  // Auto-switch image when variant is selected
  useEffect(() => {
    if (selectedVariant && product.imagesWithMetadata) {
      // Find first image with matching variantId
      const variantImageIndex = product.imagesWithMetadata.findIndex(
        img => img.variantId === selectedVariant
      );

      if (variantImageIndex !== -1) {
        setCurrentImageIndex(variantImageIndex);
      }
    }
  }, [selectedVariant, product.imagesWithMetadata]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Tính toán giảm giá
  const discountAmount = appliedCoupon ? Math.floor(product.salePrice * (appliedCoupon.percent / 100)) : 0;
  const finalTotalPrice = product.salePrice + shippingFee - discountAmount;

  const handleApplyCoupon = () => {
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    try {
      const savedSettings = localStorage.getItem('global_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        const coupons = parsed.coupons || [];
        const found = coupons.find((c: any) => c.code === code);

        if (found) {
          setAppliedCoupon({ code: found.code, percent: found.discountPercent });
          setCouponInput('');
        } else {
          setCouponError('❌ Mã giảm giá không hợp lệ!');
          setAppliedCoupon(null);
        }
      }
    } catch (e) {
      console.error('Error applying coupon:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.phone || !formData.address) {
      setSubmitMessage('Vui lòng điền đầy đủ thông tin người nhận!');
      return;
    }

    // Validate district for HCM address
    if (isHCMAddress && !district) {
      setSubmitMessage('Vui lòng chọn Quận/Huyện tại TP.HCM!');
      return;
    }

    if (isGiftMode && (!formData.senderName || !formData.senderPhone)) {
      setSubmitMessage('Vui lòng điền đầy đủ thông tin người tặng!');
      return;
    }

    // NEW: Validation for Delivery Time & Session
    if (deliveryMode === 'scheduled') {
      if (!deliveryTime) {
        setSubmitMessage('Vui lòng chọn ngày giao hàng!');
        return;
      }
      if (globalSettings?.holidayTimeBlockMode && !deliverySession) {
        setSubmitMessage('Vui lòng chọn Buổi giao hàng (Sáng/Trưa/Chiều/Tối)!');
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const response = await fetch('/api/submit-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productName: product.title,
          productId: product.id,
          productPrice: product.salePrice,
          customerName: formData.name,
          customerPhone: formData.phone,
          customerAddress: formData.address,
          note: formData.note,
          // Thông tin địa chỉ HCM
          isHCMAddress,
          district: isHCMAddress ? district : undefined,
          // Thông tin người tặng (nếu có)
          isGift: isGiftMode,
          senderName: isGiftMode ? formData.senderName : undefined,
          senderPhone: isGiftMode ? formData.senderPhone : undefined,
          // Thông tin biến thể (nếu có)
          variantId: selectedVariant,
          variantName: selectedVariant
            ? product.variants?.find(v => v.id === selectedVariant)?.name
            : undefined,
          variantSKU: selectedVariant
            ? product.variants?.find(v => v.id === selectedVariant)?.sku || product.sku
            : product.sku,
          // Thông tin thiệp/bảng chữ (nếu có)
          isCard: isCardOption,
          cardType: isCardOption ? cardType : undefined,
          cardContent: isCardOption ? cardContent : undefined,
          // Thông tin giao hàng
          deliveryMode,
          deliveryTime: deliveryMode === 'scheduled' ? deliveryTime : undefined,
          deliverySession: deliveryMode === 'scheduled' ? deliverySession : undefined,
          // Thông tin thanh toán
          paymentMethod,
          shippingFee,
          totalPrice: finalTotalPrice,
          couponCode: appliedCoupon?.code,
          discountAmount: discountAmount,
          productImage: (product.imagesWithMetadata && product.imagesWithMetadata.length > 0)
            ? product.imagesWithMetadata[0].url
            : (product.images?.[0] || '')
        })
      });

      // Check if response is OK before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error:', response.status, errorText);
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Track conversion for Google Ads, Facebook Pixel, GA4
        console.log('🔍 DEBUG: Calling trackConversion with:', {
          googleAdsId: globalSettings?.googleAdsConversionId,
          googleAdsLabel: globalSettings?.googleAdsConversionLabel,
          fbPixel: globalSettings?.facebookPixelId,
          ga4: globalSettings?.googleAnalyticsId,
          orderValue: finalTotalPrice
        });
        trackConversion(globalSettings, finalTotalPrice);

        setShowSuccessScreen(true); // Show success screen instead of message
      } else {
        setSubmitMessage('❌ Có lỗi xảy ra. Vui lòng thử lại!');
      }
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitMessage('❌ Không thể gửi đơn hàng. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Screen
  if (showSuccessScreen) {
    // Check if payment method is transfer to show QR code
    const isTransferPayment = paymentMethod === 'transfer';

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 z-50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto" onClick={onClose}>
        <div
          className="bg-white rounded-3xl max-w-2xl w-full p-8 md:p-12 text-center shadow-2xl animate-slideUp my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Thank You Message */}
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            🎉 Cảm ơn bạn đã đặt hàng!
          </h2>

          <p className="text-lg text-gray-700 mb-2 font-semibold">
            Đơn hàng của bạn đã được gửi thành công!
          </p>

          {/* QR Code Section - Only show for Transfer Payment */}
          {isTransferPayment && (
            <div className="my-8 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-blue-200 animate-fadeIn">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-3">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-blue-700 mb-2">
                  📱 Quét mã để chuyển khoản
                </h3>
                <p className="text-sm text-blue-600 font-medium">
                  Số tiền: <span className="text-xl font-black text-pink-600">{formatPrice(finalTotalPrice)}</span>
                </p>
              </div>

              {/* QR Code Image */}
              {globalSettings?.bankQRCode ? (
                <div className="bg-white p-6 rounded-2xl shadow-2xl inline-block mb-4">
                  <img
                    src={globalSettings.bankQRCode}
                    alt="QR Code chuyển khoản"
                    className="w-80 h-80 object-contain mx-auto"
                  />
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl shadow-lg inline-block mb-4">
                  <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-400 text-sm text-center px-4">
                      Chưa cài đặt QR Code<br />
                      <span className="text-xs">(Vào Admin → Cài đặt để upload)</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Bank Account Details - Display clearly for manual transfer */}
              {globalSettings?.bankAccountNumber && globalSettings?.bankName && (
                <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200">
                  <p className="text-xs font-bold text-blue-700 mb-3 text-center">
                    📋 Thông tin chuyển khoản:
                  </p>
                  <div className="space-y-2 bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Ngân hàng:</span>
                      <span className="text-sm font-bold text-gray-900">{globalSettings.bankName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Số TK:</span>
                      <span className="text-sm font-bold text-gray-900">{globalSettings.bankAccountNumber}</span>
                    </div>
                    {globalSettings.bankAccountName && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Chủ TK:</span>
                        <span className="text-sm font-bold text-gray-900">{globalSettings.bankAccountName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-xs text-gray-600">Số tiền:</span>
                      <span className="text-lg font-black text-pink-600">{formatPrice(finalTotalPrice)}</span>
                    </div>
                  </div>


                  {/* Deep Link to Banking App - Primary Action */}
                  <button
                    onClick={() => {
                      const amount = Math.floor(finalTotalPrice);
                      const message = encodeURIComponent(`Thanh toan don hang`);
                      const accountName = encodeURIComponent(globalSettings.bankAccountName || '');
                      const vietqrLink = `https://img.vietqr.io/image/${globalSettings.bankCode}-${globalSettings.bankAccountNumber}-compact2.jpg?amount=${amount}&addInfo=${message}&accountName=${accountName}`;
                      window.open(vietqrLink, '_blank');
                    }}
                    className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 active:scale-95 animate-pulse"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    Mở App Ngân Hàng Chuyển Khoản
                  </button>

                  {/* Copy Button as backup */}
                  <button
                    onClick={() => {
                      const textToCopy = `${globalSettings.bankName}\nSTK: ${globalSettings.bankAccountNumber}\nTên: ${globalSettings.bankAccountName || ''}\nSố tiền: ${formatPrice(finalTotalPrice)}`;
                      navigator.clipboard.writeText(textToCopy).then(() => {
                        alert('✅ Đã copy thông tin chuyển khoản!');
                      });
                    }}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-lg transition-all hover:scale-105 active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Hoặc Copy thông tin TK
                  </button>
                </div>
              )}

              {/* Transfer Instructions */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-white font-bold text-lg">!</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-amber-800 mb-2">
                      📸 Sau khi chuyển khoản xong:
                    </p>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      Vui lòng <span className="font-black underline">chụp ảnh màn hình</span> xác nhận chuyển khoản và gửi qua Zalo: <span className="font-black text-blue-600">0567899996</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isTransferPayment && (
            <p className="text-gray-600 mb-8">
              Chúng tôi sẽ liên hệ với bạn sớm nhất qua <span className="font-bold text-blue-600">Zalo</span> hoặc <span className="font-bold text-green-600">Gọi điện</span> để xác nhận đơn hàng.
            </p>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={isTransferPayment ? "https://zalo.me/0567899996" : getZaloLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.896 1.372 5.515 3.564 7.302V22l3.37-1.854c.958.27 1.969.416 3.022.416 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2z" />
              </svg>
              {isTransferPayment ? "Gửi ảnh CK qua Zalo" : "Liên hệ Zalo ngay"}
            </a>

            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              Trở về
            </button>
          </div>

          {/* Decorative Elements */}
          <div className="mt-8 flex justify-center gap-2">
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0s' }}>🎁</span>
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>💐</span>
            <span className="text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
          </div>
        </div>
      </div>
    );
  }

  // Order Form Screen
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col animate-slideUp overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md text-gray-500 hover:bg-white hover:text-gray-800 shadow-sm border border-gray-100 transition-all flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 scrollbar-hide">
          <div className="p-5 space-y-6">

            {/* Fixed Square Gallery for Compact Design */}
            <div className="space-y-2">
              <div
                className="relative aspect-square rounded-3xl overflow-hidden bg-gray-50 group cursor-zoom-in shadow-inner border border-gray-100"
                onClick={() => {
                  if (onImageClick) {
                    onImageClick(imagesToDisplay, currentImageIndex, {
                      title: product.title,
                      sku: product.sku,
                      variants: product.variants
                    });
                  }
                }}
              >
                {imagesToDisplay.map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={img.alt}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-in-out group-hover:scale-110 ${idx === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                  />
                ))}

                {/* Navigation Arrows (Overlay) */}
                {imagesToDisplay.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + imagesToDisplay.length) % imagesToDisplay.length); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white transition-all flex items-center justify-center z-10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % imagesToDisplay.length); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm text-white transition-all flex items-center justify-center z-10"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>

                    {/* Dots indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {imagesToDisplay.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'w-5 bg-white shadow-md' : 'w-1.5 bg-white/40'}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              <p className="text-[11px] text-gray-400 text-center font-medium italic animate-pulse">
                🔍 Click vào ảnh để xem ảnh đầy đủ
              </p>
            </div>

            {/* Product Title & Price (Moved below Image) */}
            <div className="mt-2">
              <h2 className="text-xl font-bold text-gray-900 leading-snug" style={{ fontFamily: 'var(--font-title)' }}>{product.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-xl font-bold text-pink-600" style={{ fontFamily: 'var(--font-price)' }}>{formatPrice(product.salePrice)}</p>
                {product.originalPrice > product.salePrice && (
                  <p className="text-base text-gray-400 line-through font-medium" style={{ fontFamily: 'var(--font-price)' }}>
                    {formatPrice(product.originalPrice)}
                  </p>
                )}
              </div>
            </div>

            {/* Variants */}
            {(() => {
              const visibleVariants = product.variants?.filter(v => !v.isHidden) || [];
              if (visibleVariants.length === 0) return null;

              return (
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="text-lg">🎨</span> Chọn mẫu
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {visibleVariants.map((variant) => (
                      <label
                        key={variant.id}
                        className={`relative cursor-pointer rounded-xl border-2 p-3 transition-all ${selectedVariant === variant.id
                          ? 'border-pink-500 bg-pink-50/50'
                          : 'border-gray-100 hover:border-pink-200 bg-white'
                          }`}
                      >
                        <input
                          type="radio"
                          name="variant"
                          value={variant.id}
                          checked={selectedVariant === variant.id}
                          onChange={(e) => setSelectedVariant(e.target.value)}
                          className="hidden"
                        />
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedVariant === variant.id ? 'border-pink-500' : 'border-gray-300'
                            }`}>
                            {selectedVariant === variant.id && <div className="w-2 h-2 rounded-full bg-pink-500" />}
                          </div>
                          <span className={`text-sm font-medium ${selectedVariant === variant.id ? 'text-pink-700' : 'text-gray-700'}`}>
                            {variant.name}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Form Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 border-t border-gray-100 pt-4">
                <span className="text-lg">✍️</span> Thông tin đặt hàng
              </h3>

              {/* Gift Mode Toggle */}
              <div className="bg-purple-50 p-3 rounded-xl flex items-center justify-between cursor-pointer" onClick={() => setIsGiftMode(!isGiftMode)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>
                  </div>
                  <span className="text-sm font-bold text-purple-700">Gửi tặng người thương ❤️</span>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isGiftMode ? 'bg-purple-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isGiftMode ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Recipient Info */}
                <div className="space-y-3">
                  {/* Name Input */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl md:text-sm text-base focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none"
                      placeholder={isGiftMode ? "Tên người nhận" : "Họ tên của bạn"}
                      required
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-pink-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl md:text-sm text-base focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none"
                      placeholder={isGiftMode ? "SĐT người nhận" : "Số điện thoại của bạn"}
                      required
                    />
                  </div>

                  {/* HCM / Other Province Toggle */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl space-y-3">
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => {
                      setIsHCMAddress(!isHCMAddress);
                      if (!isHCMAddress) setDistrict(''); // Reset district when switching to HCM
                    }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <span className="text-sm font-bold text-blue-700">{isHCMAddress ? 'Giao hàng tại TP.HCM' : 'Giao hàng toàn quốc'}</span>
                      </div>
                      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isHCMAddress ? 'bg-blue-500' : 'bg-gray-300'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isHCMAddress ? 'translate-x-6' : ''}`} />
                      </div>
                    </div>

                    {/* District Selector (Only for HCM) */}
                    {isHCMAddress && (
                      <div className="animate-fadeIn">
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full px-4 py-3.5 bg-white border border-blue-200 rounded-xl md:text-sm text-base focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-gray-700"
                          required={isHCMAddress}
                        >
                          <option value="">-- Chọn Quận/Huyện --</option>
                          {HCM_DISTRICTS.map((dist) => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Address Input */}
                  <div className="relative group">
                    <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-pink-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl md:text-sm text-base focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none resize-none"
                      rows={2}
                      placeholder={isHCMAddress ? "Địa chỉ chi tiết (Số nhà, đường, phường...)\n(Ưu tiên địa chỉ cũ để dễ book ship)" : "Địa chỉ đầy đủ (Số nhà, đường, phường, quận/huyện, tỉnh/thành phố)"}
                      required
                    />
                  </div>
                </div>

                {/* Sender Info (Gift Mode) */}
                {isGiftMode && (
                  <div className="animate-fadeIn space-y-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wide mb-2">Thông tin người tặng</h4>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <input
                        type="text"
                        value={formData.senderName}
                        onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-purple-200 rounded-xl md:text-sm text-base focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                        placeholder="Tên của bạn"
                        required={isGiftMode}
                      />
                    </div>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </div>
                      <input
                        type="tel"
                        value={formData.senderPhone}
                        onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-purple-200 rounded-xl md:text-sm text-base focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                        placeholder="SĐT của bạn"
                        required={isGiftMode}
                      />
                    </div>
                  </div>
                )}

                {/* Card / Banner Option */}
                <div className="bg-amber-50 p-3 rounded-xl space-y-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsCardOption(!isCardOption)}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <span className="text-sm font-bold text-amber-800">Kèm thiệp hoặc bảng chữ?</span>
                    </div>
                    <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isCardOption ? 'bg-amber-500' : 'bg-gray-300'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isCardOption ? 'translate-x-6' : ''}`} />
                    </div>
                  </div>

                  {isCardOption && (
                    <div className="animate-fadeIn pt-2 border-t border-amber-100 space-y-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCardType('card')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${cardType === 'card'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          ✉️ Thiệp chúc mừng
                        </button>
                        <button
                          type="button"
                          onClick={() => setCardType('banner')}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${cardType === 'banner'
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          🚩 Bảng chữ (Banner)
                        </button>
                      </div>
                      <textarea
                        value={cardContent}
                        onChange={(e) => setCardContent(e.target.value)}
                        className="w-full p-3 bg-white border border-amber-200 rounded-xl md:text-sm text-base focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                        rows={2}
                        placeholder={cardType === 'card' ? "Nội dung lời chúc trên thiệp..." : "Nội dung in trên bảng chữ..."}
                      />
                    </div>
                  )}
                </div>

                {/* Delivery Time */}
                <div className="p-1 bg-gray-100 rounded-xl flex">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('instant')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${deliveryMode === 'instant' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    🚀 Giao ngay
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('scheduled')}
                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${deliveryMode === 'scheduled' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    📅 Hẹn giờ
                  </button>
                </div>

                {deliveryMode === 'scheduled' && (
                  <div className="animate-fadeIn space-y-4">
                    {/* Date Selection */}
                    <div className="relative">
                      <DatePicker
                        selected={deliveryTime}
                        onChange={(date) => setDeliveryTime(date)}
                        showTimeSelect={!globalSettings?.holidayTimeBlockMode}
                        timeFormat="HH:mm"
                        timeIntervals={busyInterval}
                        timeCaption="Giờ"
                        dateFormat={globalSettings?.holidayTimeBlockMode ? "dd/MM/yyyy" : "dd/MM/yyyy HH:mm"}
                        renderCustomHeader={({
                          date,
                          decreaseMonth,
                          increaseMonth,
                          prevMonthButtonDisabled,
                          nextMonthButtonDisabled,
                        }) => (
                          <div className="custom-datepicker-header">
                            <button onClick={decreaseMonth} disabled={prevMonthButtonDisabled} type="button" className="p-1 hover:bg-gray-100 rounded-full">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <span className="font-bold text-gray-800">Tháng {date.getMonth() + 1}, {date.getFullYear()}</span>
                            <button onClick={increaseMonth} disabled={nextMonthButtonDisabled} type="button" className="p-1 hover:bg-gray-100 rounded-full">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                            </button>
                          </div>
                        )}
                        locale="vi"
                        placeholderText={globalSettings?.holidayTimeBlockMode ? "Chọn ngày giao hàng..." : "Chọn ngày giờ giao hàng..."}
                        className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl md:text-sm text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none font-medium text-orange-800"
                        required={deliveryMode === 'scheduled'}
                        minDate={new Date()}
                        withPortal
                        onFocus={(e) => e.target.blur()} // Prevent keyboard on mobile
                      />
                    </div>

                    {/* NEW: Session Selection for Holiday Mode */}
                    {globalSettings?.holidayTimeBlockMode && (
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'morning', label: 'Sáng', range: '8h-11h', icon: '🌅' },
                          { id: 'noon', label: 'Trưa', range: '11h-13h', icon: '☀️' },
                          { id: 'afternoon', label: 'Chiều', range: '13h-18h', icon: '🌇' },
                          { id: 'evening', label: 'Tối', range: '18h-23h', icon: '🌙' }
                        ].map((session) => (
                          <button
                            key={session.id}
                            type="button"
                            onClick={() => setDeliverySession(`${session.label} (${session.range})`)}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${deliverySession?.includes(session.label)
                              ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-gray-100 bg-white text-gray-500 hover:border-orange-200'}`}
                          >
                            <span className="text-sm mb-0.5">{session.icon} {session.label}</span>
                            <span className="text-[10px] opacity-60 font-bold">{session.range}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* NEW: Holiday Policy explanation */}
                    {globalSettings?.holidayTimeBlockMode && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-fadeIn">
                        <div className="flex items-start gap-2 text-amber-800">
                          <span className="text-sm mt-0.5">📢</span>
                          <p className="text-[11px] font-bold leading-relaxed">
                            Do ngày Lễ đơn hàng nhiều, Shop xin phép <span className="text-red-600 underline">không thể hẹn chính xác giờ giao</span>.
                          </p>
                        </div>
                        <div className="pl-6 space-y-1.5 text-[10.5px] text-amber-700 font-medium italic leading-snug">
                          <p>• Shop sẽ cố gắng giao trong khung giờ Buổi bạn đã chọn.</p>
                          <p>• Shipper sẽ gọi điện trước cho người nhận: Nếu người nhận đồng ý sẽ tiến hành giao ngay.</p>
                          <p>• Trường hợp người nhận bận hoặc chưa thuận tiện, shop sẽ sắp xếp phối hợp giao lại theo ý người nhận.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Coupon Section */}
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                        <span className="text-lg">🎫</span> Bạn có mã giảm giá?
                      </span>
                    </div>
                    {appliedCoupon && (
                      <button
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[10px] text-rose-500 font-bold hover:underline"
                      >
                        Gỡ mã
                      </button>
                    )}
                  </div>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        placeholder="Nhập mã"
                        className="flex-1 px-3 py-2.5 bg-white border border-indigo-200 rounded-lg text-[16px] md:text-sm font-bold uppercase focus:border-indigo-500 outline-none placeholder:text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm md:text-xs font-bold hover:bg-indigo-700 transition-all whitespace-nowrap"
                      >
                        Áp dụng
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="text-xs font-bold text-emerald-700">✅ Đã áp dụng: {appliedCoupon.code}</span>
                      <span className="text-xs font-black text-emerald-600">-{appliedCoupon.percent}%</span>
                    </div>
                  )}
                  {couponError && <p className="text-[10px] text-rose-500 mt-1 font-bold">{couponError}</p>}
                </div>

                {/* Shipping Fee & Payment Method Section */}
                <div className="space-y-3">
                  {/* Payment Method Selection */}
                  {!isGiftMode ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMethod === 'transfer'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 bg-white text-gray-500 hover:border-blue-200'}`}
                      >
                        <span className="text-lg mb-1">🏦</span>
                        <span className="text-[10px] font-bold leading-tight uppercase tracking-tight">Chuyển khoản trước</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${paymentMethod === 'cod'
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-100 bg-white text-gray-500 hover:border-pink-200'}`}
                      >
                        <span className="text-lg mb-1">🤝</span>
                        <span className="text-[10px] font-bold leading-tight uppercase tracking-tight">Nhận hàng thanh toán (COD)</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-blue-50 border-2 border-blue-500 rounded-xl flex flex-col items-center justify-center animate-fadeIn">
                      <div className="flex items-center gap-2 text-blue-700 mb-1">
                        <span className="text-lg">🏦</span>
                        <span className="text-xs font-black uppercase tracking-tight">Chuyển khoản trước</span>
                      </div>
                      <p className="text-[10px] text-blue-600 font-bold italic">
                        💝 Đối với đơn hàng gửi tặng, vui lòng thanh toán trước
                      </p>
                    </div>
                  )}

                  {/* Compact Shipping Fee & Total */}
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Giá gốc:</span>
                        <span>{formatPrice(product.salePrice)}</span>
                      </div>

                      {appliedCoupon && discountAmount > 0 && (
                        <div className="flex justify-between text-xs text-emerald-600 font-bold">
                          <span>Giảm giá ({appliedCoupon.code}):</span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}

                      {(shippingFee > 0 || !isHCMAddress) && (
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <span>Phí ship ({isHCMAddress && district ? district : 'Tỉnh khác'}):</span>
                          </div>
                          <span>{formatPrice(shippingFee)}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60">
                      <span className="text-sm font-bold text-gray-800">Tổng cộng:</span>
                      <span className="text-lg font-black text-pink-600" style={{ fontFamily: 'var(--font-price)' }}>
                        {formatPrice(finalTotalPrice)}
                      </span>
                    </div>

                    {isHCMAddress && !district && (
                      <p className="text-[10px] text-pink-500 text-center italic mt-1">
                        💡 Vui lòng chọn quận để tính phí ship & tổng tiền
                      </p>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div className="relative group">
                  <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl md:text-sm text-base focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
                    rows={2}
                    placeholder="Ghi chú thêm (Lời chúc, lưu ý giao hàng...)"
                  />
                </div>

                {submitMessage && (
                  <div className={`p-4 rounded-xl text-center font-semibold text-sm animate-pulse ${submitMessage.includes('✅') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                    {submitMessage}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Footer Action - Sticky Bottom */}
        <div className="border-t border-gray-100 p-4 bg-white z-20">
          <button
            onClick={(e) => handleSubmit(e)}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-pink-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đặt hàng ngay</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductOrderModal;
