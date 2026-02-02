import React, { useState, useEffect } from 'react';

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
    width = 500,
    height = 300,
    showPosts = true,
    hideCover = false,
    showFacepile = true,
    smallHeader = false
}) => {
    const [isMobile, setIsMobile] = useState(false);
    const [containerWidth, setContainerWidth] = useState(width);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);

            // Calculate width based on screen size
            if (mobile) {
                // Mobile: container width - padding (40px total)
                const calculatedWidth = Math.min(window.innerWidth - 40, width);
                setContainerWidth(calculatedWidth);
            } else {
                setContainerWidth(width);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, [width]);

    // Encode the page URL for the iframe src
    const encodedPageUrl = encodeURIComponent(pageUrl);
    const tabs = showPosts ? 'timeline' : '';

    const iframeSrc = `https://www.facebook.com/plugins/page.php?href=${encodedPageUrl}&tabs=${tabs}&width=${containerWidth}&height=${height}&small_header=${smallHeader}&adapt_container_width=true&hide_cover=${hideCover}&show_facepile=${showFacepile}&appId=720604248414654`;

    return (
        <div className="facebook-page-plugin-wrapper" style={{ maxWidth: '100%', width: '100%' }}>
            <div style={{ maxWidth: `${containerWidth}px`, margin: '0 auto' }}>
                <iframe
                    src={iframeSrc}
                    width={containerWidth}
                    height={height}
                    style={{ border: 'none', overflow: 'hidden', maxWidth: '100%' }}
                    scrolling="no"
                    frameBorder="0"
                    allowFullScreen={true}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                />
            </div>
        </div>
    );
};

export default FacebookPagePlugin;
