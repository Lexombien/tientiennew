
import React, { useState, useEffect } from 'react';
import { FLOWERS_SAMPLES, ZALO_NUMBER, DEFAULT_CATEGORIES } from './constants';
import { FlowerProduct, CategorySettings, PaginationType, ImageTransitionEffect, ImageWithMetadata } from './types';
import FlowerCard from './components/FlowerCard';
import CategorySettingsModal from './components/CategorySettingsModal';
import CategoryEditModal from './components/CategoryEditModal';
import CategorySection from './components/CategorySection';
import ImageUploadWithMetadata from './components/ImageUploadWithMetadata';
import MediaLibrary from './components/MediaLibrary';
import ImageLightbox from './components/ImageLightbox';
import ProductOrderModal from './components/ProductOrderModal';
import ProductFormModal from './components/ProductFormModal';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import OrdersManagement from './components/OrdersManagement';
import OrderTrackingModal from './components/OrderTrackingModal';
import ShippingFeesManager from './components/ShippingFeesManager';
import FacebookPagePlugin from './components/FacebookPagePlugin';
import { loadAnalyticsData, trackPageView, trackProductClick, exportAnalytics, clearAllAnalytics, clearOldAnalytics } from './utils/analytics';

// Auto-detect backend URL based on environment
// Development: localhost or LAN IP (192.168.x.x, 10.x.x.x, etc.)
// Production: deployed with Nginx proxy
const isDevelopment = window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.match(/^192\.168\./) ||
  window.location.hostname.match(/^10\./) ||
  window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./); // Private IP ranges

const BACKEND_URL = isDevelopment
  ? `http://${window.location.hostname}:3001`  // Development: use same host with backend port
  : '';  // Production: use same origin (Nginx proxy)

const DEFAULT_GLOBAL_SETTINGS = {
  // Display Settings
  aspectRatio: '3/4',
  customValue: '',
  showSKU: false,
  zaloLink: `https://zalo.me/${ZALO_NUMBER}`,
  phoneNumber: '0900000000',

  // Theme Settings
  themeColor: 'pink',

  // Branding
  websiteName: 'HoasapHCM.vn',
  logoUrl: '',
  useImageLogo: false, // NEW: Toggle between Image and Text logo
  logoSizeDesktop: 'h-12',
  logoSizeMobile: 'h-10',
  faviconUrl: '',
  socialShareImage: '', // NEW: Social Share Image
  websiteUrl: 'https://hoasaphcm.vn', // NEW: Website URL for canonical/og:url

  // Footer Settings
  footerTitle: '', // Tiêu đề footer (nếu trống sẽ dùng websiteName)
  footerDescription: 'Tiệm hoa cao cấp - Nơi khởi nguồn của những cảm xúc chân thành nhất qua từng đóa hoa tươi.',
  footerCopyright: '© 2024 Tiệm Hoa Cao Cấp. All rights reserved.',

  // SEO Meta Tags
  seoTitle: 'Tiệm Hoa Cao Cấp - Hoa Tươi Đẹp',
  seoDescription: 'Chuyên cung cấp hoa tươi cao cấp, bó hoa đẹp, giao hoa tận nơi tại TP.HCM',
  seoKeywords: 'hoa tươi, bó hoa, tiệm hoa, hoa sinh nhật, hoa tươi đẹp',

  // Feature Toggles
  enableLightbox: true,
  enablePriceDisplay: true,

  // Google Fonts
  fontTitle: 'Playfair Display',
  fontCategoryTitle: 'Playfair Display',
  fontPrice: 'Roboto',
  fontBody: 'Inter',

  // Custom Fonts
  customFonts: [] as { name: string; url: string }[],

  // Custom CSS
  customCSS: '',

  // Notifications (Marquee)
  showNotifications: false,
  notifications: [] as string[], // Array of strings
  notificationSpeed: 15, // seconds

  // Zalo Bot Settings
  zaloBotToken: '',
  zaloAdminIds: '',

  // NEW: Holiday/Busy Mode Settings
  holidayMode: false,
  holidayInterval: 120, // default 2 hours (120 minutes)
  holidayTimeBlockMode: false, // NEW: Chọn buổi (Sáng, Trưa, Chiều, Tối)

  // NEW: Coupon Settings
  coupons: [] as { code: string; discountPercent: number }[],

  // Facebook Page Settings
  facebookPageUrl: '', // URL của Facebook Fanpage
  showFacebookWidget: false, // Hiển thị widget Facebook hay không
};

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState(window.location.hash);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const [products, setProducts] = useState<FlowerProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<FlowerProduct> | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [draggedProduct, setDraggedProduct] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // NEW: admin tabs - EXPANDED with 'orders', 'settings', and 'shipping'
  const [activeTab, setActiveTab] = useState<'products' | 'media' | 'css' | 'analytics' | 'orders' | 'settings' | 'shipping'>('products');

  // NEW: Global Media Metadata (SEO)
  const [mediaMetadata, setMediaMetadata] = useState<Record<string, { alt?: string, title?: string, description?: string }>>({});

  // NEW: Analytics Data (loaded from server)
  const [analyticsData, setAnalyticsData] = useState<{ pageViews: any[], productClicks: any[], sessionStart?: number }>({
    pageViews: [],
    productClicks: [],
    sessionStart: Date.now()
  });

  // NEW: Category Settings State
  const [categorySettings, setCategorySettings] = useState<Record<string, CategorySettings>>({});
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false);
  const [showCategorySettingsModal, setShowCategorySettingsModal] = useState(false); // NEW: Settings modal

  // NEW: Pagination state for each category
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    categories: true,    // Mặc định mở
    productForm: false,  // Mặc định đóng
    inventory: true,     // Mặc định mở
    settings: false,     // Mặc định đóng
    categorySettings: false  // NEW: Category settings section
  });

  const toggleSection = (section: 'categories' | 'productForm' | 'inventory' | 'settings' | 'categorySettings') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const [newFontName, setNewFontName] = useState('');

  // Global Settings với giá trị mặc định tiếng Việt chuẩn
  const [globalSettings, setGlobalSettings] = useState(() => {
    // Load from localStorage and merge with defaults
    const saved = localStorage.getItem('global_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge với defaults để đảm bảo tất cả trường đều tồn tại
        return { ...DEFAULT_GLOBAL_SETTINGS, ...parsed };
      } catch (e) {
        console.error('Failed to parse global_settings:', e);
        // Clear corrupted data
        localStorage.removeItem('global_settings');
      }
    }

    // Fallback to defaults
    return DEFAULT_GLOBAL_SETTINGS;
  });

  // Lightbox State
  const [lightboxData, setLightboxData] = useState<{
    images: { url: string; alt?: string; title?: string; variantId?: string }[];
    index: number;
    isOpen: boolean;
    productTitle?: string;
    productSKU?: string;
    variants?: FlowerProduct['variants'];
  }>({
    images: [],
    index: 0,
    isOpen: false
  });

  const openLightbox = (
    images: { url: string; alt?: string; title?: string; variantId?: string }[],
    index: number = 0,
    productInfo?: { title?: string; sku?: string; variants?: any[] }
  ) => {
    setLightboxData({
      images,
      index,
      isOpen: true,
      productTitle: productInfo?.title,
      productSKU: productInfo?.sku,
      variants: productInfo?.variants
    });
  };

  // Order Modal State
  const [orderModalProduct, setOrderModalProduct] = useState<FlowerProduct | null>(null);
  const [showOrderTracking, setShowOrderTracking] = useState(false);

  // Apply Theme Color Dynamically
  useEffect(() => {
    const themeColors = {
      pink: { primary: '#FF6B9D', secondary: '#BD5FFF', accent: '#FF8A5B' },
      purple: { primary: '#BD5FFF', secondary: '#9D4EDD', accent: '#A78BFA' },
      blue: { primary: '#4F9FFF', secondary: '#3B82F6', accent: '#60A5FA' },
      green: { primary: '#4ADE80', secondary: '#10B981', accent: '#34D399' },
      orange: { primary: '#FF8A5B', secondary: '#F97316', accent: '#FB923C' }
    };

    const colors = themeColors[globalSettings.themeColor as keyof typeof themeColors] || themeColors.pink;

    // Update CSS variables
    document.documentElement.style.setProperty('--primary-pink', colors.primary);
    document.documentElement.style.setProperty('--primary-fuchsia', colors.primary);
    document.documentElement.style.setProperty('--secondary-purple', colors.secondary);
    document.documentElement.style.setProperty('--accent-orange', colors.accent);
  }, [globalSettings.themeColor]);

  // Apply SEO Meta Tags
  useEffect(() => {
    document.title = globalSettings.seoTitle || 'Floral Essence';

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', globalSettings.seoDescription);

    // Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', globalSettings.seoKeywords);
  }, [globalSettings.seoTitle, globalSettings.seoDescription, globalSettings.seoKeywords]);

  // Apply Custom CSS
  useEffect(() => {
    const styleId = 'custom-css-inject';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;

    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    styleElement.textContent = globalSettings.customCSS;
  }, [globalSettings.customCSS]);

  // Apply Favicon Dynamically
  useEffect(() => {
    if (globalSettings.faviconUrl) {
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;

      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }

      // Fix cache by adding timestamp
      link.href = `${globalSettings.faviconUrl}?v=${Date.now()}`;
    }
  }, [globalSettings.faviconUrl]);

  // Load Google Fonts Dynamically
  useEffect(() => {
    const fonts = [globalSettings.fontTitle, globalSettings.fontCategoryTitle, globalSettings.fontPrice, globalSettings.fontBody];
    const customFontNames = (globalSettings.customFonts || []).map(f => f.name);

    // Filter out custom fonts from Google Fonts request
    const uniqueGoogleFonts = [...new Set(fonts)].filter(f => !customFontNames.includes(f));

    // Create Google Fonts link
    const fontLink = uniqueGoogleFonts.map(font => font.replace(/ /g, '+')).join('&family=');
    const linkId = 'google-fonts-link';

    let link = document.getElementById(linkId) as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }

    if (uniqueGoogleFonts.length > 0) {
      link.href = `https://fonts.googleapis.com/css2?${uniqueGoogleFonts.map(f => `family=${f.replace(/ /g, '+')}`).join('&')}&display=swap`;
    }

    // Handle Custom Fonts
    const customFontId = 'custom-font-face';
    let customFontStyle = document.getElementById(customFontId) as HTMLStyleElement;

    if (globalSettings.customFonts && globalSettings.customFonts.length > 0) {
      if (!customFontStyle) {
        customFontStyle = document.createElement('style');
        customFontStyle.id = customFontId;
        document.head.appendChild(customFontStyle);
      }

      const fontFaces = globalSettings.customFonts.map(font => `
        @font-face {
          font-family: '${font.name}';
          src: url('${font.url}') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
      `).join('\n');

      customFontStyle.textContent = fontFaces;
    } else if (customFontStyle) {
      customFontStyle.remove();
    }

    // Apply fonts via CSS variables
    document.documentElement.style.setProperty('--font-title', globalSettings.fontTitle);
    document.documentElement.style.setProperty('--font-category-title', globalSettings.fontCategoryTitle || globalSettings.fontTitle);
    document.documentElement.style.setProperty('--font-price', globalSettings.fontPrice);
    document.documentElement.style.setProperty('--font-body', globalSettings.fontBody);
  }, [globalSettings.fontTitle, globalSettings.fontCategoryTitle, globalSettings.fontPrice, globalSettings.fontBody, globalSettings.customFonts]);

  // Register Service Worker for PWA Caching (DISABLED to prevent notification prompts)
  // useEffect(() => {
  //   if ('serviceWorker' in navigator) {
  //     window.addEventListener('load', () => {
  //       navigator.serviceWorker.register('/sw.js')
  //         .then((registration) => {
  //           console.log('✅ SW registered:', registration);
  //         })
  //         .catch((error) => {
  //           console.log('❌ SW registration failed:', error);
  //         });
  //     });
  //   }
  // }, []);

  // Theo dõi thay đổi URL (Hash routing: #admin)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Khởi tạo dữ liệu từ LocalStorage
  useEffect(() => {
    const authStatus = sessionStorage.getItem('admin_auth');
    if (authStatus === 'true') setIsAuthenticated(true);

    // Load products with error handling
    try {
      const savedProducts = localStorage.getItem('flowers_data');
      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        setProducts([]); // Empty array instead of FLOWERS_SAMPLES
      }
    } catch (e) {
      console.error('Failed to parse flowers_data:', e);
      localStorage.removeItem('flowers_data');
      setProducts([]);
    }

    // Load categories with error handling
    try {
      const savedCategories = localStorage.getItem('categories_data');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      } else {
        setCategories(DEFAULT_CATEGORIES);
        localStorage.setItem('categories_data', JSON.stringify(DEFAULT_CATEGORIES));
      }
    } catch (e) {
      console.error('Failed to parse categories_data:', e);
      localStorage.removeItem('categories_data');
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem('categories_data', JSON.stringify(DEFAULT_CATEGORIES));
    }

    // Load settings with error handling (already handled in useState, but double-check here)
    try {
      const savedSettings = localStorage.getItem('global_settings');
      if (savedSettings) {
        setGlobalSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      } else {
        localStorage.setItem('global_settings', JSON.stringify(globalSettings));
      }
    } catch (e) {
      console.error('Failed to parse global_settings:', e);
      localStorage.removeItem('global_settings');
      localStorage.setItem('global_settings', JSON.stringify(globalSettings));
    }

    // NEW: Initialize category settings with error handling
    try {
      const savedCategorySettings = localStorage.getItem('category_settings');
      if (savedCategorySettings) {
        setCategorySettings(JSON.parse(savedCategorySettings));
      } else {
        // Create default settings for each category
        const defaultCategorySettings: Record<string, CategorySettings> = {};
        DEFAULT_CATEGORIES.forEach(cat => {
          defaultCategorySettings[cat] = {
            name: cat,
            itemsPerPage: 8,
            paginationType: 'none',
            imageTransition: 'fade'
          };
        });
        setCategorySettings(defaultCategorySettings);
        localStorage.setItem('category_settings', JSON.stringify(defaultCategorySettings));
      }
    } catch (e) {
      console.error('Failed to parse category_settings:', e);
      localStorage.removeItem('category_settings');
      const defaultCategorySettings: Record<string, CategorySettings> = {};
      DEFAULT_CATEGORIES.forEach(cat => {
        defaultCategorySettings[cat] = {
          name: cat,
          itemsPerPage: 8,
          paginationType: 'none',
          imageTransition: 'fade'
        };
      });
      setCategorySettings(defaultCategorySettings);
      localStorage.setItem('category_settings', JSON.stringify(defaultCategorySettings));
    }


    // AUTO-LOAD FROM SERVER (để user luôn thấy data mới nhất!)
    const loadDataFromServer = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/database`);
        const result = await response.json();

        if (result.success && result.data) {
          // Update states with server data
          if (result.data.products && result.data.products.length > 0) {
            setProducts(result.data.products);
            localStorage.setItem('flowers_data', JSON.stringify(result.data.products));
          }
          if (result.data.categories && result.data.categories.length > 0) {
            setCategories(result.data.categories);
            localStorage.setItem('categories_data', JSON.stringify(result.data.categories));
          }
          if (result.data.settings) {
            // Merge defaults with server data and then with current state
            const mergedSettings = { ...DEFAULT_GLOBAL_SETTINGS, ...result.data.settings };
            setGlobalSettings(mergedSettings);
            localStorage.setItem('global_settings', JSON.stringify(mergedSettings));
          }
          if (result.data.categorySettings) {
            setCategorySettings(result.data.categorySettings);
            localStorage.setItem('category_settings', JSON.stringify(result.data.categorySettings));
          }
          if (result.data.media) {
            setMediaMetadata(result.data.media);
          }

          console.log('✅ Đã tải data từ server thành công!');
        }
      } catch (error) {
        // Nếu server không chạy hoặc lỗi, dùng localStorage (đã load ở trên)
        console.log('ℹ️ Không kết nối được server, dùng localStorage');
      }
    };

    // Load từ server ngay khi app khởi động
    loadDataFromServer();
  }, []);

  // Track page views for analytics
  useEffect(() => {
    // Only track on homepage (not admin panel)
    if (currentPath !== '#admin') {
      trackPageView(currentPath);
    }
  }, [currentPath]);

  // Load analytics data when analytics tab is active
  useEffect(() => {
    if (isAuthenticated && activeTab === 'analytics') {
      loadAnalyticsData().then(data => {
        setAnalyticsData(data);
      });
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_auth', 'true');
        setLoginError('');
      } else {
        setLoginError(data.error || 'Sai tài khoản hoặc mật khẩu!');
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('Lỗi kết nối đến server!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('admin_auth');
    window.location.hash = '';
  };

  const saveProducts = (newProducts: FlowerProduct[]) => {
    setProducts(newProducts);
    localStorage.setItem('flowers_data', JSON.stringify(newProducts));

    // Tự động đồng bộ lên server (Auto-save)
    fetch(`${BACKEND_URL}/api/database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products: newProducts,
        categories,
        settings: globalSettings,
        categorySettings,
        media: mediaMetadata,
        zaloNumber: ZALO_NUMBER
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('☁️ Đã tự động lưu lên server!');
          setLastSyncTime(new Date().toLocaleString('vi-VN'));
        }
      })
      .catch(err => console.error('❌ Lỗi auto-save:', err));
  };

  // NEW: Save Global Settings and Sync
  const saveGlobalSettings = (newSettings: any) => {
    setGlobalSettings(newSettings);
    localStorage.setItem('global_settings', JSON.stringify(newSettings));

    // Sync to server
    fetch(`${BACKEND_URL}/api/database`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        products,
        categories,
        settings: newSettings,
        categorySettings,
        media: mediaMetadata,
        zaloNumber: ZALO_NUMBER
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('☁️ Settings saved to server!');
        }
      })
      .catch(err => console.error('❌ Settings sync failed:', err));
  };

  const saveCategories = (newCats: string[]) => {
    setCategories(newCats);
    localStorage.setItem('categories_data', JSON.stringify(newCats));

    // Sync to server
    fetch(`${BACKEND_URL}/api/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products,
        categories: newCats,
        settings: globalSettings,
        categorySettings,
        zaloNumber: ZALO_NUMBER
      })
    }).catch(err => console.error('Categories sync failed:', err));
  };

  // Hàm helper dùng chung để lọc sản phẩm theo danh mục (hỗ trợ cả multi-category)
  const getProductsInCategory = (categoryName: string, productList: FlowerProduct[]) => {
    const target = categoryName.trim().toLowerCase();
    return productList.filter(f => {
      // Kiểm tra trong trường category đơn lẻ (tương thích ngược)
      const inPrimary = f.category?.trim().toLowerCase() === target;

      // Kiểm tra trong mảng categories (hỗ trợ đa danh mục)
      const inMulti = f.categories?.some(c => c.trim().toLowerCase() === target);

      return inPrimary || inMulti;
    });
  };

  const handleAddOrUpdateProduct = (productOrEvent: React.FormEvent | FlowerProduct) => {
    // Support both old form event and new direct product parameter
    let productToSave: FlowerProduct;

    if ('preventDefault' in productOrEvent) {
      // Old way: form event
      productOrEvent.preventDefault();
      if (!editingProduct) return;
      productToSave = editingProduct as FlowerProduct;
    } else {
      // New way: direct product from ProductFormModal
      productToSave = productOrEvent;
    }

    const updated = [...products];
    if (productToSave.id && products.some(p => p.id === productToSave.id)) {
      // Update existing
      const index = updated.findIndex(p => p.id === productToSave.id);
      updated[index] = productToSave;
    } else {
      // Add new
      const newProd = {
        ...productToSave,
        id: productToSave.id || Date.now().toString(),
        images: productToSave.images || [],
        imagesWithMetadata: productToSave.imagesWithMetadata || []
      };
      updated.unshift(newProd);
    }
    saveProducts(updated);
    setEditingProduct(null);
    setShowEditModal(false);
  };

  const openEditModal = (product: FlowerProduct) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setEditingProduct(null);
    setShowEditModal(false);
  };

  const handleUploadProductImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();

      if (result.success && result.url) {
        return result.url;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const deleteProduct = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa sản phẩm này?')) {
      saveProducts(products.filter(p => p.id !== id));
    }
  };

  const addCategory = () => {
    if (newCategoryName && !categories.includes(newCategoryName)) {
      saveCategories([...categories, newCategoryName]);
      setNewCategoryName('');
    }
  };

  const deleteCategory = (cat: string) => {
    if (confirm(`Xóa danh mục "${cat}" sẽ làm ẩn các sản phẩm thuộc mục này. Tiếp tục?`)) {
      saveCategories(categories.filter(c => c !== cat));
    }
  };

  const moveCategoryUp = (index: number) => {
    if (index > 0) {
      const newCats = [...categories];
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
      saveCategories(newCats);
    }
  };

  const moveCategoryDown = (index: number) => {
    if (index < categories.length - 1) {
      const newCats = [...categories];
      [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
      saveCategories(newCats);
    }
  };

  const saveCategorySettings = (newSettings: Record<string, CategorySettings>) => {
    setCategorySettings(newSettings);
    localStorage.setItem('category_settings', JSON.stringify(newSettings));

    // Sync to server
    fetch(`${BACKEND_URL}/api/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products,
        categories,
        settings: globalSettings,
        categorySettings: newSettings,
        zaloNumber: ZALO_NUMBER
      })
    }).catch(err => console.error('Category settings sync failed:', err));
  };

  const updateCategorySettings = (categoryName: string, updates: Partial<CategorySettings>) => {
    const updated = {
      ...categorySettings,
      [categoryName]: {
        ...categorySettings[categoryName],
        ...updates
      }
    };
    saveCategorySettings(updated);
  };

  const openCategoryEditModal = (categoryName: string) => {
    setEditingCategory(categoryName);
    setShowCategoryEditModal(true);
  };

  const closeCategoryEditModal = () => {
    setEditingCategory(null);
    setShowCategoryEditModal(false);
  };

  const renameCategoryInSettings = (oldName: string, newName: string) => {
    if (oldName === newName) return;

    // 1. Prepare new data
    const newCategories = categories.map(c => c === oldName ? newName : c);

    const newCategorySettings = { ...categorySettings };

    // Ép buộc cập nhật hoặc tạo mới settings cho tên mới
    newCategorySettings[newName] = {
      ...(newCategorySettings[oldName] || {
        itemsPerPage: 12,
        paginationType: 'loadmore',
        imageTransition: 'none'
      }),
      name: newName,
      displayName: newName // Ép buộc tên hiển thị mới phải bằng tên vừa đổi
    };

    // Xóa bỏ settings của tên cũ để tránh rác dữ liệu
    if (oldName !== newName) {
      delete newCategorySettings[oldName];
    }

    const updatedProducts = products.map(p => {
      let updated = { ...p };
      let changed = false;
      const oldLower = oldName.trim().toLowerCase();

      // Update single category
      if (p.category?.trim().toLowerCase() === oldLower) {
        updated.category = newName;
        changed = true;
      }

      // Update multiple categories array
      if (p.categories && p.categories.some(c => c.trim().toLowerCase() === oldLower)) {
        updated.categories = p.categories.map(c =>
          c.trim().toLowerCase() === oldLower ? newName : c
        );
        changed = true;
      } else if (p.category?.trim().toLowerCase() === oldLower && (!p.categories || p.categories.length === 0)) {
        // Nếu không có categories nhưng category lại khớp, thì tạo luôn categories cho sp đó
        updated.categories = [newName];
        changed = true;
      }

      return changed ? updated : p;
    });

    // 2. Update local state
    setCategories(newCategories);
    setCategorySettings(newCategorySettings);
    setProducts(updatedProducts);

    // 3. Update localStorage
    localStorage.setItem('categories_data', JSON.stringify(newCategories));
    localStorage.setItem('category_settings', JSON.stringify(newCategorySettings));
    localStorage.setItem('flowers_data', JSON.stringify(updatedProducts));

    // 4. BIG SYNC: Send everything to server at once to ensure consistency
    fetch(`${BACKEND_URL}/api/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        products: updatedProducts,
        categories: newCategories,
        settings: globalSettings,
        categorySettings: newCategorySettings,
        zaloNumber: ZALO_NUMBER
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Rename sync successful');
          setLastSyncTime(new Date().toLocaleString('vi-VN'));
        }
      })
      .catch(err => console.error('Rename sync failed:', err));
  };

  // Pagination helpers
  const loadMoreProducts = (categoryName: string) => {
    const currentPage = categoryPages[categoryName] || 1;
    setCategoryPages(prev => ({
      ...prev,
      [categoryName]: currentPage + 1
    }));
  };

  const resetCategoryPage = (categoryName: string) => {
    setCategoryPages(prev => ({
      ...prev,
      [categoryName]: 1
    }));
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, category: string) => {
    setDraggedCategory(category);
    e.dataTransfer.effectAllowed = 'move';
    // Add a subtle visual effect
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedCategory(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();

    if (!draggedCategory || draggedCategory === targetCategory) return;

    const newCats = [...categories];
    const draggedIndex = newCats.indexOf(draggedCategory);
    const targetIndex = newCats.indexOf(targetCategory);

    // Remove dragged item and insert at target position
    newCats.splice(draggedIndex, 1);
    newCats.splice(targetIndex, 0, draggedCategory);

    saveCategories(newCats);
    setDraggedCategory(null);
  };

  // Product Drag & Drop handlers
  const handleProductDragStart = (e: React.DragEvent, productId: string) => {
    setDraggedProduct(productId);
    e.dataTransfer.effectAllowed = 'move';
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleProductDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedProduct(null);
  };

  const handleProductDrop = (e: React.DragEvent, targetProductId: string, category: string) => {
    e.preventDefault();

    if (!draggedProduct || draggedProduct === targetProductId) return;

    // Get products in this category only
    const categoryProducts = products.filter(p => p.category === category);
    const otherProducts = products.filter(p => p.category !== category);

    const draggedIndex = categoryProducts.findIndex(p => p.id === draggedProduct);
    const targetIndex = categoryProducts.findIndex(p => p.id === targetProductId);

    // Reorder within category
    const reordered = [...categoryProducts];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Update order numbers
    const updatedCategoryProducts = reordered.map((p, index) => ({
      ...p,
      order: index
    }));

    // Combine and save
    saveProducts([...otherProducts, ...updatedCategoryProducts]);
    setDraggedProduct(null);
  };

  // NEW: Handle image deletion from Media Library
  const handleImageDeletedFromLibrary = (deletedFilename: string) => {
    console.log(`🧹 Đang dọn dẹp sản phẩm chứa ảnh bị xóa: ${deletedFilename}`);

    let productsUpdated = false;
    let latestUpdatedProducts: FlowerProduct[] = [];

    // Sử dụng functional update để đảm bảo lấy list sản phẩm mới nhất
    setProducts(prevProducts => {
      const updated = prevProducts.map(product => {
        // Kiểm tra xem sản phẩm có chứa ảnh này không
        const hasLegacy = product.images.some(url => url.includes(deletedFilename));
        const hasMeta = product.imagesWithMetadata?.some(img => img.url.includes(deletedFilename));

        if (hasLegacy || hasMeta) {
          productsUpdated = true;
          return {
            ...product,
            images: product.images.filter(url => !url.includes(deletedFilename)),
            imagesWithMetadata: product.imagesWithMetadata?.filter(img => !img.url.includes(deletedFilename))
          };
        }
        return product;
      });
      latestUpdatedProducts = updated;
      localStorage.setItem('flowers_data', JSON.stringify(updated));
      return updated;
    });

    // Cập nhật metadata
    let latestMetadata: Record<string, any> = {};
    setMediaMetadata(prev => {
      const next = { ...prev };
      delete next[deletedFilename];
      latestMetadata = next;
      return next;
    });

    // TỰ ĐỘNG SYNC VỚI SERVER
    const syncWithServer = async () => {
      if (!productsUpdated) {
        console.log('ℹ️ Không có sản phẩm nào bị ảnh hưởng, chỉ cập nhật metadata.');
      }

      try {
        const fullData = {
          products: latestUpdatedProducts.length > 0 ? latestUpdatedProducts : products,
          categories: categories,
          settings: globalSettings,
          categorySettings: categorySettings,
          media: latestMetadata
        };

        await fetch(`${BACKEND_URL}/api/database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullData)
        });
        console.log('☁️ Đã tự động đồng bộ dọn dẹp lên server!');
      } catch (e) {
        console.error('❌ Tự động đồng bộ dọn dẹp thất bại:', e);
      }
    };

    // Chạy đồng bộ sau một khoảng ngắn để đảm bảo state đã được set
    setTimeout(syncWithServer, 100);

    console.log('✅ Đã dọn dẹp xong dữ liệu sản phẩm!');
  };

  // Hàm xử lý cuộn mượt tới danh mục
  const scrollToCategory = (cat: string) => {
    setIsMobileMenuOpen(false); // Đóng menu mobile nếu đang mở
    const element = document.getElementById(cat);
    if (element) {
      // Only account for fixed header height
      const header = document.querySelector('header') as HTMLElement;
      const headerHeight = header ? header.offsetHeight : 64;
      const offset = headerHeight + 16; // header + small margin

      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // GIAO DIỆN ĐĂNG NHẬP ADMIN (KHI VÀO #admin)
  if (currentPath === '#admin' && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pattern p-4">
        <div className="max-w-md w-full glass-strong rounded-[2rem] shadow-2xl p-10 border border-white/30">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-sunset rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg glow-pink pulse-glow">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-3xl font-bold serif-display gradient-text">Quản trị viên</h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Vui lòng đăng nhập để quản lý cửa hàng</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>Tài khoản</label>
              <input
                type="text"
                required
                className="glass-input w-full rounded-2xl px-5 py-4 text-sm"
                placeholder="admin"
                value={loginData.username}
                onChange={e => setLoginData({ ...loginData, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 ml-1" style={{ color: 'var(--text-secondary)' }}>Mật khẩu</label>
              <input
                type="password"
                required
                className="glass-input w-full rounded-2xl px-5 py-4 text-sm"
                placeholder="••••••••"
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>
            {loginError && (
              <div className="glass-pink text-sm font-semibold px-4 py-3 rounded-xl border border-pink-300 animate-pulse" style={{ color: 'var(--primary-fuchsia)' }}>
                {loginError}
              </div>
            )}
            <button type="submit" className="pill-button w-full bg-gradient-pink text-white py-4 font-bold shadow-xl hover-glow-pink active:scale-[0.98]">
              Đăng nhập hệ thống
            </button>
            <button
              type="button"
              onClick={() => window.location.hash = ''}
              className="w-full text-center text-xs hover:text-[var(--primary-pink)] mt-4 transition-all font-semibold"
              style={{ color: 'var(--text-secondary)' }}
            >
              ← Quay lại trang chủ
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ==================== SERVER SYNC FUNCTIONS ====================

  const loadFromServer = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/database`);
      const result = await response.json();

      if (result.success && result.data) {
        // Update states
        if (result.data.products) setProducts(result.data.products);
        if (result.data.categories) setCategories(result.data.categories);
        if (result.data.settings) {
          const mergedSettings = { ...DEFAULT_GLOBAL_SETTINGS, ...result.data.settings };
          setGlobalSettings(mergedSettings);
          localStorage.setItem('global_settings', JSON.stringify(mergedSettings));
        }
        if (result.data.categorySettings) setCategorySettings(result.data.categorySettings);

        // Also save to localStorage for offline access
        localStorage.setItem('flowers_data', JSON.stringify(result.data.products || []));
        localStorage.setItem('categories_data', JSON.stringify(result.data.categories || []));
        localStorage.setItem('global_settings', JSON.stringify(result.data.settings || {}));
        localStorage.setItem('category_settings', JSON.stringify(result.data.categorySettings || {}));

        setLastSyncTime(new Date().toLocaleString('vi-VN'));
        alert('✅ Đã tải dữ liệu từ server thành công!');
      }
    } catch (error) {
      console.error('Load from server error:', error);
      alert('❌ Lỗi kết nối server! Vui lòng kiểm tra backend đang chạy.');
    } finally {
      setIsSyncing(false);
    }
  };

  const saveToServer = async () => {
    setIsSyncing(true);
    try {
      const data = {
        products,
        categories,
        settings: globalSettings,
        categorySettings,
        zaloNumber: ZALO_NUMBER
      };

      const response = await fetch(`${BACKEND_URL}/api/database`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setLastSyncTime(new Date().toLocaleString('vi-VN'));
        alert('✅ Đã đồng bộ lên server thành công!\n\nBây giờ máy khác có thể thấy dữ liệu mới!');
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Save to server error:', error);
      alert('❌ Lỗi đồng bộ! Vui lòng kiểm tra:\n1. Backend server đang chạy\n2. URL đúng: ' + BACKEND_URL);
    } finally {
      setIsSyncing(false);
    }
  };

  // ==================== GIAO DIỆN QUẢN TRỊ ADMIN ====================

  // GIAO DIỆN QUẢN TRỊ ADMIN (KHI ĐÃ ĐĂNG NHẬP)
  if (currentPath === '#admin' && isAuthenticated) {
    return (
      <div className="min-h-screen bg-pattern pb-20">
        <header className="blur-backdrop border-b border-white/20 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-2 md:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {globalSettings.useImageLogo && globalSettings.logoUrl ? (
                <img
                  src={globalSettings.logoUrl}
                  alt={globalSettings.websiteName}
                  className={`w-auto object-contain ${globalSettings.logoSizeDesktop}`}
                />
              ) : (
                <div className="logo-loader !h-10 grayscale">
                  <svg viewBox="0 0 320 70" className="h-full w-auto">
                    <text
                      x="0"
                      y="50"
                      className="logo-text-path dash gradient-c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="360"
                      style={{ fontSize: '42px' }}
                    >
                      HOASAPHCM.VN
                    </text>
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Sync Buttons */}
              <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                <button
                  onClick={loadFromServer}
                  disabled={isSyncing}
                  className="text-xs font-bold hover:text-green-400 transition-all disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Tải dữ liệu từ server"
                >
                  {isSyncing ? '⏳' : '⬇️'} Load
                </button>
                <div className="w-px h-4 bg-white/20"></div>
                <button
                  onClick={saveToServer}
                  disabled={isSyncing}
                  className="text-xs font-bold hover:text-blue-400 transition-all disabled:opacity-50"
                  style={{ color: 'var(--text-secondary)' }}
                  title="Lưu dữ liệu lên server"
                >
                  {isSyncing ? '⏳' : '⬆️'} Save
                </button>
                {lastSyncTime && (
                  <>
                    <div className="w-px h-4 bg-white/20"></div>
                    <span className="text-[9px]" style={{ color: 'var(--text-secondary)' }} title="Lần sync cuối">
                      {lastSyncTime.split(' ')[1]}
                    </span>
                  </>
                )}
              </div>

              {/* Clear Cache Button */}
              <button
                onClick={() => {
                  if (confirm('🔄 Xóa cache và tải lại dữ liệu từ server?\n\nĐiều này sẽ làm mới toàn bộ cài đặt (bao gồm SEO).')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="text-xs font-bold px-3 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-xl border border-orange-500/30 hover:border-orange-500/50 transition-all"
                style={{ color: '#f97316' }}
                title="Xóa cache localStorage và tải lại từ server"
              >
                🔄 Clear Cache
              </button>

              <button onClick={() => window.location.hash = ''} className="text-sm font-semibold hover:text-[var(--primary-pink)] transition-all hover:scale-105" style={{ color: 'var(--text-secondary)' }}>Xem Shop</button>
              <button onClick={handleLogout} className="pill-button bg-gradient-pink !text-white px-5 py-2 text-xs font-bold shadow-lg hover-glow-pink">Thoát</button>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
        <div className="max-w-6xl mx-auto px-2 md:px-6 mt-6">
          <div className="flex flex-wrap justify-center gap-2 glass-strong p-2 rounded-2xl border border-white/30">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'products'
                ? 'bg-gradient-pink text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              📦 Sản Phẩm
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'media'
                ? 'bg-gradient-pink text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              📁 Thư Viện
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'css'
                ? 'bg-gradient-pink text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              🎨 CSS
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'analytics'
                ? 'bg-gradient-pink text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              📊 Tổng Quan
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'orders'
                ? 'bg-gradient-pink text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              📦 Đơn Hàng
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'settings'
                ? 'bg-gradient-pink text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              ⚙️ Cài Đặt
            </button>
            <button
              onClick={() => setActiveTab('shipping')}
              className={`px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'shipping'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'text-neutral-600 hover:bg-white/50'
                }`}
            >
              💰 Phí Ship
            </button>
          </div>
        </div>

        <main className="max-w-6xl mx-auto p-2 md:p-6 space-y-8 mt-6">
          {activeTab === 'products' ? (
            <>
              {/* QUẢN LÝ DANH MỤC */}
              <section className="glass-strong p-2 md:p-8 rounded-3xl border border-white/30 shadow-xl">
                <div
                  className="flex justify-between items-center mb-6 cursor-pointer group"
                  onClick={() => toggleSection('categories')}
                >
                  <h3 className="text-lg font-bold serif-display gradient-text flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-pink rounded-full inline-block"></span>
                    Cấu trúc danh mục
                  </h3>
                  <button className="pill-button glass px-4 py-2 hover:glass-strong transition-all">
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${expandedSections.categories ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--primary-pink)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {expandedSections.categories && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row gap-3 mb-6">
                      <input
                        type="text"
                        placeholder="Tên danh mục mới (Vd: Hoa tươi 20/10)..."
                        className="glass-input flex-grow rounded-2xl px-5 py-3 text-sm"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                      />
                      <button
                        onClick={addCategory}
                        className="pill-button bg-gradient-pink !text-white px-8 py-3 text-sm font-bold shadow-lg hover-glow-pink whitespace-nowrap self-start md:self-auto w-full md:w-auto"
                      >
                        Thêm mục
                      </button>
                    </div>

                    {/* Preview Button */}
                    <div className="mb-4 p-4 glass rounded-xl border border-white/40">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--secondary-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          <div>
                            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Xem trước thứ tự danh mục</p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Thứ tự này sẽ hiển thị trên trang chủ</p>
                          </div>
                        </div>
                        <a
                          href="#"
                          target="_blank"
                          className="pill-button bg-gradient-purple !text-white px-4 py-3 md:py-2 text-xs font-bold shadow-md hover-glow-pink text-center whitespace-nowrap w-full md:w-auto"
                        >
                          Mở trang chủ
                        </a>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {categories.map((cat, index) => {
                        const categoryProducts = getProductsInCategory(cat, products);
                        const productCount = categoryProducts.length;
                        return (
                          <div
                            key={cat}
                            draggable
                            onDragStart={(e) => handleDragStart(e, cat)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, cat)}
                            className={`glass p-3 md:p-4 rounded-xl flex items-center gap-2 md:gap-3 text-sm font-medium group hover:glass-strong hover:scale-[1.02] transition-all cursor-move shadow-md border-white/40 ${draggedCategory === cat ? 'opacity-50 scale-95' : ''
                              }`}
                          >
                            {/* Drag Handle Icon - Hidden on small mobile */}
                            <svg className="w-4 h-4 flex-shrink-0 hidden sm:block" style={{ color: 'var(--text-secondary)' }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5a2 2 0 100 4 2 2 0 000-4zM8 11a2 2 0 100 4 2 2 0 000-4zM8 17a2 2 0 100 4 2 2 0 000-4zM16 5a2 2 0 100 4 2 2 0 000-4zM16 11a2 2 0 100 4 2 2 0 000-4zM16 17a2 2 0 100 4 2 2 0 000-4z" />
                            </svg>

                            {/* Position Number */}
                            <span className="w-6 h-6 md:w-8 md:h-8 bg-gradient-pink text-white rounded-lg md:rounded-xl flex items-center justify-center text-[10px] md:text-xs font-bold shadow-lg flex-shrink-0 glow-pink">
                              {index + 1}
                            </span>

                            {/* Category Name */}
                            <div className="flex-grow min-w-0">
                              <span className="font-semibold truncate text-sm md:text-base block" style={{ color: 'var(--text-primary)' }} title={cat}>
                                {cat}
                              </span>
                              {categorySettings[cat]?.isHidden && (
                                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter">🙈 Đã ẩn khỏi trang chủ</span>
                              )}
                            </div>

                            {/* Product Count Badge */}
                            <span className={`badge-glass px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold flex-shrink-0 ${productCount > 0
                              ? 'bg-gradient-soft text-green-700'
                              : 'bg-white/20'
                              }`} style={{ color: productCount > 0 ? 'var(--primary-pink)' : 'var(--text-secondary)' }}>
                              {productCount} <span className="hidden sm:inline">SP</span>
                            </span>

                            {/* Reorder Buttons */}
                            <div className="flex gap-0.5 md:gap-1 flex-shrink-0">
                              <button
                                onClick={() => moveCategoryUp(index)}
                                disabled={index === 0}
                                className={`p-1.5 md:p-2 rounded-lg transition-all ${index === 0
                                  ? 'text-neutral-200 cursor-not-allowed'
                                  : 'text-neutral-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                title="Di chuyển lên"
                              >
                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
                              </button>
                              <button
                                onClick={() => moveCategoryDown(index)}
                                disabled={index === categories.length - 1}
                                className={`p-1.5 md:p-2 rounded-lg transition-all ${index === categories.length - 1
                                  ? 'text-neutral-200 cursor-not-allowed'
                                  : 'text-neutral-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                title="Di chuyển xuống"
                              >
                                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                              </button>
                            </div>

                            {/* Settings Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(cat);
                                setShowCategorySettingsModal(true);
                              }}
                              className="p-1.5 md:p-2 text-neutral-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all flex-shrink-0"
                              title="Cài đặt danh mục"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => deleteCategory(cat)}
                              className="p-1.5 md:p-2 text-neutral-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                              title="Xóa danh mục"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2" strokeLinecap="round" /></svg>
                            </button>
                          </div>
                        );
                      })}

                      {categories.length === 0 && (
                        <div className="text-center py-8 text-neutral-400 text-sm">
                          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                          Chưa có danh mục nào. Thêm danh mục đầu tiên!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </section>


              {/* QUẢN LÝ NHANH SẢN PHẨM */}
              <section>
                <div
                  className="flex justify-between items-center mb-6 cursor-pointer group glass-strong p-4 rounded-2xl"
                  onClick={() => toggleSection('inventory')}
                >
                  <h3 className="text-lg font-bold serif-display gradient-text flex items-center gap-2">
                    <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                    Kho hàng hiện tại ({products.length})
                  </h3>
                  <button className="pill-button glass px-4 py-2 hover:glass-strong transition-all">
                    <svg
                      className={`w-5 h-5 transition-transform duration-300 ${expandedSections.inventory ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--primary-pink)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {expandedSections.inventory && (

                  <div className="space-y-8">
                    {/* Products with valid categories */}
                    {categories.map((category) => {
                      const categoryProducts = getProductsInCategory(category, products)
                        .sort((a, b) => (a.order || 0) - (b.order || 0));

                      if (categoryProducts.length === 0) return null;

                      return (
                        <div key={category} className="glass-strong p-2 md:p-6 rounded-2xl border border-white/30 shadow-lg">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                              <span className="w-2 h-2 bg-gradient-pink rounded-full glow-pink"></span>
                              {category}
                            </h4>
                            <span className="badge-glass bg-gradient-soft text-xs font-bold" style={{ color: 'var(--primary-pink)' }}>{categoryProducts.length} sản phẩm</span>
                          </div>

                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {categoryProducts.map(p => (
                              <div
                                key={p.id}
                                draggable
                                onDragStart={(e) => handleProductDragStart(e, p.id)}
                                onDragEnd={handleProductDragEnd}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleProductDrop(e, p.id, category)}
                                className={`relative group cursor-move ${draggedProduct === p.id ? 'opacity-50 scale-95' : ''} ${p.isHidden ? 'opacity-60 grayscale' : ''}`}
                              >
                                {p.isHidden && (
                                  <div className="absolute top-2 right-2 z-10 bg-neutral-800/80 text-white px-2 py-1 rounded text-[10px] font-bold">
                                    🙈 Đã ẩn
                                  </div>
                                )}
                                <div className="absolute top-2 left-2 z-10 bg-neutral-900/70 text-white px-2 py-1 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                  ⋮⋮ Kéo
                                </div>
                                <FlowerCard
                                  product={p}
                                  isAdmin
                                  onEdit={openEditModal}
                                  globalAspectRatio={
                                    globalSettings.aspectRatio === 'custom'
                                      ? (globalSettings.customValue || '3/4').replace(/:/g, '/').replace(/x/gi, '/')
                                      : globalSettings.aspectRatio
                                  }
                                  mediaMetadata={mediaMetadata}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Products with deleted/invalid categories */}
                    {(() => {
                      const uncategorizedProducts = products.filter(p => !categories.includes(p.category));
                      if (uncategorizedProducts.length === 0) return null;

                      return (
                        <div className="glass-strong p-2 md:p-6 rounded-2xl border-2 border-yellow-300/50 shadow-lg bg-yellow-50/20">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="font-bold flex items-center gap-2 text-yellow-700">
                                <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                ⚠️ Sản phẩm không có danh mục
                              </h4>
                              <p className="text-xs text-yellow-600 mt-1">
                                Danh mục của các sản phẩm này đã bị xóa. Vui lòng chỉnh sửa để gán lại danh mục mới.
                              </p>
                            </div>
                            <span className="badge-glass bg-yellow-500 text-white text-xs font-bold px-3 py-1">
                              {uncategorizedProducts.length} sản phẩm
                            </span>
                          </div>

                          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {uncategorizedProducts.map(p => (
                              <div key={p.id} className={`relative group ${p.isHidden ? 'opacity-60 grayscale' : ''}`}>
                                {p.isHidden && (
                                  <div className="absolute top-8 right-2 z-20 bg-neutral-800/80 text-white px-2 py-1 rounded text-[10px] font-bold">
                                    🙈 Đã ẩn
                                  </div>
                                )}
                                <div className="absolute -top-2 -right-2 z-20 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
                                  ⚠️
                                </div>
                                <div className="absolute bottom-2 left-2 right-2 z-20 bg-red-500/90 text-white text-[10px] font-bold px-2 py-1 rounded text-center">
                                  Danh mục: "{p.category}" đã xóa
                                </div>
                                <FlowerCard
                                  product={p}
                                  isAdmin
                                  onEdit={openEditModal}
                                  globalAspectRatio={
                                    globalSettings.aspectRatio === 'custom'
                                      ? (globalSettings.customValue || '3/4').replace(/:/g, '/').replace(/x/gi, '/')
                                      : globalSettings.aspectRatio
                                  }
                                  mediaMetadata={mediaMetadata}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {products.length === 0 && (
                      <div className="text-center py-16 text-neutral-400">
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        <p className="text-sm font-medium">Chưa có sản phẩm nào. Tạo sản phẩm đầu tiên!</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </>
          ) : activeTab === 'media' ? (
            <section className="glass-strong p-2 md:p-8 rounded-3xl border border-white/30 shadow-xl">
              <MediaLibrary
                onMetadataChange={setMediaMetadata}
                onImageDelete={handleImageDeletedFromLibrary}
              />
            </section>
          ) : activeTab === 'css' ? (
            <section className="glass-strong p-2 md:p-8 rounded-3xl border border-white/30 shadow-xl">
              <div className="mb-6">
                <h3 className="text-lg font-bold serif-display gradient-text flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-gradient-pink rounded-full inline-block"></span>
                  🎨 Custom CSS
                </h3>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  Nhập CSS tùy chỉnh để thay đổi giao diện website. CSS sẽ được áp dụng ngay lập tức.
                </p>
              </div>

              <div className="space-y-4">
                <div className="glass p-2 md:p-6 rounded-2xl">
                  <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    CSS Code
                  </label>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Ví dụ: .glass {'{ background: rgba(255, 255, 255, 0.1); }'}
                  </p>
                  <textarea
                    className="glass-input w-full rounded-2xl px-5 py-4 text-sm font-mono"
                    rows={20}
                    placeholder="/* Nhập CSS tùy chỉnh tại đây */&#10;.your-class {&#10;  color: #FF6B9D;&#10;  font-size: 16px;&#10;}"
                    value={globalSettings.customCSS}
                    onChange={(e) => {
                      const newSettings = { ...globalSettings, customCSS: e.target.value };
                      setGlobalSettings(newSettings);
                      localStorage.setItem('global_settings', JSON.stringify(newSettings));
                    }}
                    style={{
                      fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                      fontSize: '13px',
                      lineHeight: '1.6'
                    }}
                  />
                </div>

                <div className="glass-pink p-4 rounded-xl">
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                    💡 Mẹo sử dụng Custom CSS:
                  </p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <li>• CSS sẽ tự động lưu và áp dụng khi bạn nhập</li>
                    <li>• Sử dụng !important nếu cần ghi đè style mặc định</li>
                    <li>• Test trên  cả PC và Mobile để đảm bảo responsive</li>
                    <li>• Có thể tùy chỉnh: màu sắc, font chữ, khoảng cách, hiệu ứng, v.v.</li>
                  </ul>
                </div>

                {globalSettings.customCSS && (
                  <button
                    onClick={() => {
                      if (confirm('Bạn có chắc muốn xóa toàn bộ Custom CSS?')) {
                        const newSettings = { ...globalSettings, customCSS: '' };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        alert('✅ Đã xóa Custom CSS!');
                      }
                    }}
                    className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all"
                  >
                    🗑️ Xóa toàn bộ CSS
                  </button>
                )}
              </div>
            </section>
          ) : activeTab === 'analytics' ? (
            <>
              {/* Analytics Dashboard Header */}
              <section className="glass-strong p-2 md:p-8 rounded-3xl border border-white/30 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold serif-display gradient-text flex items-center gap-2">
                      <span className="w-1.5 h-6 bg-gradient-sunset rounded-full inline-block"></span>
                      📊 Bảng Tổng Quan Analytics
                    </h3>
                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                      Thống kê lượt xem và tương tác của khách hàng
                    </p>
                  </div>

                  {/* Analytics Actions */}
                  <div className="flex flex-wrap p-1.5 glass-inset gap-2">
                    <button
                      onClick={() => {
                        exportAnalytics();
                        alert('✅ Đã tải xuống file analytics!');
                      }}
                      className="px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all bg-white/40 hover:bg-white/60 text-pink-600 shadow-sm flex items-center gap-2"
                      title="Tải xuống dữ liệu analytics dạng JSON"
                    >
                      <span>📥</span> TẢI DỮ LIỆU
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Bạn có chắc muốn xóa dữ liệu cũ hơn 30 ngày?')) {
                          clearOldAnalytics(30);
                          alert('✅ Đã xóa dữ liệu cũ hơn 30 ngày!');
                          window.location.reload();
                        }
                      }}
                      className="px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all bg-white/40 hover:bg-white/60 text-gray-600 shadow-sm flex items-center gap-2"
                      title="Xóa dữ liệu cũ hơn 30 ngày"
                    >
                      <span>🗑️</span> XÓA DỮ LIỆU CŨ
                    </button>
                    <button
                      onClick={() => clearAllAnalytics()}
                      className="px-5 py-2.5 rounded-2xl text-xs md:text-sm font-bold transition-all bg-rose-50/50 hover:bg-rose-100 text-rose-600 shadow-sm flex items-center gap-2"
                      title="Xóa toàn bộ dữ liệu thống kê"
                    >
                      <span>⚠️</span> XÓA TẤT CẢ
                    </button>
                  </div>
                </div>
              </section>

              {/* Analytics Dashboard Component */}
              <AnalyticsDashboard
                analyticsData={analyticsData}
                products={products}
              />
            </>
          ) : activeTab === 'orders' ? (
            <>
              {/* Orders Management Component */}
              <OrdersManagement />
            </>
          ) : activeTab === 'settings' ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Settings Tab Header */}
              <div className="glass-strong p-6 rounded-2xl border border-white/30 shadow-xl">
                <h2 className="text-2xl font-bold serif-display gradient-text mb-2">⚙️ Cài đặt chung</h2>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Quản lý giao diện, thương hiệu và các cài đặt website
                </p>
              </div>

              {/* Aspect Ratio */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🖼️ Tỷ lệ khung hình cho tất cả sản phẩm
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Thay đổi tỷ lệ này sẽ áp dụng cho tất cả thumbnail sản phẩm trên trang chủ
                </p>
                <div className="space-y-4">
                  <div className="flex gap-3 items-center">
                    <select
                      className="glass-input flex-grow rounded-2xl px-5 py-3 text-sm font-semibold"
                      value={globalSettings.aspectRatio === 'custom' ? 'custom' : globalSettings.aspectRatio}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, aspectRatio: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    >
                      <option value="1/1">1:1 - Vuông (Instagram)</option>
                      <option value="3/4">3:4 - Dọc (Mặc định)</option>
                      <option value="4/3">4:3 - Ngang</option>
                      <option value="16/9">16:9 - Widescreen</option>
                      <option value="custom">✨ Tùy chọn (Nhập riêng)...</option>
                    </select>
                    <div className="badge-glass bg-gradient-pink text-white px-4 py-2 text-xs font-bold">
                      {globalSettings.aspectRatio === 'custom' ? (globalSettings.customValue || 'Chưa nhập') : globalSettings.aspectRatio}
                    </div>
                  </div>
                  {globalSettings.aspectRatio === 'custom' && (
                    <div className="animate-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-bold uppercase text-neutral-400 ml-1 mb-2 block">Nhập tỷ lệ hoặc Pixel (Vd: 2:3, 500x700, 0.75)</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: 2:3 hoặc 500x700"
                        className="glass-input w-full rounded-2xl px-5 py-3 text-sm font-medium"
                        value={globalSettings.customValue}
                        onChange={(e) => {
                          const val = e.target.value;
                          const newSettings = { ...globalSettings, customValue: val };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                        onBlur={() => saveGlobalSettings(globalSettings)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* SKU Toggle */}
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      🏷️ Hiển thị mã SKU trên ảnh sản phẩm
                    </label>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Bật để hiển thị mã sản phẩm (SKU) ở góc dưới bên trái của ảnh
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={globalSettings.showSKU}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, showSKU: e.target.checked };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-pink peer-checked:shadow-[0_0_15px_rgba(255,107,157,0.8)]"></div>
                  </label>
                </div>
              </div>

              {/* Zalo Link */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  📱 Link Zalo cho nút "Liên hệ đặt hàng"
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Nhập link Zalo của shop (vd: https://zalo.me/0900000000)
                </p>
                <input
                  type="text"
                  className="glass-input w-full rounded-2xl px-5 py-3 text-sm font-medium"
                  placeholder="https://zalo.me/0900000000"
                  value={globalSettings.zaloLink}
                  onChange={(e) => {
                    const newSettings = { ...globalSettings, zaloLink: e.target.value };
                    setGlobalSettings(newSettings);
                    localStorage.setItem('global_settings', JSON.stringify(newSettings));
                  }}
                  onBlur={() => saveGlobalSettings(globalSettings)}
                />
              </div>

              {/* Phone Number */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  ☎️ Số điện thoại liên hệ
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Nhập số điện thoại để khách hàng gọi trực tiếp
                </p>
                <input
                  type="tel"
                  className="glass-input w-full rounded-2xl px-5 py-3 text-sm font-medium"
                  placeholder="0900000000"
                  value={globalSettings.phoneNumber}
                  onChange={(e) => {
                    const newSettings = { ...globalSettings, phoneNumber: e.target.value };
                    setGlobalSettings(newSettings);
                    localStorage.setItem('global_settings', JSON.stringify(newSettings));
                  }}
                  onBlur={() => saveGlobalSettings(globalSettings)}
                />
              </div>


              {/* Theme Color */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🎨 Chọn màu chủ đạo website
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Thay đổi tone màu cho toàn bộ giao diện
                </p>
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { name: 'pink', label: 'Hồng', color: '#FF6B9D' },
                    { name: 'purple', label: 'Tím', color: '#BD5FFF' },
                    { name: 'blue', label: 'Xanh Dương', color: '#4F9FFF' },
                    { name: 'green', label: 'Xanh Lá', color: '#4ADE80' },
                    { name: 'orange', label: 'Cam', color: '#FF8A5B' }
                  ].map(theme => (
                    <button
                      key={theme.name}
                      onClick={() => {
                        const newSettings = { ...globalSettings, themeColor: theme.name };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${globalSettings.themeColor === theme.name
                        ? 'border-current shadow-lg'
                        : 'border-neutral-200'
                        }`}
                      style={{ backgroundColor: theme.color + '20', borderColor: globalSettings.themeColor === theme.name ? theme.color : undefined }}
                    >
                      <div
                        className="w-8 h-8 rounded-full mx-auto mb-2"
                        style={{ backgroundColor: theme.color }}
                      />
                      <p className="text-[10px] font-bold text-center">{theme.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification Marquee Settings */}
              <div className="glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      📢 Thông báo chạy (Marquee)
                    </label>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Hiển thị dòng chữ chạy trên thanh header (chỉ trên điện thoại)
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={globalSettings.showNotifications}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, showNotifications: e.target.checked };
                        saveGlobalSettings(newSettings);
                      }}
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-pink"></div>
                  </label>
                </div>

                {globalSettings.showNotifications && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Add New Notification */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập nội dung thông báo..."
                        className="glass-input flex-grow rounded-xl px-4 py-2 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              const current = globalSettings.notifications || [];
                              const newSettings = { ...globalSettings, notifications: [...current, val] };
                              saveGlobalSettings(newSettings);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const val = input.value.trim();
                          if (val) {
                            const current = globalSettings.notifications || [];
                            const newSettings = { ...globalSettings, notifications: [...current, val] };
                            saveGlobalSettings(newSettings);
                            input.value = '';
                          }
                        }}
                        className="bg-gradient-pink text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg transition-all"
                      >
                        Thêm
                      </button>
                    </div>

                    {/* List Notifications */}
                    <div className="space-y-2">
                      {(globalSettings.notifications || []).map((note: string, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/40">
                          <span className="text-sm font-medium text-gray-700 truncate mr-2">{note}</span>
                          <button
                            onClick={() => {
                              const current = globalSettings.notifications || [];
                              const newNotes = current.filter((_, i) => i !== idx);
                              const newSettings = { ...globalSettings, notifications: newNotes };
                              saveGlobalSettings(newSettings);
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                      {(globalSettings.notifications || []).length === 0 && (
                        <p className="text-xs text-center text-gray-400 italic py-2">Chưa có thông báo nào</p>
                      )}
                    </div>

                    {/* Speed Control */}
                    <div>
                      <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Tốc độ chạy (giây) - Càng nhỏ càng nhanh
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="60"
                        step="1"
                        value={globalSettings.notificationSpeed || 15}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, notificationSpeed: parseInt(e.target.value) };
                          saveGlobalSettings(newSettings);
                        }}
                        className="w-full accent-pink-500"
                      />
                      <div className="text-xs text-right font-bold text-pink-500">{globalSettings.notificationSpeed || 15}s</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Branding: Logo & Website Name */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🏪 Thương hiệu & Logo
                </label>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Tên website/cửa hàng
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      placeholder="Vd: Floral Essence"
                      value={globalSettings.websiteName}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, websiteName: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3 p-3 bg-pink-50 rounded-xl border border-pink-100">
                      <div>
                        <label className="text-xs font-bold block text-pink-700">Hiển thị Logo bằng Hình ảnh</label>
                        <p className="text-[10px] text-pink-600">Bật để dùng ảnh đã upload, tắt sẽ dùng chữ nghệ thuật.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={globalSettings.useImageLogo || false}
                          onChange={(e) => {
                            const newSettings = { ...globalSettings, useImageLogo: e.target.checked };
                            saveGlobalSettings(newSettings);
                          }}
                        />
                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                    </div>

                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Cài đặt Hình ảnh Logo
                    </label>
                    <div className="space-y-3">
                      {globalSettings.logoUrl && (
                        <div className="p-4 glass rounded-xl">
                          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Logo hiện tại:</p>
                          <img src={globalSettings.logoUrl} alt="Logo" className="max-h-20 w-auto mx-auto" />
                          <button
                            onClick={() => {
                              const newSettings = { ...globalSettings, logoUrl: '' };
                              saveGlobalSettings(newSettings);
                            }}
                            className="mt-3 w-full text-xs text-rose-500 hover:text-rose-600 font-bold"
                          >
                            Xóa logo
                          </button>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          const formData = new FormData();
                          formData.append('image', file);

                          try {
                            const response = await fetch(`${BACKEND_URL}/api/upload`, {
                              method: 'POST',
                              body: formData
                            });
                            const result = await response.json();

                            if (result.success) {
                              const newSettings = { ...globalSettings, logoUrl: result.url, useImageLogo: true };
                              saveGlobalSettings(newSettings);
                              alert('✅ Upload logo thành công!');
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            alert('❌ Lỗi khi upload logo!');
                          }

                          e.target.value = '';
                        }}
                        className="glass-input w-full rounded-2xl px-5 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-pink file:text-white hover:file:bg-opacity-90"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Kích thước logo PC
                      </label>
                      <select
                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium"
                        value={globalSettings.logoSizeDesktop}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, logoSizeDesktop: e.target.value };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                      >
                        <option value="h-8">Nhỏ (32px)</option>
                        <option value="h-10">Vừa (40px)</option>
                        <option value="h-12">Lớn (48px)</option>
                        <option value="h-16">Rất lớn (64px)</option>
                        <option value="h-20">Cực lớn (80px)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                        Kích thước logo Mobile
                      </label>
                      <select
                        className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium"
                        value={globalSettings.logoSizeMobile}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, logoSizeMobile: e.target.value };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                      >
                        <option value="h-8">Nhỏ (32px)</option>
                        <option value="h-10">Vừa (40px)</option>
                        <option value="h-12">Lớn (48px)</option>
                        <option value="h-16">Rất lớn (64px)</option>
                        <option value="h-20">Cực lớn (80px)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  ⚡ Chức năng website
                </label>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        🖼️ Bật/Tắt Lightbox xem ảnh
                      </label>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Cho phép khách hàng xem ảnh toàn màn hình
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={globalSettings.enableLightbox}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, enableLightbox: e.target.checked };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-pink"></div>
                    </label>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        💰 Hiển thị giá sản phẩm
                      </label>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Tắt nếu muốn khách hỏi giá qua Zalo
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={globalSettings.enablePriceDisplay}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, enablePriceDisplay: e.target.checked };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                      />
                      <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-pink"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Holiday/Busy Mode Settings */}
              <div className="glass p-6 rounded-2xl border-2 border-orange-200/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 text-orange-700">
                      🎉 Chế độ Bận / Ngày Lễ (14/2, 8/3...)
                    </label>
                    <p className="text-xs text-orange-600/80">
                      Khi bật, khách chỉ có thể chọn giờ theo khoảng cách cố định (vd: 2 tiếng/lần) để shop dễ xử lý đơn.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={globalSettings.holidayMode || false}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, holidayMode: e.target.checked };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-500"></div>
                  </label>
                </div>

                {/* Time Block Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-2xl border border-purple-100 mt-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold mb-1 text-purple-700">
                      🕒 Chế độ giao theo Buổi (Sáng/Trưa/Chiều/Tối)
                    </label>
                    <p className="text-xs text-purple-600/80">
                      Dùng cho ngày đại lễ (14/2, 8/3). Khách chỉ chọn Buổi, không chọn giờ chính xác.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={globalSettings.holidayTimeBlockMode || false}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, holidayTimeBlockMode: e.target.checked };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-500"></div>
                  </label>
                </div>

                {globalSettings.holidayMode && !globalSettings.holidayTimeBlockMode && (
                  <div className="animate-in slide-in-from-top-2 duration-300 space-y-4 pt-2 border-t border-orange-100 mt-4">
                    <label className="block text-xs font-bold text-orange-800 ml-1">Khoảng cách giữa các khung giờ (phút)</label>
                    <div className="flex gap-3 items-center">
                      <select
                        className="glass-input flex-grow rounded-2xl px-5 py-3 text-sm font-semibold border-orange-200"
                        value={globalSettings.holidayInterval || 120}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, holidayInterval: parseInt(e.target.value) };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                      >
                        <option value="60">60 phút (Mỗi 1 tiếng)</option>
                        <option value="90">90 phút (Mỗi 1.5 tiếng)</option>
                        <option value="120">120 phút (Mỗi 2 tiếng - Khuyên dùng)</option>
                        <option value="180">180 phút (Mỗi 3 tiếng)</option>
                        <option value="240">240 phút (Mỗi 4 tiếng)</option>
                      </select>
                      <div className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
                        {globalSettings.holidayInterval || 120} PHÚT
                      </div>
                    </div>
                    <p className="text-[10px] text-orange-500 italic ml-1">
                      💡 Vd: Nếu chọn 120 phút, khách sẽ chọn: 08:00, 10:00, 12:00...
                    </p>
                  </div>
                )}
              </div>

              {/* NEW: Coupon Management Settings */}
              <div className="glass p-6 rounded-2xl border-2 border-indigo-200/50">
                <label className="block text-sm font-bold mb-1 text-indigo-700">
                  🎫 Quản lý Mã giảm giá (Coupons)
                </label>
                <p className="text-xs text-indigo-600/80 mb-4">
                  Tạo các mã khuyến mãi (giảm % trên tiền sản phẩm) để tặng cho khách hàng VIP hoặc khách cũ.
                </p>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      id="newCouponCode"
                      placeholder="Mã (Vd: KHACHVIP)"
                      className="glass-input flex-grow rounded-xl px-4 py-2 text-sm font-bold uppercase"
                    />
                    <input
                      type="number"
                      id="newCouponPercent"
                      placeholder="% giảm"
                      className="glass-input w-24 rounded-xl px-4 py-2 text-sm font-bold"
                      min="1"
                      max="100"
                    />
                    <button
                      onClick={() => {
                        const codeInput = document.getElementById('newCouponCode') as HTMLInputElement;
                        const percentInput = document.getElementById('newCouponPercent') as HTMLInputElement;
                        const code = codeInput.value.trim().toUpperCase();
                        const percent = parseInt(percentInput.value);

                        if (code && percent > 0 && percent <= 100) {
                          const current = (globalSettings as any).coupons || [];
                          if (current.some((c: any) => c.code === code)) {
                            alert('❌ Mã này đã tồn tại!');
                            return;
                          }
                          const newSettings = { ...globalSettings, coupons: [...current, { code, discountPercent: percent }] };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                          codeInput.value = '';
                          percentInput.value = '';
                          alert('✅ Đã thêm mã giảm giá!');
                        } else {
                          alert('❌ Vui lòng nhập đầy đủ mã và tỷ lệ % hợp lệ!');
                        }
                      }}
                      className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
                    >
                      Thêm mã
                    </button>
                  </div>

                  <div className="space-y-2 mt-2">
                    {((globalSettings as any).coupons || []).map((coupon: { code: string, discountPercent: number }, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-indigo-100">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🎫</span>
                          <div>
                            <span className="text-sm font-black text-indigo-700">{coupon.code}</span>
                            <span className="ml-2 text-xs font-bold text-emerald-600">Giảm {coupon.discountPercent}%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Xóa mã "${coupon.code}"?`)) {
                              const newCoupons = (globalSettings as any).coupons.filter((_: any, i: number) => i !== idx);
                              const newSettings = { ...globalSettings, coupons: newCoupons };
                              setGlobalSettings(newSettings);
                              localStorage.setItem('global_settings', JSON.stringify(newSettings));
                            }
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                    {((globalSettings as any).coupons || []).length === 0 && (
                      <p className="text-xs text-center text-gray-400 italic py-2">Chưa có mã giảm giá nào</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Favicon Upload */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🌐 Favicon & Social Image
                </label>

                {/* Favicon */}
                <div className="mb-8">
                  <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Favicon (icon tab trình duyệt)
                  </label>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Upload ảnh nhỏ (16x16 hoặc 32x32px) để làm icon cho tab trình duyệt
                  </p>

                  {globalSettings.faviconUrl && (
                    <div className="mb-4 flex items-center gap-4">
                      <img
                        src={globalSettings.faviconUrl}
                        alt="Favicon preview"
                        className="w-8 h-8 border-2 border-pink-200 rounded"
                      />
                      <button
                        onClick={() => {
                          const newSettings = { ...globalSettings, faviconUrl: '' };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold"
                      >
                        Xóa favicon
                      </button>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append('image', file);

                      try {
                        const response = await fetch(`${BACKEND_URL}/api/upload`, {
                          method: 'POST',
                          body: formData
                        });
                        const result = await response.json();

                        if (result.success) {
                          const newSettings = { ...globalSettings, faviconUrl: result.url };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                          alert('✅ Upload favicon thành công!');
                        }
                      } catch (error) {
                        console.error('Upload error:', error);
                        alert('❌ Lỗi khi upload favicon!');
                      }

                      e.target.value = '';
                    }}
                    className="glass-input w-full rounded-2xl px-5 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-pink file:text-white hover:file:bg-opacity-90"
                  />
                </div>

                {/* Social Share Image */}
                <div>
                  <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                    Ảnh chia sẻ Social (Facebook/Zalo)
                  </label>
                  <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Ảnh sẽ hiện khi chia sẻ link website lên Facebook, Zalo (Khuyên dùng: 1200x630px)
                  </p>

                  {globalSettings.socialShareImage && (
                    <div className="mb-4">
                      <img
                        src={globalSettings.socialShareImage}
                        alt="Social preview"
                        className="w-full max-w-[200px] h-auto border-2 border-pink-200 rounded-lg shadow-sm mb-2"
                      />
                      <button
                        onClick={() => {
                          const newSettings = { ...globalSettings, socialShareImage: '' };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                        className="text-xs text-rose-500 hover:text-rose-600 font-bold"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append('image', file);

                      try {
                        const response = await fetch(`${BACKEND_URL}/api/upload`, {
                          method: 'POST',
                          body: formData
                        });
                        const result = await response.json();

                        if (result.success) {
                          const newSettings = { ...globalSettings, socialShareImage: result.url };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                          alert('✅ Upload ảnh Social thành công!');
                        }
                      } catch (error) {
                        console.error('Upload error:', error);
                        alert('❌ Lỗi khi upload ảnh!');
                      }

                      e.target.value = '';
                    }}
                    className="glass-input w-full rounded-2xl px-5 py-3 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-pink file:text-white hover:file:bg-opacity-90"
                  />
                </div>
              </div>

              {/* Custom Font Upload */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🔤 Quản Lý Font Tùy Chỉnh (TTF, OTF, WOFF)
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Upload nhiều font để sử dụng cho website
                </p>

                {/* List of uploaded fonts */}
                {globalSettings.customFonts && globalSettings.customFonts.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>
                      Danh sách font đã upload:
                    </label>
                    {globalSettings.customFonts.map((font, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/50 rounded-xl border border-white/60">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">Aa</span>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{font.name}</p>
                            <p className="text-[10px] text-gray-500 truncate max-w-[200px]">{font.url}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Bạn có chắc muốn xóa font "${font.name}"?`)) {
                              const newFonts = globalSettings.customFonts.filter((_, i) => i !== idx);
                              const newSettings = { ...globalSettings, customFonts: newFonts };
                              setGlobalSettings(newSettings);
                              localStorage.setItem('global_settings', JSON.stringify(newSettings));
                            }
                          }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold px-3 py-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload new font form */}
                <div className="p-4 bg-white/30 rounded-xl border border-white/40">
                  <label className="text-xs font-bold mb-3 block text-gray-700">
                    ➕ Thêm font mới
                  </label>

                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        className="glass-input w-full rounded-xl px-4 py-2 text-sm"
                        placeholder="Tên font (Vd: My Font)"
                        value={newFontName}
                        onChange={(e) => setNewFontName(e.target.value)}
                      />
                    </div>

                    <div>
                      <input
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;

                          if (!newFontName.trim()) {
                            alert('⚠️ Vui lòng nhập tên font trước khi upload!');
                            e.target.value = '';
                            return;
                          }

                          // Check if name exists
                          if (globalSettings.customFonts?.some(f => f.name.toLowerCase() === newFontName.trim().toLowerCase())) {
                            alert('⚠️ Tên font này đã tồn tại!');
                            e.target.value = '';
                            return;
                          }

                          const formData = new FormData();
                          formData.append('image', file); // API expects 'image' field name

                          try {
                            const response = await fetch(`${BACKEND_URL}/api/upload`, {
                              method: 'POST',
                              body: formData
                            });
                            const result = await response.json();

                            if (result.success) {
                              const newFont = { name: newFontName.trim(), url: result.url };
                              const newFonts = [...(globalSettings.customFonts || []), newFont];
                              const newSettings = { ...globalSettings, customFonts: newFonts };

                              setGlobalSettings(newSettings);
                              localStorage.setItem('global_settings', JSON.stringify(newSettings));

                              setNewFontName(''); // Reset name
                              alert('✅ Thêm font thành công!');
                            }
                          } catch (error) {
                            console.error('Upload error:', error);
                            alert('❌ Lỗi khi upload font!');
                          }

                          e.target.value = ''; // Reset file input
                        }}
                        className="glass-input w-full rounded-xl px-4 py-2 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gradient-pink file:text-white hover:file:bg-opacity-90"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Fonts Selection */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  🔤 Chọn Font Chữ (Google Fonts)
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Tùy chỉnh font chữ cho tiêu đề, giá và nội dung
                </p>

                <div className="space-y-4">
                  {/* Font for Product Title */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Font Tiêu Đề Sản Phẩm
                    </label>
                    <select
                      className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium"
                      value={globalSettings.fontTitle}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, fontTitle: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    >
                      {globalSettings.customFonts?.map((font, idx) => (
                        <option key={idx} value={font.name}>{font.name} (Custom)</option>
                      ))}
                      <option value="Playfair Display">Playfair Display (Elegant)</option>
                      <option value="Montserrat">Montserrat (Modern)</option>
                      <option value="Poppins">Poppins (Clean)</option>
                      <option value="Merriweather">Merriweather (Classic)</option>
                      <option value="Lora">Lora (Serif)</option>
                      <option value="Raleway">Raleway (Thin)</option>
                      <option value="Oswald">Oswald (Bold)</option>
                      <option value="Dancing Script">Dancing Script (Cursive)</option>
                      <option value="Pacifico">Pacifico (Handwritten)</option>
                      <option value="Be Vietnam Pro">Be Vietnam Pro (Vietnamese)</option>
                      <option value="Comfortaa">Comfortaa (Rounded)</option>
                    </select>
                    <p className="text-xs mt-1 opacity-60" style={{ fontFamily: globalSettings.fontTitle }}>
                      Preview: {globalSettings.fontTitle}
                    </p>
                  </div>

                  {/* Font for Category Title */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Font Tiêu Đề Danh Mục
                    </label>
                    <select
                      className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium"
                      value={globalSettings.fontCategoryTitle || globalSettings.fontTitle}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, fontCategoryTitle: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    >
                      {globalSettings.customFonts?.map((font, idx) => (
                        <option key={idx} value={font.name}>{font.name} (Custom)</option>
                      ))}
                      <option value="Playfair Display">Playfair Display (Elegant)</option>
                      <option value="Montserrat">Montserrat (Modern)</option>
                      <option value="Poppins">Poppins (Clean)</option>
                      <option value="Merriweather">Merriweather (Classic)</option>
                      <option value="Lora">Lora (Serif)</option>
                      <option value="Raleway">Raleway (Thin)</option>
                      <option value="Oswald">Oswald (Bold)</option>
                      <option value="Dancing Script">Dancing Script (Cursive)</option>
                      <option value="Pacifico">Pacifico (Handwritten)</option>
                      <option value="Be Vietnam Pro">Be Vietnam Pro (Vietnamese)</option>
                      <option value="Comfortaa">Comfortaa (Rounded)</option>
                    </select>
                    <p className="text-xs mt-1 opacity-60" style={{ fontFamily: globalSettings.fontCategoryTitle || globalSettings.fontTitle }}>
                      Preview: {globalSettings.fontCategoryTitle || globalSettings.fontTitle}
                    </p>
                  </div>

                  {/* Font for Price */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Font Giá Sản Phẩm
                    </label>
                    <select
                      className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium"
                      value={globalSettings.fontPrice}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, fontPrice: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    >
                      {globalSettings.customFonts?.map((font, idx) => (
                        <option key={idx} value={font.name}>{font.name} (Custom)</option>
                      ))}
                      <option value="Roboto">Roboto (Standard)</option>
                      <option value="Open Sans">Open Sans (Clean)</option>
                      <option value="Lato">Lato (Friendly)</option>
                      <option value="Source Sans Pro">Source Sans Pro (Professional)</option>
                      <option value="Nunito">Nunito (Rounded)</option>
                      <option value="Ubuntu">Ubuntu (Modern)</option>
                      <option value="Be Vietnam Pro">Be Vietnam Pro (Vietnamese)</option>
                      <option value="Quicksand">Quicksand (Rounded)</option>
                      <option value="Comfortaa">Comfortaa (Soft)</option>
                    </select>
                    <p className="text-xs mt-1 opacity-60" style={{ fontFamily: globalSettings.fontPrice }}>
                      Preview: {globalSettings.fontPrice}
                    </p>
                  </div>

                  {/* Font for Body Text */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Font Nội Dung Chung
                    </label>
                    <select
                      className="glass-input w-full rounded-2xl px-4 py-3 text-sm font-medium"
                      value={globalSettings.fontBody}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, fontBody: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                    >
                      {globalSettings.customFonts?.map((font, idx) => (
                        <option key={idx} value={font.name}>{font.name} (Custom)</option>
                      ))}
                      <option value="Inter">Inter (Modern)</option>
                      <option value="Roboto">Roboto (Standard)</option>
                      <option value="Open Sans">Open Sans (Readable)</option>
                      <option value="Noto Sans">Noto Sans (Universal)</option>
                      <option value="Work Sans">Work Sans (Geometric)</option>
                      <option value="DM Sans">DM Sans (Clean)</option>
                      <option value="Be Vietnam Pro">Be Vietnam Pro (Vietnamese)</option>
                      <option value="Nunito">Nunito (Friendly)</option>
                      <option value="Quicksand">Quicksand (Rounded)</option>
                    </select>
                    <p className="text-xs mt-1 opacity-60" style={{ fontFamily: globalSettings.fontBody }}>
                      Preview: {globalSettings.fontBody}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Settings */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  📝 Thông tin Footer (Chân trang)
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Tùy chỉnh nội dung hiển thị ở chân trang web
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Tiêu đề Footer (Tên Shop ở chân trang)
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      placeholder="Mặc định: Giống tên Website"
                      value={globalSettings.footerTitle || ''}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, footerTitle: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                    <p className="text-[10px] text-neutral-400 mt-1">* Để trống nếu muốn dùng tên Website</p>
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Mô tả ngắn (Giới thiệu)
                    </label>
                    <textarea
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      rows={2}
                      placeholder="Nhập mô tả ngắn về tiệm hoa..."
                      value={globalSettings.footerDescription || ''}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, footerDescription: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Bản quyền (Copyright)
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      placeholder="© 2024 Tiệm Hoa Cao Cấp..."
                      value={globalSettings.footerCopyright || ''}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, footerCopyright: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>

                  {/* Facebook Page Settings */}
                  <div className="pt-4 border-t border-gray-200/50">
                    <label className="text-xs font-bold mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                      📘 Facebook Fanpage
                    </label>

                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="showFacebookWidget"
                        className="w-5 h-5 rounded border-gray-300 text-[var(--primary-pink)] focus:ring-[var(--primary-pink)]"
                        checked={globalSettings.showFacebookWidget || false}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, showFacebookWidget: e.target.checked };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                          saveGlobalSettings(newSettings);
                        }}
                      />
                      <label htmlFor="showFacebookWidget" className="text-sm font-medium cursor-pointer">
                        Hiển thị widget Facebook dưới footer
                      </label>
                    </div>

                    {globalSettings.showFacebookWidget && (
                      <input
                        type="url"
                        className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                        placeholder="https://www.facebook.com/Thegioihoasapp"
                        value={globalSettings.facebookPageUrl || ''}
                        onChange={(e) => {
                          const newSettings = { ...globalSettings, facebookPageUrl: e.target.value };
                          setGlobalSettings(newSettings);
                          localStorage.setItem('global_settings', JSON.stringify(newSettings));
                        }}
                        onBlur={() => saveGlobalSettings(globalSettings)}
                      />
                    )}
                    {globalSettings.showFacebookWidget && (
                      <p className="text-[10px] text-neutral-400 mt-2">
                        * Nhập URL đầy đủ của Facebook Page (VD: https://www.facebook.com/Thegioihoasapp)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SEO Settings */}
              <div className="glass p-6 rounded-2xl">
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  📊 Tối ưu hóa SEO (Google Search)
                </label>
                <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Cải thiện thứ hạng website trên Google
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Tiêu đề SEO (Title Tag)
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      placeholder="Vd: Tiệm Hoa Tươi Cao Cấp - Giao Hàng Nhanh"
                      value={globalSettings.seoTitle}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, seoTitle: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Mô tả SEO (Meta Description)
                    </label>
                    <textarea
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      rows={3}
                      placeholder="Vd: Chuyên cung cấp hoa tươi cao cấp, bó hoa đẹp, giao hoa tận nơi..."
                      value={globalSettings.seoDescription}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, seoDescription: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Từ khóa SEO (Keywords) - Cách nhau bởi dấu phẩy
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      placeholder="hoa tươi, bó hoa, tiệm hoa, hoa sinh nhật"
                      value={globalSettings.seoKeywords}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, seoKeywords: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>
                </div>
              </div>

              {/* Zalo Bot Configuration */}
              <div className="glass p-6 rounded-2xl">
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    🤖 Cấu hình Zalo Bot (Thông báo đơn hàng)
                  </label>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Cấu hình để nhận thông báo đơn hàng qua Zalo OA
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Bot Token */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Zalo Bot Token (Lấy từ Zalo Developers)
                    </label>
                    <input
                      type="password"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm font-mono"
                      placeholder="Nhập Access Token của Bot..."
                      value={globalSettings.zaloBotToken || ''}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, zaloBotToken: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                  </div>

                  {/* Admin IDs */}
                  <div>
                    <label className="text-xs font-bold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                      Zalo User IDs (Người nhận thông báo)
                    </label>
                    <input
                      type="text"
                      className="glass-input w-full rounded-2xl px-5 py-3 text-sm"
                      placeholder="Ví dụ: 84888..., 84999... (Ngăn cách bằng dấu phẩy)"
                      value={globalSettings.zaloAdminIds || ''}
                      onChange={(e) => {
                        const newSettings = { ...globalSettings, zaloAdminIds: e.target.value };
                        setGlobalSettings(newSettings);
                        localStorage.setItem('global_settings', JSON.stringify(newSettings));
                      }}
                      onBlur={() => saveGlobalSettings(globalSettings)}
                    />
                    <p className="text-[10px] text-neutral-400 mt-2">
                      * Nhập nhiều ID ngăn cách bằng dấu phẩy để gửi cho nhiều người.
                      <br />* Để lấy ID: Chat với Bot/OA và kiểm tra công cụ quản lý.
                    </p>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div className="glass-pink p-4 rounded-xl text-sm" style={{ color: 'var(--text-secondary)' }}>
                💡 <span className="font-semibold">Lưu ý:</span> Thay đổi sẽ được lưu tự động và áp dụng ngay lập tức.
              </div>
            </div>
          ) : activeTab === 'shipping' ? (
            <>
              {/* Shipping Fees Management */}
              <ShippingFeesManager backendUrl={BACKEND_URL} />
            </>
          ) : null}
        </main>

        {/* Floating Action Button - Add Product */}
        {activeTab === 'products' && (
          <button
            onClick={() => {
              setEditingProduct({ title: '', category: categories[0] || '', images: [], switchInterval: 3000, aspectRatio: '3/4', originalPrice: 0, salePrice: 0 });
              setShowEditModal(true);
            }}
            className="fixed bottom-8 right-8 z-50 bg-gradient-pink text-white w-16 h-16 rounded-full shadow-2xl hover-glow-pink flex items-center justify-center group hover:scale-110 active:scale-95 transition-all"
            title="Thêm sản phẩm mới"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            {/* Tooltip */}
            <span className="absolute -top-12 right-0 bg-neutral-900 text-white text-xs font-bold px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              ✨ Thêm sản phẩm mới
            </span>
          </button>
        )}

        {/* MODAL SỬA TÊN DANH MỤC */}
        {showCategoryEditModal && editingCategory && (
          <CategoryEditModal
            categoryName={editingCategory}
            displayName={categorySettings[editingCategory]?.displayName}
            onSave={renameCategoryInSettings}
            onClose={closeCategoryEditModal}
          />
        )}

        {/* MODAL CÀI ĐẶT DANH MỤC */}
        {showCategorySettingsModal && editingCategory && (
          <CategorySettingsModal
            categoryName={editingCategory}
            settings={categorySettings[editingCategory] || {
              name: editingCategory,
              itemsPerPage: 12,
              paginationType: 'loadmore',
              imageTransition: 'none',
              imageInterval: 3000
            }}
            onUpdate={(updates) => updateCategorySettings(editingCategory, updates)}
            onClose={() => setShowCategorySettingsModal(false)}
            onRename={() => {
              setShowCategorySettingsModal(false);
              setShowCategoryEditModal(true);
            }}
          />
        )}

        {/* MODAL PRODUCT FORM - NEW WITH VARIANTS */}
        {showEditModal && (
          <ProductFormModal
            product={editingProduct as FlowerProduct | null}
            categories={categories}
            onSave={handleAddOrUpdateProduct}
            onCancel={closeEditModal}
            onDelete={deleteProduct}
            onUploadImage={handleUploadProductImage}
          />
        )}
      </div >
    );
  }

  // GIAO DIỆN NGƯỜI DÙNG (TRANG CHỦ)
  return (
    <div className="min-h-screen bg-pattern">
      <header className="blur-backdrop fixed top-0 left-0 right-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 lg:py-2 flex flex-col lg:flex-row lg:items-center justify-between lg:min-h-[64px] min-h-0">
          <div className="flex items-center justify-between w-full lg:w-auto shrink-0 py-0.5 lg:py-0">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.href = '/'}>
              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMobileMenuOpen(true); }}
                  className="p-2 -ml-2 text-neutral-600 hover:text-rose-500 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>

              {globalSettings.useImageLogo && globalSettings.logoUrl ? (
                <div className="flex items-center">
                  <img
                    src={globalSettings.logoUrl}
                    alt={globalSettings.websiteName}
                    className={`w-auto object-contain hidden sm:block ${globalSettings.logoSizeDesktop}`}
                  />
                  <img
                    src={globalSettings.logoUrl}
                    alt={globalSettings.websiteName}
                    className={`w-auto object-contain sm:hidden ${globalSettings.logoSizeMobile}`}
                  />
                </div>
              ) : (
                <div className="logo-loader">
                  <svg className="absolute" width="0" height="0">
                    <defs>
                      <linearGradient id="b" x1="0" y1="62" x2="0" y2="2" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#973BED"></stop>
                        <stop offset="1" stopColor="#007CFF"></stop>
                      </linearGradient>
                      <linearGradient id="c" x1="0" y1="64" x2="0" y2="0" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#FFC800"></stop>
                        <stop offset="1" stopColor="#F0F"></stop>
                        <animateTransform
                          attributeName="gradientTransform"
                          type="rotate"
                          values="0 32 32;-270 32 32;-540 32 32;-810 32 32;-1080 32 32"
                          dur="8s"
                          repeatCount="indefinite"
                        />
                      </linearGradient>
                      <linearGradient id="d" x1="0" y1="62" x2="0" y2="2" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00E0ED"></stop>
                        <stop offset="1" stopColor="#00DA72"></stop>
                      </linearGradient>
                    </defs>
                  </svg>

                  <svg viewBox="0 0 380 70" className="h-full w-auto">
                    <text
                      x="0"
                      y="50"
                      className="logo-text-path dash gradient-c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="360"
                    >
                      HOASAPHCM.VN
                    </text>
                  </svg>
                </div>
              )}
            </div>

            {/* New Mobile Order Tracking Button */}
            <div className="lg:hidden">
              <button
                onClick={(e) => { e.stopPropagation(); setShowOrderTracking(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 border border-[var(--primary-pink)]/30 text-[var(--primary-pink)] hover:bg-rose-50 transition-all active:scale-95 shadow-sm"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-tighter text-pink-600">Tra cứu đơn hàng</span>
              </button>
            </div>
          </div>

          {/* Marquee Notification - Mobile Only - New Stacked Style */}
          {globalSettings.showNotifications && globalSettings.notifications && globalSettings.notifications.length > 0 && (
            <div className="lg:hidden w-full overflow-hidden relative h-6 flex items-center border-t border-white/10 bg-black/5 rounded-lg mb-0.5">
              {/* Bell Icon */}
              <div className="flex-shrink-0 mx-2 text-pink-500 animate-bell">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              </div>

              <div className="ticker-wrap">
                <div
                  className="animate-ticker"
                  style={{ animationDuration: `${globalSettings.notificationSpeed || 20}s` }}
                >
                  {/* Render items multiple times for seamless loop */}
                  {globalSettings.notifications.map((note, i) => (
                    <span key={`1-${i}`} className="ticker-item leading-6 text-[10px]">
                      {note}
                    </span>
                  ))}
                  {globalSettings.notifications.map((note, i) => (
                    <span key={`2-${i}`} className="ticker-item leading-6 text-[10px]">
                      {note}
                    </span>
                  ))}
                  {globalSettings.notifications.map((note, i) => (
                    <span key={`3-${i}`} className="ticker-item leading-6 text-[10px]">
                      {note}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Desktop Navigation & Marquee Wrapper */}
          <div className="hidden lg:flex flex-col items-end gap-1">
            <nav className="flex gap-6 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {categories
                .filter(cat => !categorySettings[cat]?.isHidden) // Lọc danh mục không bị ẩn
                .map((cat) => (
                  <a
                    key={cat}
                    href={`#${cat}`}
                    onClick={(e) => { e.preventDefault(); scrollToCategory(cat); }}
                    className="hover:text-[var(--primary-pink)] transition-all hover:scale-105 whitespace-nowrap"
                  >
                    {categorySettings[cat]?.displayName || cat}
                  </a>
                ))}
              <button
                onClick={() => setShowOrderTracking(true)}
                className="hover:text-[var(--primary-pink)] transition-all hover:scale-105 whitespace-nowrap flex items-center gap-1 ml-4 pl-6 border-l border-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Tra cứu đơn hàng
              </button>
            </nav>

            {/* Desktop Marquee Notification */}
            {globalSettings.showNotifications && globalSettings.notifications && globalSettings.notifications.length > 0 && (
              <div className="w-[400px] xl:w-[500px] overflow-hidden relative h-6 flex items-center mt-1">
                {/* Bell Icon */}
                <div className="flex-shrink-0 mr-2 text-pink-500 animate-bell">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                </div>

                <div className="ticker-wrap">
                  <div
                    className="animate-ticker"
                    style={{ animationDuration: `${globalSettings.notificationSpeed || 20}s` }}
                  >
                    {/* Render items multiple times for seamless loop */}
                    {globalSettings.notifications.map((note, i) => (
                      <span key={`d1-${i}`} className="ticker-item text-xs leading-6">
                        {note}
                      </span>
                    ))}
                    {globalSettings.notifications.map((note, i) => (
                      <span key={`d2-${i}`} className="ticker-item text-xs leading-6">
                        {note}
                      </span>
                    ))}
                    {globalSettings.notifications.map((note, i) => (
                      <span key={`d3-${i}`} className="ticker-item text-xs leading-6">
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          {/* Backdrop */}
          <div className="absolute inset-0 modal-backdrop-glass transition-opacity" onClick={() => setIsMobileMenuOpen(false)}></div>

          {/* Drawer */}
          {/* Drawer */}
          <div className="absolute top-0 left-0 bottom-0 w-[300px] bg-[var(--surface-color)] shadow-2xl p-6 flex flex-col animate-in slide-in-from-left duration-300 border-r border-white/40">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-200/50">
              {globalSettings.useImageLogo && globalSettings.logoUrl ? (
                <img src={globalSettings.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
              ) : (
                <div className="logo-loader !h-8">
                  <svg viewBox="0 0 320 70" className="h-full w-auto">
                    <text
                      x="0"
                      y="50"
                      className="logo-text-path dash gradient-c"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pathLength="360"
                      style={{ fontSize: '32px' }}
                    >
                      HOASAPHCM.VN
                    </text>
                  </svg>
                </div>
              )}
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200/50 transition-all text-gray-500 hover:text-rose-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-20 custom-scrollbar">
              <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-gray-400 pl-2">Danh mục sản phẩm</div>
              {categories
                .filter(cat => !categorySettings[cat]?.isHidden) // Lọc danh mục không bị ẩn
                .map(cat => (
                  <button
                    key={cat}
                    onClick={() => {
                      scrollToCategory(cat);
                      setIsMobileMenuOpen(false); // Close menu after clicking category
                    }}
                    className="text-left py-3 px-4 rounded-2xl text-sm font-semibold bg-white/40 border border-white/60 shadow-sm hover:shadow-md hover:bg-white/80 hover:text-[var(--primary-pink)] hover:scale-[1.02] transition-all flex justify-between items-center group"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {categorySettings[cat]?.displayName || cat}
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-[var(--primary-pink)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </button>
                ))}

              <div className="my-2 border-t border-gray-200/50"></div>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowOrderTracking(true);
                }}
                className="text-left py-4 px-5 rounded-2xl font-bold bg-gradient-to-r from-pink-50 to-white border border-pink-100 shadow-sm text-pink-600 hover:shadow-md hover:scale-[1.02] transition-all flex justify-between items-center group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  Tra cứu đơn hàng
                </div>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8 mt-16">
        {categories.map((category) => {
          // Skip hidden categories
          if (categorySettings[category]?.isHidden) return null;

          // Sử dụng hàm helper dùng chung để đảm bảo đồng bộ với Admin
          const categoryProducts = getProductsInCategory(category, products);

          if (categoryProducts.length === 0) return null;

          const settings = categorySettings[category] || {
            name: category,
            itemsPerPage: 12,
            paginationType: 'loadmore' as PaginationType,
            imageTransition: 'none' as ImageTransitionEffect
          };

          const currentPage = categoryPages[category] || 1;
          const currentAspectRatio = globalSettings.aspectRatio === 'custom'
            ? (globalSettings.customValue || '3/4').replace(/:/g, '/').replace(/x/gi, '/')
            : globalSettings.aspectRatio;

          return (
            <CategorySection
              key={category}
              category={category}
              settings={settings}
              products={categoryProducts}
              currentPage={currentPage}
              globalAspectRatio={currentAspectRatio || '3/4'}
              mediaMetadata={mediaMetadata}
              onLoadMore={() => loadMoreProducts(category)}
              onPageChange={(page) => setCategoryPages(prev => ({ ...prev, [category]: page }))}
              onImageClick={(images, index) => openLightbox(images, index)}
              showSKU={globalSettings.showSKU}
              zaloLink={globalSettings.zaloLink}
              enablePriceDisplay={globalSettings.enablePriceDisplay}
              onOrderClick={(product) => setOrderModalProduct(product)}
            />
          );
        })}
      </main>

      {globalSettings.enableLightbox && (
        <ImageLightbox
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          isOpen={lightboxData.isOpen}
          onClose={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
          productTitle={lightboxData.productTitle}
          productSKU={lightboxData.productSKU}
          variants={lightboxData.variants}
        />
      )}

      {/* Product Order Modal */}
      {orderModalProduct && (
        <ProductOrderModal
          product={orderModalProduct}
          onClose={() => setOrderModalProduct(null)}
          mediaMetadata={mediaMetadata}
          onImageClick={openLightbox}
          globalSettings={globalSettings}
        />
      )}

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={showOrderTracking}
        onClose={() => setShowOrderTracking(false)}
      />

      <footer className="bg-neutral-50 border-t border-neutral-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h4 className="font-bold text-xl mb-3 serif text-rose-600">{globalSettings.footerTitle || globalSettings.websiteName}</h4>
          <p className="text-neutral-500 text-sm leading-relaxed max-w-2xl mx-auto">
            {globalSettings.footerDescription || 'Tiệm hoa cao cấp - Nơi khởi nguồn của những cảm xúc chân thành nhất qua từng đóa hoa tươi.'}
          </p>

          {/* Facebook Page Widget */}
          {globalSettings.showFacebookWidget && globalSettings.facebookPageUrl && (
            <div className="mt-8 flex justify-center">
              <div className="glass p-6 rounded-2xl inline-block">
                <h5 className="text-lg font-bold mb-4 text-[var(--primary-pink)]">
                  📘 Theo dõi chúng tôi trên Facebook
                </h5>
                <div className="flex justify-center">
                  <FacebookPagePlugin
                    pageUrl={globalSettings.facebookPageUrl}
                    width={340}
                    height={500}
                    showPosts={true}
                    hideCover={false}
                    showFacepile={true}
                    smallHeader={false}
                  />
                </div>
              </div>
            </div>
          )}

          <p className="text-neutral-400 text-xs mt-6">
            {globalSettings.footerCopyright || `© ${new Date().getFullYear()} ${globalSettings.websiteName}. All rights reserved.`}
          </p>
        </div>
      </footer>

      {/* NÚT GỌI ĐIỆN NỔI - Phía trên */}
      <a href={`tel:${globalSettings.phoneNumber}`} className="fixed bottom-24 right-4 z-50 group">
        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all relative">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z" />
          </svg>
          <div className="absolute inset-0 w-14 h-14 bg-green-500 rounded-full animate-ping opacity-20 -z-10"></div>
        </div>
      </a>

      {/* NÚT ZALO NỔI - Phía dưới */}
      <a href={globalSettings.zaloLink} target="_blank" className="fixed bottom-6 right-4 z-50 group">
        <div className="w-14 h-14 bg-[#0068ff] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all relative">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Icon_of_Zalo.svg/1200px-Icon_of_Zalo.svg.png" className="w-9 h-9" alt="Zalo" />
          <div className="absolute inset-0 w-14 h-14 bg-[#0068ff] rounded-full animate-ping opacity-20 -z-10"></div>
        </div>
      </a>
    </div >
  );
};

export default App;
