
/**
 * Chuyển đổi chuỗi tiếng Việt có dấu sang slug không dấu, gạch ngang
 */
export const toSlug = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD') // Tách các ký tự dấu
        .replace(/[\u0300-\u036f]/g, '') // Xóa các ký tự dấu
        .replace(/[đĐ]/g, 'd') // Chuyển đ -> d
        .replace(/[^0-9a-z]/g, '-') // Thay thế các ký tự không phải chữ/số bằng gạch ngang
        .replace(/-+/g, '-') // Thay thế nhiều gạch ngang liên tiếp bằng 1
        .replace(/^-+|-+$/g, ''); // Xóa gạch ngang ở đầu và cuối
};

/**
 * Tạo slug duy nhất cho sản phẩm
 * Nếu trùng tên, thêm số thứ tự vào sau
 */
export const getProductSlug = (product: any, allProducts: any[]): string => {
    const baseSlug = toSlug(product.title);

    // Lấy tất cả sản phẩm có cùng tên (không phân biệt hoa thường) để tính số thứ tự
    const sameNameProducts = allProducts
        .filter(p => toSlug(p.title) === baseSlug)
        // Sắp xếp theo ID hoặc mốc thời gian nếu cần để đảm bảo thứ tự slug luôn cố định
        .sort((a, b) => a.id.localeCompare(b.id));

    const index = sameNameProducts.findIndex(p => p.id === product.id);

    if (index === 0 || index === -1) {
        return baseSlug;
    }

    return `${baseSlug}-${index + 1}`;
};
