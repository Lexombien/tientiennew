import React, { useState, useEffect } from 'react';

interface ShippingFeesManagerProps {
    backendUrl: string;
}

const HCM_DISTRICTS = [
    'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8', 'Quận 9', 'Quận 10',
    'Quận 11', 'Quận 12', 'Quận Bình Tân', 'Quận Bình Thạnh', 'Quận Gò Vấp', 'Quận Phú Nhuận',
    'Quận Tân Bình', 'Quận Tân Phú', 'Quận Thủ Đức', 'Huyện Bình Chánh', 'Huyện Cần Giờ',
    'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè'
];

const ShippingFeesManager: React.FC<ShippingFeesManagerProps> = ({ backendUrl }) => {
    const [fees, setFees] = useState<Record<string, number>>({});
    const [defaultShippingFee, setDefaultShippingFee] = useState(50000); // Phí tỉnh khác
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    // Load shipping fees từ server
    useEffect(() => {
        loadFees();
    }, []);

    const loadFees = async () => {
        try {
            setLoading(true);
            const host = window.location.hostname;
            const isLocal = host === 'localhost' || host === '127.0.0.1';
            const finalBackendUrl = backendUrl || (isLocal ? `http://${host}:3001` : '');

            const targetUrl = `${finalBackendUrl}/api/shipping-fees`;
            console.log(`📡 [DEBUG] Đang gọi API tại: ${targetUrl}`);

            const response = await fetch(targetUrl);

            if (!response.ok) {
                const text = await response.text();
                console.error(`❌ Server returned ${response.status}:`, text.substring(0, 100));
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            // Merge với default values nếu chưa có
            const mergedFees = { ...getDefaultFees(), ...(data.fees || {}) };
            setFees(mergedFees);
            // Load phí tỉnh khác
            if (data.defaultShippingFee !== undefined) {
                setDefaultShippingFee(data.defaultShippingFee);
            }
        } catch (error) {
            console.error('Error loading shipping fees:', error);
            setMessage('❌ Lỗi tải dữ liệu phí ship!');
        } finally {
            setLoading(false);
        }
    };

    const getDefaultFees = (): Record<string, number> => {
        const defaultFees: Record<string, number> = {};
        HCM_DISTRICTS.forEach(district => {
            // Default theo khu vực
            if (['Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 10', 'Quận Phú Nhuận'].includes(district)) {
                defaultFees[district] = 25000; // Nội thành
            } else if (['Quận 2', 'Quận 6', 'Quận 11', 'Quận Bình Thạnh', 'Quận Tân Bình'].includes(district)) {
                defaultFees[district] = 30000; // Trung tâm mở rộng
            } else if (['Quận 7', 'Quận 8', 'Quận Bình Tân', 'Quận Gò Vấp', 'Quận Tân Phú'].includes(district)) {
                defaultFees[district] = 35000; // Xa trung tâm
            } else if (['Quận 9', 'Quận 12', 'Quận Thủ Đức'].includes(district)) {
                defaultFees[district] = 40000; // Xa & Thủ Đức
            } else {
                defaultFees[district] = 50000; // Huyện
            }
        });
        return defaultFees;
    };

    const handleFeeChange = (district: string, value: number) => {
        setFees(prev => ({ ...prev, [district]: value }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage('');

            const host = window.location.hostname;
            // Chiến lược lấy URL: Ưu tiên port 3001 nếu ở local
            const finalBackendUrl = host === 'localhost' || host === '127.0.0.1'
                ? `http://${host}:3001`
                : backendUrl || '';

            console.log(`🚀 [Admin] Đang lưu phí ship tại: ${finalBackendUrl}/api/shipping-fees`);

            const response = await fetch(`${finalBackendUrl}/api/shipping-fees`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    fees,
                    defaultShippingFee
                })
            });

            if (!response.ok) {
                const text = await response.text();
                console.error('❌ Server error response:', text);
                throw new Error(`Mã lỗi: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setMessage('✅ Đã lưu bảng phí ship thành công!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage(`❌ Lỗi server: ${data.message || 'Không xác định'}`);
            }
        } catch (error: any) {
            console.error('🔥 Lỗi kết nối server:', error);
            setMessage(`❌ Không thể kết nối server! (${error.message || 'Kiểm tra terminal node server.js'})`);
        } finally {
            setSaving(false);
        }
    };

    // Sort districts: Số trước (1,2,3...) rồi đến chữ (Bình Tân, Gò Vấp...)
    const sortedDistricts = [...HCM_DISTRICTS].sort((a, b) => {
        const numA = parseInt(a.replace('Quận ', ''));
        const numB = parseInt(b.replace('Quận ', ''));

        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB; // Cả 2 đều là số
        } else if (!isNaN(numA)) {
            return -1; // a là số, b là chữ → a trước
        } else if (!isNaN(numB)) {
            return 1; // b là số, a là chữ → b trước
        } else {
            return a.localeCompare(b); // Cả 2 đều là chữ → sort theo alphabet
        }
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 rounded-2xl shadow-xl text-white">
                <h2 className="text-2xl font-bold mb-2">💰 Quản lý Phí Vận Chuyển</h2>
                <p className="text-green-50 text-sm">
                    Thiết lập phí ship cho từng quận/huyện tại TP.HCM
                </p>

                {/* Default Shipping Fee */}
                <div className="mt-4 bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/30">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-semibold">💡 Phí ship cho tỉnh khác:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={defaultShippingFee}
                                onChange={(e) => setDefaultShippingFee(parseInt(e.target.value) || 0)}
                                className="w-32 px-3 py-2 bg-white/90 border border-white/50 rounded-lg text-right font-bold text-green-700 focus:border-white focus:ring-2 focus:ring-white/50 outline-none"
                                step="1000"
                                min="0"
                            />
                            <span className="text-white/90 text-sm font-semibold">₫</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shipping Fees Table - SIMPLE GRID */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <span className="text-pink-500">📍</span>
                        Phí ship theo quận/huyện TP.HCM
                    </h3>

                    {/* Grid layout - 3 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sortedDistricts.map((district) => (
                            <div key={district} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-green-300 transition-all">
                                <label className="text-sm font-medium text-gray-700 flex-1">
                                    {district}
                                </label>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="number"
                                        value={fees[district] || 0}
                                        onChange={(e) => handleFeeChange(district, parseInt(e.target.value) || 0)}
                                        className="w-28 px-3 py-2 bg-white border border-gray-300 rounded-lg text-right font-semibold text-green-600 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                                        step="1000"
                                        min="0"
                                    />
                                    <span className="text-gray-400 text-xs">₫</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-4">
                <button
                    onClick={loadFees}
                    disabled={saving}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Tải lại
                </button>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                    {saving ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                            Lưu thay đổi
                        </>
                    )}
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl text-center font-semibold ${message.includes('✅')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message}
                </div>
            )}
        </div>
    );
};

export default ShippingFeesManager;
