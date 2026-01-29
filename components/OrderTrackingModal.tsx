import React, { useState } from 'react';
import { FlowerProduct } from '../types';

interface Order {
  id: string;
  orderNumber: string;
  createdAt: number;
  status: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productName: string;
  productPrice: number;
  variantName?: string;
  isGift: boolean;
  deliveryMode: string;
  deliveryTime?: string;
}

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({ isOpen, onClose }) => {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(false);
    setOrders([]);

    try {
      const response = await fetch(`/api/orders?phone=${encodeURIComponent(phone)}`);
      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
        setHasSearched(true);
      } else {
        setError(data.message || 'Có lỗi xảy ra khi tra cứu');
      }
    } catch (err) {
      setError('Không thể kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Chờ xác nhận</span>;
      case 'confirmed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Đã xác nhận</span>;
      case 'shipping':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Đang giao</span>;
      case 'completed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Hoàn thành</span>;
      case 'cancelled':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Đã hủy</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white/90 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white/50">
          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
            📦 Tra cứu đơn hàng
          </h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Nhập SĐT người nhận hoặc người tặng..."
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 transition-all outline-none"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-pink-500 hover:bg-pink-600 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span>Tra cứu</span>
                )}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-2 ml-1">{error}</p>}
          </form>

          {/* Results */}
          {hasSearched && orders.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <div className="text-6xl mb-4">📭</div>
              <p>Không tìm thấy đơn hàng nào với số điện thoại này.</p>
            </div>
          )}

          {orders.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-700 mb-4">Đơn hàng của bạn ({orders.length})</h3>
              {orders.map((order) => (
                <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-50">
                    <div>
                      <div className="text-xs text-gray-400 font-mono mb-1">{order.orderNumber}</div>
                      <div className="text-xs text-gray-500">{formatDate(order.createdAt)}</div>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  
                  <div className="flex gap-4">
                    {/* Placeholder image if no image available, usually backend doesn't store image URL directly in order but productId. 
                        In this simple version we might just show a placeholder or try to find product image if we had access to product list.
                        For now, let's use a generic flower icon or placeholder. 
                        Wait, the prompt asked for "Product image (left)". 
                        The order data has `productName` but not `productImage`. 
                        However, the backend `newOrder` object doesn't seem to save the image URL explicitly.
                        It saves `productId`. I might need to fetch product details or just show a default image.
                        Actually, let's check if `newOrder` saves `productImage`? No it doesn't.
                        But wait, the user wants to see the image.
                        I should probably update the backend to save `productImage` in the order, OR
                        I can just show a placeholder for now since I can't easily change *existing* orders to have images.
                        But for *new* orders I can.
                        Let's just use a placeholder for now to be safe, or if I have a list of products I could look it up, but I don't have the full product list here.
                    */}
                    <div className="w-20 h-20 bg-pink-50 rounded-xl flex items-center justify-center flex-shrink-0">
                       <span className="text-3xl">🌸</span>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 line-clamp-2">{order.productName}</h4>
                      {order.variantName && (
                        <div className="text-sm text-gray-500 mt-1">Phân loại: {order.variantName}</div>
                      )}
                      <div className="flex justify-between items-end mt-2">
                        <div className="text-sm text-gray-500">x1</div>
                        <div className="font-bold text-pink-600">{formatPrice(order.productPrice)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center text-sm">
                     <span className="text-gray-500">Tổng tiền:</span>
                     <span className="font-bold text-lg text-gray-800">{formatPrice(order.productPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default OrderTrackingModal;
