import React, { useState, useEffect } from 'react';
import { ImageWithMetadata } from '../types';

// Auto-detect backend URL based on environment
const isDevelopment = window.location.hostname === 'localhost' ||
    window.location.hostname.match(/^192\.168\./) ||
    window.location.hostname.match(/^10\./) ||
    window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);

const BACKEND_URL = isDevelopment
    ? `http://${window.location.hostname}:3001`
    : '';

interface MediaImage {
    filename: string;
    url: string;
    size: number;
    uploadedAt: string;
}

interface MediaLibraryPickerProps {
    onSelect: (images: ImageWithMetadata[]) => void;
    onCancel: () => void;
    multiSelect?: boolean;
    productTitle?: string;
}

const MediaLibraryPicker: React.FC<MediaLibraryPickerProps> = ({
    onSelect,
    onCancel,
    multiSelect = true,
    productTitle = ''
}) => {
    const [images, setImages] = useState<MediaImage[]>([]);
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadImages();
    }, []);

    const loadImages = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/media`);
            if (!response.ok) throw new Error('Failed to load images');
            const data = await response.json();
            // Sort by uploadedAt descending (newest first)
            const sorted = data.sort((a: MediaImage, b: MediaImage) =>
                new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
            );
            setImages(sorted);
        } catch (error) {
            console.error('Error loading images:', error);
            alert('❌ Không thể tải thư viện ảnh');
        } finally {
            setLoading(false);
        }
    };

    const toggleImage = (filename: string) => {
        const newSelected = new Set(selectedImages);
        if (newSelected.has(filename)) {
            newSelected.delete(filename);
        } else {
            if (!multiSelect) {
                newSelected.clear();
            }
            newSelected.add(filename);
        }
        setSelectedImages(newSelected);
    };

    const handleConfirm = () => {
        const selectedImageData: ImageWithMetadata[] = images
            .filter(img => selectedImages.has(img.filename))
            .map(img => ({
                url: img.url,
                filename: img.filename,
                alt: productTitle || '',
                title: productTitle || '',
                variantId: ''
            }));
        onSelect(selectedImageData);
    };

    const filteredImages = images.filter(img =>
        img.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden glass-strong rounded-3xl border border-white/30 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/20 blur-backdrop">
                    <div>
                        <h2 className="text-2xl font-bold serif-display gradient-text">
                            📚 Thư viện ảnh
                        </h2>
                        <p className="text-xs mt-1 opacity-70">
                            {selectedImages.size > 0
                                ? `Đã chọn ${selectedImages.size} ảnh`
                                : 'Chọn ảnh từ thư viện để thêm vào sản phẩm'}
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="pill-button glass px-4 py-2 hover:glass-strong transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/10">
                    <input
                        type="text"
                        placeholder="🔍 Tìm kiếm theo tên file..."
                        className="glass-input w-full rounded-xl px-4 py-3 text-sm font-semibold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="text-center py-12">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-sm opacity-60">
                                {searchQuery ? 'Không tìm thấy ảnh nào' : 'Thư viện trống'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredImages.map((img) => {
                                const isSelected = selectedImages.has(img.filename);
                                return (
                                    <div
                                        key={img.filename}
                                        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${isSelected
                                                ? 'border-pink-500 shadow-[0_0_20px_rgba(255,107,157,0.5)] scale-95'
                                                : 'border-white/30 hover:border-pink-300'
                                            }`}
                                        onClick={() => toggleImage(img.filename)}
                                    >
                                        <div className="aspect-square">
                                            <img
                                                src={img.url}
                                                alt={img.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        {/* Selection Overlay */}
                                        {isSelected && (
                                            <div className="absolute inset-0 bg-pink-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                                <div className="bg-pink-500 text-white rounded-full p-2">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        )}

                                        {/* Info Overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-white text-[9px] font-bold truncate">
                                                {img.filename}
                                            </p>
                                            <p className="text-white/70 text-[8px]">
                                                {formatSize(img.size)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/20 flex flex-col sm:flex-row gap-3 justify-between items-center">
                    <p className="text-xs opacity-70">
                        Tổng: {filteredImages.length} ảnh
                    </p>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <button
                            onClick={onCancel}
                            className="pill-button glass px-6 py-3 text-sm font-bold hover:glass-strong flex-1 sm:flex-none"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedImages.size === 0}
                            className="pill-button bg-gradient-pink !text-white px-8 py-3 text-sm font-bold shadow-xl hover-glow-pink disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                        >
                            Thêm {selectedImages.size > 0 ? `(${selectedImages.size})` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MediaLibraryPicker;
