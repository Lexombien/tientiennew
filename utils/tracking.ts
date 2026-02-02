/**
 * Tracking Scripts Manager
 * Automatically inject Google Analytics, Google Ads, Facebook Pixel
 */

interface TrackingConfig {
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    googleAdsConversionId?: string;
    googleAdsConversionLabel?: string;
    facebookPixelId?: string;
}

/**
 * Initialize all tracking scripts
 */
export function initializeTracking(config: TrackingConfig) {
    // Google Tag Manager (GTM) - Should be first
    if (config.googleTagManagerId) {
        initGoogleTagManager(config.googleTagManagerId);
    }

    // Google Analytics 4 (GA4)
    if (config.googleAnalyticsId) {
        initGoogleAnalytics(config.googleAnalyticsId);
    }

    // Google Ads Conversion Tracking
    if (config.googleAdsConversionId) {
        initGoogleAds(config.googleAdsConversionId);
    }

    // Facebook Pixel
    if (config.facebookPixelId) {
        initFacebookPixel(config.facebookPixelId);
    }
}

/**
 * Google Tag Manager (GTM)
 */
function initGoogleTagManager(gtmId: string) {
    if (typeof window === 'undefined') return;

    // GTM Script
    (function (w: any, d: Document, s: string, l: string, i: string) {
        w[l] = w[l] || [];
        w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        const f = d.getElementsByTagName(s)[0];
        const j = d.createElement(s) as HTMLScriptElement;
        const dl = l !== 'dataLayer' ? '&l=' + l : '';
        j.async = true;
        j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
        f.parentNode?.insertBefore(j, f);
    })(window, document, 'script', 'dataLayer', gtmId);

    console.log('📊 Google Tag Manager initialized:', gtmId);
}

/**
 * Google Analytics 4 (GA4)
 */
function initGoogleAnalytics(measurementId: string) {
    if (typeof window === 'undefined') return;

    // Load gtag.js
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    // Initialize gtag
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
        (window as any).dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', measurementId);

    console.log('📊 Google Analytics 4 initialized:', measurementId);
}

/**
 * Google Ads Conversion Tracking
 */
function initGoogleAds(conversionId: string) {
    if (typeof window === 'undefined') return;

    // Load gtag.js (if not already loaded by GA4)
    if (!(window as any).gtag) {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${conversionId}`;
        document.head.appendChild(script);

        (window as any).dataLayer = (window as any).dataLayer || [];
        function gtag(...args: any[]) {
            (window as any).dataLayer.push(arguments);
        }
        (window as any).gtag = gtag;

        gtag('js', new Date());
    }

    // Configure Google Ads
    (window as any).gtag('config', conversionId);

    console.log('🎯 Google Ads initialized:', conversionId);
}

/**
 * Facebook Pixel
 */
function initFacebookPixel(pixelId: string) {
    if (typeof window === 'undefined') return;

    // Facebook Pixel Code
    !(function (f: any, b: Document, e: string, v: string, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e) as HTMLScriptElement;
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode?.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    (window as any).fbq('init', pixelId);
    (window as any).fbq('track', 'PageView');

    console.log('📘 Facebook Pixel initialized:', pixelId);
}

/**
 * Track Google Ads Conversion (e.g. on order completion)
 */
export function trackGoogleAdsConversion(conversionId: string, conversionLabel: string, value?: number, currency: string = 'VND') {
    if (typeof window === 'undefined' || !(window as any).gtag) return;

    (window as any).gtag('event', 'conversion', {
        send_to: `${conversionId}/${conversionLabel}`,
        value: value,
        currency: currency,
    });

    console.log('🎯 Google Ads Conversion tracked:', conversionLabel, value);
}

/**
 * Track Facebook Pixel Purchase Event
 */
export function trackFacebookPurchase(value: number, currency: string = 'VND') {
    if (typeof window === 'undefined' || !(window as any).fbq) return;

    (window as any).fbq('track', 'Purchase', {
        value: value,
        currency: currency,
    });

    console.log('📘 Facebook Purchase tracked:', value, currency);
}

/**
 * Track GA4 Purchase Event
 */
export function trackGA4Purchase(transactionId: string, value: number, items: any[]) {
    if (typeof window === 'undefined' || !(window as any).gtag) return;

    (window as any).gtag('event', 'purchase', {
        transaction_id: transactionId,
        value: value,
        currency: 'VND',
        items: items,
    });

    console.log('📊 GA4 Purchase tracked:', transactionId, value);
}
