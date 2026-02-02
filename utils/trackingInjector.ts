/**
 * Simple Script Injector
 * Inject tracking scripts directly into <head>
 */

export function injectTrackingScripts(settings: any) {
    if (typeof window === 'undefined') return;

    // Remove old tracking scripts first
    removeTrackingScripts();

    const scripts: string[] = [];

    // Google Tag Manager
    if (settings.googleTagManagerId) {
        const gtmScript = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${settings.googleTagManagerId}');
    `;
        scripts.push(gtmScript);
        console.log('📊 GTM loaded:', settings.googleTagManagerId);
    }

    // Google Analytics 4
    if (settings.googleAnalyticsId) {
        // Load gtag.js
        const gtagScriptTag = document.createElement('script');
        gtagScriptTag.async = true;
        gtagScriptTag.src = `https://www.googletagmanager.com/gtag/js?id=${settings.googleAnalyticsId}`;
        gtagScriptTag.setAttribute('data-tracking', 'ga4');
        document.head.appendChild(gtagScriptTag);

        const ga4Script = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.googleAnalyticsId}');
    `;
        scripts.push(ga4Script);
        console.log('📊 GA4 loaded:', settings.googleAnalyticsId);
    }

    // Google Ads Conversion
    if (settings.googleAdsConversionId) {
        const adsScript = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${settings.googleAdsConversionId}');
    `;
        scripts.push(adsScript);
        console.log('🎯 Google Ads loaded:', settings.googleAdsConversionId);
    }

    // Facebook Pixel
    if (settings.facebookPixelId) {
        const fbPixelScript = `
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window,document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${settings.facebookPixelId}');
      fbq('track', 'PageView');
    `;
        scripts.push(fbPixelScript);
        console.log('📘 Facebook Pixel loaded:', settings.facebookPixelId);
    }

    // Inject all scripts
    scripts.forEach(scriptContent => {
        const scriptTag = document.createElement('script');
        scriptTag.innerHTML = scriptContent;
        scriptTag.setAttribute('data-tracking', 'custom');
        document.head.appendChild(scriptTag);
    });
}

export function removeTrackingScripts() {
    // Remove all tracking scripts
    const trackingScripts = document.querySelectorAll('script[data-tracking]');
    trackingScripts.forEach(script => script.remove());
}

// Track Google Ads Conversion (called when order submitted)
export function trackConversion(settings: any, orderValue: number) {
    if (typeof window === 'undefined') return;

    // Google Ads Conversion
    if (settings.googleAdsConversionId && settings.googleAdsConversionLabel && (window as any).gtag) {
        (window as any).gtag('event', 'conversion', {
            'send_to': `${settings.googleAdsConversionId}/${settings.googleAdsConversionLabel}`,
            'value': orderValue,
            'currency': 'VND'
        });
        console.log('🎯 Google Ads Conversion tracked:', orderValue);
    }

    // Facebook Pixel Purchase
    if (settings.facebookPixelId && (window as any).fbq) {
        (window as any).fbq('track', 'Purchase', {
            value: orderValue,
            currency: 'VND'
        });
        console.log('📘 Facebook Pixel Purchase tracked:', orderValue);
    }

    // GA4 Purchase Event
    if (settings.googleAnalyticsId && (window as any).gtag) {
        (window as any).gtag('event', 'purchase', {
            value: orderValue,
            currency: 'VND'
        });
        console.log('📊 GA4 Purchase tracked:', orderValue);
    }
}
