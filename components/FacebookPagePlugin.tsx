import React, { useEffect, useState } from 'react';

interface FacebookPagePluginProps {
    pageUrl: string;
    width?: number;
    height?: number;
    showPosts?: boolean;
    hideCover?: boolean;
    showFacepile?: boolean;
    smallHeader?: boolean;
}

const FacebookPagePlugin: React.FC<FacebookPagePluginProps> = ({
    pageUrl,
    width = 340,
    height = 300,
    showPosts = true,
    hideCover = false,
    showFacepile = true,
    smallHeader = false
}) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Only load SDK in browser environment
        if (typeof window === 'undefined') return;

        // Load Facebook SDK
        if (!(window as any).FB) {
            // Remove existing script if any
            const existingScript = document.getElementById('facebook-jssdk');
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v18.0';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';

            script.onload = () => {
                if ((window as any).FB) {
                    (window as any).FB.XFBML.parse();
                }
            };

            const fjs = document.getElementsByTagName('script')[0];
            if (fjs && fjs.parentNode) {
                fjs.parentNode.insertBefore(script, fjs);
            }
        } else {
            // If SDK is already loaded, parse XFBML
            setTimeout(() => {
                if ((window as any).FB) {
                    (window as any).FB.XFBML.parse();
                }
            }, 100);
        }
    }, [pageUrl]);

    // Adjust width for mobile
    const responsiveWidth = isMobile ? Math.min(width, window.innerWidth - 80) : width;

    return (
        <div className="facebook-page-plugin-wrapper">
            <div id="fb-root"></div>
            <div
                className="fb-page"
                data-href={pageUrl}
                data-tabs={showPosts ? "timeline" : ""}
                data-width={responsiveWidth}
                data-height={height}
                data-hide-cover={hideCover}
                data-show-facepile={showFacepile}
                data-small-header={smallHeader}
                data-adapt-container-width="true"
            >
                <blockquote cite={pageUrl} className="fb-xfbml-parse-ignore">
                    <a href={pageUrl}>Facebook</a>
                </blockquote>
            </div>
        </div>
    );
};

export default FacebookPagePlugin;
