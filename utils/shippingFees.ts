/**
 * Bảng phí ship theo quận/huyện TP.HCM
 * 
 * Cách sử dụng:
 * import { calculateShippingFee } from './utils/shippingFees';
 * const fee = calculateShippingFee(order);
 */

export interface Order {
    isHCMAddress?: boolean;
    district?: string;
    productPrice: number;
    // ... other fields
}

/**
 * Phí ship cho từng quận/huyện tại TP.HCM (VNĐ)
 * Bạn có thể điều chỉnh giá theo nhu cầu
 */
export const HCM_SHIPPING_FEES: Record<string, number> = {
    // Quận nội thành (25-30k)
    'Quận 1': 25000,
    'Quận 3': 25000,
    'Quận 4': 25000,
    'Quận 5': 25000,
    'Quận 10': 25000,
    'Quận Phú Nhuận': 25000,

    // Quận trung tâm mở rộng (30-35k)
    'Quận 2': 30000,
    'Quận 6': 30000,
    'Quận 11': 30000,
    'Quận Bình Thạnh': 30000,
    'Quận Tân Bình': 30000,

    // Quận xa trung tâm (35-40k)
    'Quận 7': 35000,
    'Quận 8': 35000,
    'Quận Bình Tân': 35000,
    'Quận Gò Vấp': 35000,
    'Quận Tân Phú': 35000,

    // Quận xa và Thủ Đức (40k)
    'Quận 9': 40000,
    'Quận 12': 40000,
    'Quận Thủ Đức': 40000,

    // Huyện ngoại thành (45-70k)
    'Huyện Nhà Bè': 45000,
    'Huyện Bình Chánh': 50000,
    'Huyện Hóc Môn': 50000,
    'Huyện Củ Chi': 60000,
    'Huyện Cần Giờ': 70000,
};

/**
 * Phí ship mặc định cho tỉnh khác hoặc không xác định
 */
export const DEFAULT_SHIPPING_FEE = 50000;

/**
 * Tính phí ship dựa trên thông tin đơn hàng
 * @param order - Object đơn hàng
 * @returns Phí ship (VNĐ)
 * 
 * @example
 * const order = {
 *   isHCMAddress: true,
 *   district: 'Quận 1',
 *   productPrice: 500000
 * };
 * const fee = calculateShippingFee(order); // Returns 25000
 */
export function calculateShippingFee(order: Order): number {
    // Nếu là HCM và có chọn quận
    if (order.isHCMAddress && order.district) {
        return HCM_SHIPPING_FEES[order.district] || DEFAULT_SHIPPING_FEE;
    }

    // Tỉnh khác hoặc không xác định
    return DEFAULT_SHIPPING_FEE;
}

/**
 * Tính tổng tiền đơn hàng (sản phẩm + ship)
 * @param order - Object đơn hàng
 * @returns Tổng tiền (VNĐ)
 */
export function calculateTotalAmount(order: Order): number {
    const shippingFee = calculateShippingFee(order);
    return order.productPrice + shippingFee;
}

/**
 * Format giá tiền theo định dạng VNĐ
 * @param amount - Số tiền
 * @returns Chuỗi đã format
 * 
 * @example
 * formatPrice(25000) // Returns "25.000 ₫"
 */
export function formatPrice(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

/**
 * Lấy danh sách tất cả quận/huyện có trong hệ thống
 * @returns Array các tên quận/huyện
 */
export function getAllDistricts(): string[] {
    return Object.keys(HCM_SHIPPING_FEES);
}

/**
 * Kiểm tra xem quận có tồn tại trong hệ thống không
 * @param district - Tên quận
 * @returns true nếu tồn tại
 */
export function isValidDistrict(district: string): boolean {
    return district in HCM_SHIPPING_FEES;
}
