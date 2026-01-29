import React, { useState, useMemo } from 'react';
import { AnalyticsData, AnalyticsStats, FlowerProduct } from '../types';

interface AnalyticsDashboardProps {
    analyticsData: AnalyticsData;
    products: FlowerProduct[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ analyticsData, products }) => {
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year' | 'all' | 'custom'>('week');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // Calculate statistics
    const stats = useMemo<AnalyticsStats>(() => {
        const now = new Date();
        let startTime = 0;
        let endTime = Number.MAX_SAFE_INTEGER;

        if (timeRange === 'day' || timeRange === 'custom') {
            const start = new Date(selectedDate);
            start.setHours(0, 0, 0, 0);
            startTime = start.getTime();

            const end = new Date(selectedDate);
            end.setHours(23, 59, 59, 999);
            endTime = end.getTime();
        } else if (timeRange === 'week') {
            startTime = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'month') {
            startTime = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'year') {
            startTime = now.getTime() - (365 * 24 * 60 * 60 * 1000);
        } else if (timeRange === 'all') {
            startTime = 0;
        }

        // Filter by time range
        const filteredViews = analyticsData.pageViews.filter(v => v.timestamp >= startTime && v.timestamp <= endTime);
        const filteredClicks = analyticsData.productClicks.filter(c => c.timestamp >= startTime && c.timestamp <= endTime);

        // Total views
        const totalViews = filteredViews.length;

        // Unique visitors (based on sessionId)
        const uniqueSessions = new Set(filteredViews.map(v => v.sessionId).filter(Boolean));
        const uniqueVisitors = uniqueSessions.size || totalViews; // fallback to total views if no sessions

        // Views by date
        const viewsByDate: Record<string, number> = {};
        filteredViews.forEach(view => {
            const date = new Date(view.timestamp).toLocaleDateString('vi-VN');
            viewsByDate[date] = (viewsByDate[date] || 0) + 1;
        });

        // Views by hour
        const viewsByHour: Record<number, number> = {};
        filteredViews.forEach(view => {
            const hour = new Date(view.timestamp).getHours();
            viewsByHour[hour] = (viewsByHour[hour] || 0) + 1;
        });

        // Clicks by product
        const clicksByProduct: Record<string, number> = {};
        filteredClicks.forEach(click => {
            clicksByProduct[click.productId] = (clicksByProduct[click.productId] || 0) + 1;
        });

        // Top products
        const topProducts = Object.entries(clicksByProduct)
            .map(([productId, clicks]) => {
                const product = products.find(p => p.id === productId);
                return {
                    productId,
                    title: product?.title || 'Unknown Product',
                    clicks
                };
            })
            .sort((a, b) => b.clicks - a.clicks)
            .slice(0, 10);

        return {
            totalViews,
            uniqueVisitors,
            topProducts,
            viewsByDate,
            viewsByHour,
            clicksByProduct
        };
    }, [analyticsData, timeRange, selectedDate, products]);

    // Prepare chart data for views by date
    const viewsChartData = useMemo(() => {
        const sorted = Object.entries(stats.viewsByDate)
            .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

        // If viewing custom day, we might want to show hourly breakdown instead?
        // But for now let's keep it simple. If it's a single day, it will show just that day.
        // Actually, if it's a single day, viewsByDate will likely have only 1 entry.
        // The original logic sliced the last 14 days. We should adapt this.

        if (timeRange === 'day' || timeRange === 'custom') {
            // If viewing a single day, showing "views by date" is trivial (1 bar).
            // It would be better to show "views by hour" for that day.
            // But let's stick to the requested task first: Date Selection.
            // We will return all data within the range.
            return sorted;
        }

        return sorted.slice(-14); // Last 14 days default
    }, [stats.viewsByDate, timeRange]);

    // Calculate max value for chart scaling
    const maxViews = Math.max(...viewsChartData.map(([_, count]) => count), 1);

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="glass-strong p-4 md:p-6 rounded-3xl border border-white/30 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex p-1.5 glass-inset gap-1 w-full md:w-auto overflow-x-auto scrollbar-hide">
                    {(['all', 'day', 'week', 'month', 'year'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-2 rounded-2xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${timeRange === range
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
                    <span className="text-xs md:text-sm font-bold text-gray-400 pl-3 flex-shrink-0">Chọn ngày:</span>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setTimeRange('custom');
                        }}
                        className="bg-white/40 px-3 py-1.5 rounded-2xl font-bold outline-none text-gray-800 cursor-pointer w-full md:w-auto border border-white/20 shadow-sm transition-all focus:bg-white/60"
                    />
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Views */}
                <div className="glass-strong p-2 md:p-6 rounded-3xl border border-white/30 hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-4xl">👁️</span>
                        <span className="text-xs font-bold glass px-3 py-1 rounded-full" style={{ color: 'var(--primary-pink)' }}>Lượt xem</span>
                    </div>
                    <div className="text-4xl font-bold serif-display gradient-text">{stats.totalViews.toLocaleString('vi-VN')}</div>
                    <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Tổng số lượt truy cập</div>
                </div>

                {/* Unique Visitors */}
                <div className="glass-strong p-6 rounded-3xl border border-white/30 hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-4xl">👤</span>
                        <span className="text-xs font-bold glass px-3 py-1 rounded-full" style={{ color: 'var(--secondary-purple)' }}>Khách hàng</span>
                    </div>
                    <div className="text-4xl font-bold serif-display gradient-text">{stats.uniqueVisitors.toLocaleString('vi-VN')}</div>
                    <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Khách truy cập duy nhất</div>
                </div>

                {/* Total Clicks */}
                <div className="glass-strong p-6 rounded-3xl border border-white/30 hover:scale-105 transition-transform">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-4xl">🖱️</span>
                        <span className="text-xs font-bold glass px-3 py-1 rounded-full" style={{ color: 'var(--accent-orange)' }}>Tương tác</span>
                    </div>
                    <div className="text-4xl font-bold serif-display gradient-text">{stats.topProducts.reduce((sum, p) => sum + p.clicks, 0).toLocaleString('vi-VN')}</div>
                    <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>Lượt click sản phẩm</div>
                </div>
            </div>

            {/* Views Chart */}
            <div className="glass-strong p-2 md:p-8 rounded-3xl border border-white/30">
                <h3 className="text-lg font-bold serif-display gradient-text mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                    📊 Lượt xem theo ngày
                </h3>

                {viewsChartData.length > 0 ? (
                    <div className="space-y-3">
                        {viewsChartData.map(([date, count]) => (
                            <div key={date} className="space-y-1">
                                <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    <span className="font-semibold">{date}</span>
                                    <span className="font-bold" style={{ color: 'var(--primary-pink)' }}>{count} lượt</span>
                                </div>
                                <div className="relative h-8 glass rounded-xl overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 left-0 bg-gradient-pink rounded-xl transition-all duration-500"
                                        style={{ width: `${(count / maxViews) * 100}%` }}
                                    >
                                        <div className="absolute inset-0 shimmer"></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                        <span className="text-4xl">📭</span>
                        <p className="mt-4">Chưa có dữ liệu trong khoảng thời gian này</p>
                    </div>
                )}
            </div>

            {/* Top Products */}
            <div className="glass-strong p-8 rounded-3xl border border-white/30">
                <h3 className="text-lg font-bold serif-display gradient-text mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                    🏆 Sản phẩm được xem nhiều nhất
                </h3>

                {stats.topProducts.length > 0 ? (
                    <div className="space-y-4">
                        {stats.topProducts.map((product, index) => (
                            <div key={product.productId} className="glass p-4 rounded-2xl hover:glass-strong transition-all">
                                <div className="flex items-center gap-4">
                                    {/* Rank Badge */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-gradient-sunset glow-pink' :
                                        index === 1 ? 'bg-gradient-purple' :
                                            index === 2 ? 'bg-gradient-pink' :
                                                'glass-pink'
                                        }`}>
                                        {index + 1}
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{product.title}</div>
                                        <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                            ID: {product.productId}
                                        </div>
                                    </div>

                                    {/* Click Count */}
                                    <div className="text-right">
                                        <div className="text-2xl font-bold serif-display gradient-text">{product.clicks}</div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>lượt click</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>
                        <span className="text-4xl">🎯</span>
                        <p className="mt-4">Chưa có sản phẩm nào được click</p>
                    </div>
                )}
            </div>

            {/* Views by Hour Heatmap */}
            <div className="glass-strong p-8 rounded-3xl border border-white/30">
                <h3 className="text-lg font-bold serif-display gradient-text mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                    🕐 Lượt xem theo giờ trong ngày
                </h3>

                <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                    {Array.from({ length: 24 }, (_, hour) => {
                        const count = stats.viewsByHour[hour] || 0;
                        const maxHourlyViews = Math.max(...(Object.values(stats.viewsByHour) as number[]), 1);
                        const intensity = count / maxHourlyViews;

                        return (
                            <div key={hour} className="text-center">
                                <div
                                    className="glass rounded-lg p-3 transition-all hover:scale-110 cursor-pointer"
                                    style={{
                                        backgroundColor: `rgba(255, 107, 157, ${intensity * 0.8})`,
                                        borderColor: count > 0 ? 'var(--primary-pink)' : 'transparent'
                                    }}
                                    title={`${hour}:00 - ${count} lượt xem`}
                                >
                                    <div className="text-xs font-bold text-white">{hour}h</div>
                                    <div className="text-[10px] font-bold text-white mt-1">{count}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
