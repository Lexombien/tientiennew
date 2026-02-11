import React, { useState, useEffect } from 'react';
import { Order, OrderStatus } from '../types';

const OrdersManagement: React.FC = () => {
    // State
    const [orders, setOrders] = useState<Order[]>([]);
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

    // Time filter state
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('all');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [shopNote, setShopNote] = useState('');
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load orders on mount
    useEffect(() => {
        loadOrders();
    }, []);

    // API Functions
    const loadOrders = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/orders');
            const data = await response.json();
            if (data.success) {
                setOrders(data.orders);
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                loadOrders();
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(data.order);
                }
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const deleteOrder = async (orderId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) return;

        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            if (data.success) {
                loadOrders();
                setShowDetailModal(false);
            }
        } catch (error) {
            console.error('Error deleting order:', error);
        }
    };

    const updateShopNote = async (orderId: string) => {
        try {
            setIsSavingNote(true);
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shopNote })
            });
            const data = await response.json();
            if (data.success) {
                // Update local orders list
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, shopNote } : o));
                alert('✅ Đã lưu ghi chú!');
            }
        } catch (error) {
            console.error('Error updating shop note:', error);
            alert('❌ Lỗi khi lưu ghi chú');
        } finally {
            setIsSavingNote(false);
        }
    };

    // Helper Functions  
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status: OrderStatus) => {
        const colors: Record<OrderStatus, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: OrderStatus) => {
        const labels: Record<OrderStatus, string> = {
            pending: '⏳ Chờ xử lý',
            processing: '🔄 Đang xử lý',
            completed: '✅ Hoàn thành',
            cancelled: '❌ Đã hủy'
        };
        return labels[status] || status;
    };

    // Computed values
    const filteredByTimeOrders = React.useMemo(() => {
        if (timeRange === 'all') return orders;

        const now = new Date();
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        return orders.filter(order => {
            const orderDate = new Date(order.createdAt);

            if (timeRange === 'day' || timeRange === 'custom') {
                return orderDate >= startOfDay && orderDate <= endOfDay;
            }

            if (timeRange === 'week') {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(now.getDate() - 7);
                return orderDate >= oneWeekAgo;
            }

            if (timeRange === 'month') {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(now.getMonth() - 1);
                return orderDate >= oneMonthAgo;
            }

            if (timeRange === 'year') {
                const oneYearAgo = new Date();
                oneYearAgo.setFullYear(now.getFullYear() - 1);
                return orderDate >= oneYearAgo;
            }

            return true;
        });
    }, [orders, timeRange, selectedDate]);

    const filteredOrders = filterStatus === 'all'
        ? filteredByTimeOrders
        : filteredByTimeOrders.filter(o => o.status === filterStatus);

    const stats = {
        total: filteredByTimeOrders.length,
        pending: filteredByTimeOrders.filter(o => o.status === 'pending').length,
        processing: filteredByTimeOrders.filter(o => o.status === 'processing').length,
        completed: filteredByTimeOrders.filter(o => o.status === 'completed').length,
        cancelled: filteredByTimeOrders.filter(o => o.status === 'cancelled').length,
    };

    // Revenue Stats
    const revenueStats = {
        total: filteredByTimeOrders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (Number(o.productPrice) || 0), 0),
        pending: filteredByTimeOrders.filter(o => ['pending', 'processing'].includes(o.status)).reduce((sum, o) => sum + (Number(o.productPrice) || 0), 0),
        cancelled: filteredByTimeOrders.filter(o => o.status === 'cancelled').reduce((sum, o) => sum + (Number(o.productPrice) || 0), 0),
    };

    return (
        <div className="space-y-8">
            {/* Time Filter Controls */}
            <div className="glass p-5 md:p-6 rounded-[32px] flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border border-white/40">
                <div className="flex p-1.5 glass-inset gap-1 w-full md:w-auto overflow-x-auto scrollbar-hide">
                    {(['all', 'day', 'week', 'month', 'year'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${timeRange === range
                                ? 'bg-gradient-pink text-white shadow-md'
                                : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'
                                }`}
                        >
                            {range === 'all' && '🌐 Tất cả'}
                            {range === 'day' && '📅 Hôm nay'}
                            {range === 'week' && '📊 Tuần này'}
                            {range === 'month' && '📈 Tháng này'}
                            {range === 'year' && '🗓️ Năm nay'}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 p-1.5 glass-inset w-full md:w-auto">
                    <span className="text-xs md:text-sm font-bold text-gray-400 pl-3 uppercase tracking-wider flex-shrink-0">Chọn ngày:</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setTimeRange('custom');
                        }}
                        className="bg-white/40 px-3 py-1.5 rounded-2xl font-bold outline-none text-gray-800 cursor-pointer w-full md:w-auto text-sm border border-white/20 shadow-sm transition-all focus:bg-white/60"
                    />
                </div>
            </div>

            {/* Order Statistics */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold serif-display gradient-text flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                    📊 Thống kê đơn hàng
                </h3>
                <div className="flex p-2 glass-inset rounded-[30px] gap-2 md:gap-4 overflow-x-auto scrollbar-hide">
                    {[
                        { key: 'all' as const, count: stats.total, label: 'TỔNG ĐƠN', color: 'pink', icon: '📦' },
                        { key: 'pending' as const, count: stats.pending, label: 'CHỜ XỬ LÝ', color: 'yellow', icon: '⏳' },
                        { key: 'processing' as const, count: stats.processing, label: 'ĐANG XỬ LÝ', color: 'blue', icon: '🔄' },
                        { key: 'completed' as const, count: stats.completed, label: 'HOÀN THÀNH', color: 'green', icon: '✅' },
                        { key: 'cancelled' as const, count: stats.cancelled, label: 'ĐÃ HỦY', color: 'red', icon: '❌' }
                    ].map(stat => (
                        <div
                            key={stat.key}
                            className={`flex-1 min-w-[120px] p-4 rounded-2xl cursor-pointer transition-all duration-300 group relative overflow-hidden ${filterStatus === stat.key ? 'bg-white shadow-md scale-[1.02] border border-white/60' : 'hover:bg-white/30'
                                }`}
                            onClick={() => setFilterStatus(stat.key as any)}
                        >
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xl opacity-80 group-hover:scale-110 transition-transform">{stat.icon}</span>
                                <div className={`text-2xl font-black ${filterStatus === stat.key ? (
                                    stat.key === 'all' ? 'text-pink-600' :
                                        stat.color === 'yellow' ? 'text-amber-600' :
                                            stat.color === 'blue' ? 'text-blue-600' :
                                                stat.color === 'green' ? 'text-emerald-600' :
                                                    'text-rose-600'
                                ) : 'text-gray-400'
                                    }`}>
                                    {stat.count}
                                </div>
                            </div>
                            <div className={`text-[10px] font-black tracking-widest ${filterStatus === stat.key ? 'text-gray-700' : 'text-gray-400'}`}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Revenue Statistics */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold serif-display gradient-text flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                    💰 Thống kê doanh thu
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Real Revenue */}
                    <div className="glass p-6 rounded-2xl bg-green-50/50 border border-green-100 hover:scale-[1.02] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                <span className="text-xl">💵</span>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">Đã nhận</span>
                        </div>
                        <div className="text-3xl font-bold text-green-700 mb-1 tracking-tight">
                            {formatPrice(revenueStats.total)}
                        </div>
                        <div className="text-sm font-semibold text-green-800">Doanh thu thực tế</div>
                        <div className="text-xs text-green-600 mt-1 opacity-80">Từ {stats.completed} đơn đã hoàn thành</div>
                    </div>

                    {/* Potential Revenue */}
                    <div className="glass p-6 rounded-2xl bg-blue-50/50 border border-blue-100 hover:scale-[1.02] transition-transform">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <span className="text-xl">⏳</span>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Dự kiến</span>
                        </div>
                        <div className="text-3xl font-bold text-blue-700 mb-1 tracking-tight">
                            {formatPrice(revenueStats.pending)}
                        </div>
                        <div className="text-sm font-semibold text-blue-800">Doanh thu tiềm năng</div>
                        <div className="text-xs text-blue-600 mt-1 opacity-80">Từ {stats.pending + stats.processing} đơn đang xử lý</div>
                    </div>

                    {/* Lost Revenue */}
                    <div className="glass p-6 rounded-2xl bg-red-50/50 border border-red-100 opacity-70 hover:opacity-100 transition-all hover:scale-[1.02]">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                <span className="text-xl">💸</span>
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">Đã mất</span>
                        </div>
                        <div className="text-3xl font-bold text-red-700 mb-1 tracking-tight">
                            {formatPrice(revenueStats.cancelled)}
                        </div>
                        <div className="text-sm font-semibold text-red-800">Doanh thu thất thoát</div>
                        <div className="text-xs text-red-600 mt-1 opacity-80">Từ {stats.cancelled} đơn đã hủy</div>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="glass rounded-[32px] overflow-hidden border border-white/40 shadow-2xl">
                <div className="p-8 border-b border-white/20 bg-white/10 flex justify-between items-center">
                    <h2 className="text-2xl font-bold serif-display gradient-text flex items-center gap-3">
                        <span className="p-2 bg-pink-100 rounded-xl text-xl">📦</span>
                        Danh sách đơn hàng
                    </h2>
                    <div className="text-xs font-bold px-4 py-2 glass-inset text-gray-500">
                        {filteredOrders.length} đơn hàng
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center">
                        <div className="spinner-glass mx-auto"></div>
                        <p className="mt-6 font-bold text-gray-400 animate-pulse">Đang tải dữ liệu...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="text-7xl mb-6 grayscale opacity-30">📦</div>
                        <p className="text-lg font-bold text-gray-400">Chưa có đơn hàng nào trong khoảng thời gian này</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    {['Mã đơn', 'Khách hàng', 'Sản phẩm', 'Giá', 'Trạng thái', 'Ngày đặt', 'Hành động'].map(header => (
                                        <th key={header} className="text-left p-6 text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: 'var(--text-secondary)' }}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredOrders.map(order => (
                                    <tr
                                        key={order.id}
                                        className="group hover:bg-white/40 transition-all cursor-pointer"
                                        onClick={() => {
                                            setSelectedOrder(order);
                                            setShopNote(order.shopNote || '');
                                            setShowDetailModal(true);
                                        }}
                                    >
                                        <td className="p-6">
                                            <div className="font-bold text-pink-600 group-hover:scale-110 transition-transform origin-left">#{order.orderNumber}</div>
                                            {order.isGift && <div className="text-[10px] font-bold mt-1 text-purple-500 flex items-center gap-1"><span>🎁</span> Quà tặng</div>}
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-gray-800">{order.customerName}</div>
                                            <div className="text-xs font-medium text-gray-500 mt-1">{order.customerPhone}</div>
                                        </td>
                                        <td className="p-6 max-w-[250px]">
                                            <div className="flex items-center gap-3">
                                                {/* Product Thumbnail */}
                                                {order.productImage && (
                                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-md">
                                                        <img
                                                            src={order.productImage}
                                                            alt={order.productName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                )}
                                                {/* Product Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-gray-700 truncate">{order.productName}</div>
                                                    {order.variantName && (
                                                        <div className="text-[10px] font-bold text-blue-500 mt-1 bg-blue-50 px-2 py-0.5 rounded-md inline-block">🎨 {order.variantName}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-black text-gray-800 tracking-tight">{formatPrice(order.productPrice)}</div>
                                        </td>
                                        <td className="p-6">
                                            <select
                                                value={order.status}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateOrderStatus(order.id, e.target.value as OrderStatus);
                                                }}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer border-none shadow-sm focus:ring-2 focus:ring-pink-300 transition-all ${getStatusColor(order.status)}`}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="pending">⏳ Chờ xử lý</option>
                                                <option value="processing">🔄 Đang xử lý</option>
                                                <option value="completed">✅ Hoàn thành</option>
                                                <option value="cancelled">❌ Đã hủy</option>
                                            </select>
                                        </td>
                                        <td className="p-6 text-xs font-medium text-gray-500">
                                            {formatDate(order.createdAt)}
                                        </td>
                                        <td className="p-6 text-center" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => deleteOrder(order.id)}
                                                className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                title="Xóa đơn hàng"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Modal - Simplified version due to length */}
            {showDetailModal && selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailModal(false)}>
                    <div className="glass-strong rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-white/20">
                            <h2 className="text-2xl font-bold serif-display gradient-text">
                                Chi tiết {selectedOrder.orderNumber}
                            </h2>
                            <button onClick={() => setShowDetailModal(false)} className="pill-button glass px-4 py-2">✕</button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Status Selector */}
                            <div className="glass p-4 rounded-2xl">
                                <label className="block text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-secondary)' }}>Trạng thái</label>
                                <select
                                    value={selectedOrder.status}
                                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value as OrderStatus)}
                                    className={`w-full px-4 py-3 rounded-xl font-bold cursor-pointer ${getStatusColor(selectedOrder.status)}`}
                                >
                                    <option value="pending">⏳ Chờ xử lý</option>
                                    <option value="processing">🔄 Đang xử lý</option>
                                    <option value="completed">✅ Hoàn thành</option>
                                    <option value="cancelled">❌ Đã hủy</option>
                                </select>
                            </div>

                            {/* Customer Info */}
                            <div className="glass p-4 rounded-2xl">
                                <h3 className="font-bold mb-3">👤 Người nhận</h3>
                                <div className="space-y-1 text-sm">
                                    <div><strong>Tên:</strong> {selectedOrder.customerName}</div>
                                    <div><strong>SĐT:</strong> {selectedOrder.customerPhone}</div>
                                    <div><strong>Địa chỉ:</strong> {selectedOrder.customerAddress}</div>
                                </div>
                            </div>

                            {/* Gift Info */}
                            {selectedOrder.isGift && selectedOrder.senderName && (
                                <div className="glass p-4 rounded-2xl bg-purple-50/50">
                                    <h3 className="font-bold mb-3">🎁 Người tặng</h3>
                                    <div className="space-y-1 text-sm">
                                        <div><strong>Tên:</strong> {selectedOrder.senderName}</div>
                                        <div><strong>SĐT:</strong> {selectedOrder.senderPhone}</div>
                                    </div>
                                </div>
                            )}

                            {/* Product Info */}
                            <div className="glass p-4 rounded-2xl">
                                <h3 className="font-bold mb-3">📦 Sản phẩm</h3>
                                <div className="flex gap-4">
                                    {/* Product Image - Large */}
                                    {selectedOrder.productImage && (
                                        <div className="flex-shrink-0">
                                            <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-white shadow-lg hover:scale-105 transition-transform">
                                                <img
                                                    src={selectedOrder.productImage}
                                                    alt={selectedOrder.productName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Product Details */}
                                    <div className="flex-1 space-y-1 text-sm">
                                        <div><strong>Tên:</strong> {selectedOrder.productName}</div>
                                        {selectedOrder.variantName && <div><strong>Biến thể:</strong> {selectedOrder.variantName}</div>}
                                        {selectedOrder.variantSKU && <div><strong>SKU:</strong> {selectedOrder.variantSKU}</div>}
                                        <div className="text-lg font-bold gradient-text mt-2">{formatPrice(selectedOrder.productPrice)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Card/Banner Info */}
                            {selectedOrder.isCard && selectedOrder.cardContent && (
                                <div className="glass p-4 rounded-2xl bg-blue-50/50">
                                    <h3 className="font-bold mb-3">
                                        {selectedOrder.cardType === 'banner' ? '🎨 Nội dung Bảng chữ' : '✍️ Nội dung Thiệp'}
                                    </h3>
                                    <p className="text-sm italic whitespace-pre-wrap">{selectedOrder.cardContent}</p>
                                </div>
                            )}

                            {/* Customer Note */}
                            {selectedOrder.note && (
                                <div className="glass p-4 rounded-2xl">
                                    <h3 className="font-bold mb-2">📝 Ghi chú khách</h3>
                                    <p className="text-sm italic">{selectedOrder.note}</p>
                                </div>
                            )}

                            {/* Delivery Info */}
                            <div className="glass p-4 rounded-2xl bg-orange-50/50">
                                <h3 className="font-bold mb-2">🚚 Thông tin giao hàng</h3>
                                <div className="text-sm">
                                    <p>
                                        <span className="font-semibold">Chế độ: </span>
                                        {selectedOrder.deliveryMode === 'scheduled' ? 'Hẹn giờ giao' : 'Giao liền'}
                                    </p>
                                    {selectedOrder.deliveryMode === 'scheduled' && selectedOrder.deliveryTime && (
                                        <p className="mt-1">
                                            <span className="font-semibold">Thời gian: </span>
                                            {new Date(selectedOrder.deliveryTime).toLocaleDateString('vi-VN')}
                                            {selectedOrder.deliverySession ? ` - Buổi ${selectedOrder.deliverySession}` : ` ${new Date(selectedOrder.deliveryTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Shop Note (Repurposed from Tracking Link) */}
                            <div className="glass p-5 rounded-[24px] border-2 border-pink-100 bg-pink-50/10 shadow-sm transition-all focus-within:border-pink-300">
                                <h3 className="font-bold mb-3 flex items-center gap-2 text-pink-700 serif-display">
                                    <span className="p-1.5 bg-pink-100 rounded-lg">📝</span> Ghi chú từ Shop (Hiển thị cho khách)
                                </h3>
                                <div className="space-y-3">
                                    <textarea
                                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm min-h-[100px] border-gray-200 focus:border-pink-500 bg-white/50"
                                        placeholder="Nhập ghi chú gửi cho khách (vd: link tracking Be/Grab, lời cảm ơn, thông báo giao hàng...)"
                                        value={shopNote}
                                        onChange={(e) => setShopNote(e.target.value)}
                                    />
                                    <button
                                        onClick={() => updateShopNote(selectedOrder.id)}
                                        disabled={isSavingNote}
                                        className="w-full bg-gradient-pink text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-pink-200 hover:shadow-pink-300 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSavingNote ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                Đang lưu...
                                            </>
                                        ) : (
                                            <>✅ Lưu ghi chú</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Meta */}
                            <div className="text-xs p-3 rounded-xl" style={{ color: 'var(--text-secondary)', background: 'var(--glass-bg)' }}>
                                <div>Ngày đặt: {formatDate(selectedOrder.createdAt)}</div>
                                <div>ID: {selectedOrder.id}</div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => deleteOrder(selectedOrder.id)}
                                    className="pill-button bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 font-bold flex-1"
                                >
                                    🗑️ Xóa
                                </button>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="pill-button glass px-6 py-3 font-bold flex-1"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrdersManagement;
