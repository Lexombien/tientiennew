import React, { useState, useEffect } from 'react';
import { FlowerProduct } from '../types';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { vi } from 'date-fns/locale';
import '../styles/datepicker-custom.css';

registerLocale('vi', vi);

interface ProductOrderModalProps {
  product: FlowerProduct;
  onClose: () => void;
  mediaMetadata?: Record<string, { alt?: string, title?: string, description?: string }>;
}

const ProductOrderModal: React.FC<ProductOrderModalProps> = ({ product, onClose, mediaMetadata = {} }) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.phone || !formData.address) {
      setSubmitMessage('Vui lòng điền đầy đủ thông tin người nhận!');
      return;
    }

    if (isGiftMode && (!formData.senderName || !formData.senderPhone)) {
      setSubmitMessage('Vui lòng điền đầy đủ thông tin người tặng!');
      return;
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
          deliveryTime: deliveryMode === 'scheduled' ? deliveryTime : undefined
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
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
        <div
          className="bg-white rounded-3xl max-w-2xl w-full p-8 md:p-12 text-center shadow-2xl animate-slideUp"
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

          <p className="text-gray-600 mb-8">
            Chúng tôi sẽ liên hệ với bạn sớm nhất qua <span className="font-bold text-blue-600">Zalo</span> hoặc <span className="font-bold text-green-600">Gọi điện</span> để xác nhận đơn hàng.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={getZaloLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.145 2 11.243c0 2.896 1.372 5.515 3.564 7.302V22l3.37-1.854c.958.27 1.969.416 3.022.416 5.523 0 10-4.145 10-9.243C22 6.145 17.523 2 12 2z" />
              </svg>
              Liên hệ Zalo ngay
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

            {/* Gallery - Modern Swipe Style */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 group">
              <img
                src={imagesToDisplay[currentImageIndex].url}
                alt={imagesToDisplay[currentImageIndex].alt}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Navigation Arrows (Overlay) */}
              {imagesToDisplay.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + imagesToDisplay.length) % imagesToDisplay.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/50 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % imagesToDisplay.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md text-white hover:bg-white/50 transition-all flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>

                  {/* Indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {imagesToDisplay.map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                      />
                    ))}
                  </div>
                </>
              )}
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
                  <span className="text-sm font-bold text-purple-700">Gửi tặng người thân?</span>
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
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none"
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
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none"
                      placeholder={isGiftMode ? "SĐT người nhận" : "Số điện thoại của bạn"}
                      required
                    />
                  </div>

                  {/* Address Input */}
                  <div className="relative group">
                    <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-pink-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none resize-none"
                      rows={2}
                      placeholder="Địa chỉ giao hàng (Số nhà, đường...)"
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
                        className="w-full pl-12 pr-4 py-3 bg-white border border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
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
                        className="w-full pl-12 pr-4 py-3 bg-white border border-purple-200 rounded-xl text-sm focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
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
                        className="w-full p-3 bg-white border border-amber-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
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
                  <div className="animate-fadeIn">
                    <DatePicker
                      selected={deliveryTime}
                      onChange={(date) => setDeliveryTime(date)}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={30}
                      timeCaption="Giờ"
                      dateFormat="dd/MM/yyyy HH:mm"
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
                      placeholderText="Chọn ngày giờ giao hàng..."
                      className="w-full px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none font-medium text-orange-800"
                      required={deliveryMode === 'scheduled'}
                      minDate={new Date()}
                      withPortal
                      onFocus={(e) => e.target.blur()} // Prevent keyboard on mobile
                    />
                  </div>
                )}

                {/* Note */}
                <div className="relative group">
                  <div className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </div>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none"
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
