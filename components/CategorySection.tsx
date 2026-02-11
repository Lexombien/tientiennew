import React, { useEffect, useRef } from 'react';
import { FlowerProduct, CategorySettings, PaginationType } from '../types';
import FlowerCard from './FlowerCard';
import { toSlug } from '../utils/slug';

interface CategorySectionProps {
    category: string;
    settings: CategorySettings;
    products: FlowerProduct[];
    currentPage: number;
    globalAspectRatio: string;
    mediaMetadata?: Record<string, { alt?: string, title?: string, description?: string }>;
    onLoadMore: () => void;
    onPageChange: (page: number) => void;
    onImageClick?: (
        images: { url: string; alt?: string; title?: string; variantId?: string }[],
        index: number,
        productInfo?: { title?: string; sku?: string; variants?: any[] }
    ) => void;
    showSKU?: boolean;
    zaloLink?: string;
    enablePriceDisplay?: boolean;
    onOrderClick?: (product: FlowerProduct) => void;
    allProducts?: FlowerProduct[]; // NEW
}

const CategorySection: React.FC<CategorySectionProps> = ({
    category,
    settings,
    products,
    currentPage,
    globalAspectRatio,
    mediaMetadata,
    onLoadMore,
    onPageChange,
    onImageClick,
    showSKU,
    zaloLink,
    enablePriceDisplay,
    onOrderClick,
    allProducts // NEW
}) => {
    const observerTarget = useRef<HTMLDivElement>(null);

    // Sort products by order and filter out hidden ones
    const sortedProducts = [...products]
        .filter(p => !p.isHidden)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

    // Pagination logic
    const itemsPerPage = settings.itemsPerPage;
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

    /**
     * TÍNH TOÁN SỐ LƯỢNG HIỂN THỊ ĐỂ LẤP ĐẦY KHOẢNG TRỐNG (Responsive Filling)
     * Mobile: 2 cột -> chia hết cho 2
     * Tablet (md): 3 cột -> chia hết cho 3
     * PC (lg): 4 cột -> chia hết cho 4
     */
    const limitMobile = Math.ceil(itemsPerPage / 2) * 2;
    const limitTablet = Math.ceil(itemsPerPage / 3) * 3;
    const limitPC = Math.ceil(itemsPerPage / 4) * 4;

    // Số lượng tối đa cần lấy từ danh sách (để phục vụ cho breakpoint cần nhiều nhất)
    const responsiveLimit = Math.max(limitMobile, limitTablet, limitPC);

    let displayProducts = sortedProducts;

    if (settings.paginationType === 'pagination') {
        // Traditional pagination: show only current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        // Cho pagination, ta giữ nguyên itemsPerPage gốc để đảm bảo trang ổn định
        displayProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);
    } else if (settings.paginationType === 'loadmore' || settings.paginationType === 'infinite') {
        // Load more / Infinite: show from start to current page
        const baseLimit = currentPage * itemsPerPage;
        const currentLimitMobile = Math.ceil(baseLimit / 2) * 2;
        const currentLimitTablet = Math.ceil(baseLimit / 3) * 3;
        const currentLimitPC = Math.ceil(baseLimit / 4) * 4;
        const currentResponsiveLimit = Math.max(currentLimitMobile, currentLimitTablet, currentLimitPC);

        displayProducts = sortedProducts.slice(0, currentResponsiveLimit);
    } else {
        // 'none': dùng responsiveLimit để lấp đầy hàng
        displayProducts = sortedProducts.slice(0, responsiveLimit);
    }

    const hasMore = displayProducts.length < sortedProducts.length;
    const effectToUse = settings.imageTransition || 'fade';

    // Infinite scroll implementation
    useEffect(() => {
        if (settings.paginationType !== 'infinite') return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [settings.paginationType, hasMore, onLoadMore]);

    if (sortedProducts.length === 0) return null;

    return (
        <section id={category} className="mb-16 scroll-mt-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4 flex-grow">
                    <a
                        href={`/${toSlug(category)}`}
                        className="no-underline hover:opacity-80 transition-opacity text-inherit"
                        onClick={(e) => {
                            if (!e.ctrlKey && !e.metaKey) {
                                e.preventDefault();
                            }
                        }}
                    >
                        <h3
                            className="text-2xl md:text-3xl font-bold gradient-text serif-display whitespace-nowrap"
                            style={{ fontFamily: 'var(--font-category-title)' }}
                        >
                            {settings.displayName || category}
                        </h3>
                    </a>
                    <div className="h-[2px] bg-gradient-to-r from-pink-300 via-purple-300 to-transparent w-full" />
                </div>
                <span
                    className="ml-4 badge-glass bg-gradient-soft text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                    style={{ color: 'var(--primary-pink)' }}
                >
                    {displayProducts.length} / {sortedProducts.length} mẫu
                </span>
            </div>

            {/* Products Flex Grid - Using flex to allow centering orphans */}
            <div className="flex flex-wrap justify-center -mx-2 md:-mx-3 lg:-mx-4">
                {displayProducts.map((flower, index) => {
                    // Logic ẩn/hiện dựa trên breakpoint để lấp đầy hàng
                    const baseLimit = (settings.paginationType === 'pagination') ? itemsPerPage : (currentPage * itemsPerPage);
                    const curLimitMobile = Math.ceil(baseLimit / 2) * 2;
                    const curLimitTablet = Math.ceil(baseLimit / 3) * 3;
                    const curLimitPC = Math.ceil(baseLimit / 4) * 4;

                    const isVisibleMobile = index < curLimitMobile;
                    const isVisibleTablet = index < curLimitTablet;
                    const isVisiblePC = index < curLimitPC;

                    // Building responsive classes
                    let visibilityClass = "";
                    if (!isVisibleMobile) visibilityClass += " hidden";
                    else visibilityClass += " block";

                    if (isVisibleTablet) visibilityClass += " md:block";
                    else visibilityClass += " md:hidden";

                    if (isVisiblePC) visibilityClass += " lg:block";
                    else visibilityClass += " lg:hidden";

                    return (
                        <div
                            key={flower.id}
                            className={`w-1/2 md:w-1/3 lg:w-1/4 p-2 md:p-3 lg:p-4 ${visibilityClass}`}
                        >
                            <FlowerCard
                                product={{
                                    ...flower,
                                    imageTransition: flower.imageTransition || effectToUse
                                }}
                                globalAspectRatio={globalAspectRatio}
                                categoryImageInterval={settings.imageInterval || 3000}
                                mediaMetadata={mediaMetadata}
                                onImageClick={onImageClick}
                                showSKU={showSKU}
                                zaloLink={zaloLink}
                                enablePriceDisplay={enablePriceDisplay}
                                onOrderClick={onOrderClick}
                                productIndex={index}
                                allProducts={allProducts}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Load More Button */}
            {settings.paginationType === 'loadmore' && hasMore && (
                <div className="flex justify-center mt-8">
                    <button
                        onClick={onLoadMore}
                        className="btn-load-more-animated"
                    >
                        <span>➕ Xem thêm sản phẩm</span>
                    </button>
                </div>
            )}

            {/* Traditional Pagination */}
            {settings.paginationType === 'pagination' && totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8 flex-wrap">
                    {/* Previous Button */}
                    <button
                        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${currentPage === 1
                            ? 'opacity-50 cursor-not-allowed glass'
                            : 'glass hover:glass-strong'
                            }`}
                    >
                        ←
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        // Show first, last, current, and adjacent pages
                        if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                            return (
                                <button
                                    key={page}
                                    onClick={() => onPageChange(page)}
                                    className={`w-12 h-12 rounded-xl font-bold transition-all ${currentPage === page
                                        ? 'bg-gradient-pink text-white shadow-lg glow-pink'
                                        : 'glass hover:glass-strong'
                                        }`}
                                >
                                    {page}
                                </button>
                            );
                        } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="px-2">...</span>;
                        }
                        return null;
                    })}

                    {/* Next Button */}
                    <button
                        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded-xl font-bold transition-all ${currentPage === totalPages
                            ? 'opacity-50 cursor-not-allowed glass'
                            : 'glass hover:glass-strong'
                            }`}
                    >
                        →
                    </button>
                </div>
            )}

            {/* Infinite Scroll Observer Target */}
            {settings.paginationType === 'infinite' && hasMore && (
                <div ref={observerTarget} className="h-20 flex items-center justify-center mt-8">
                    <div className="spinner-glass"></div>
                </div>
            )}
        </section>
    );
};

export default CategorySection;
