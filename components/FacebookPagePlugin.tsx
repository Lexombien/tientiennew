import React, { useEffect } from 'react';

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
    height = 500,
    showPosts = true,
    hideCover = false,
    showFacepile = true,
    smallHeader = false
}) => {
    useEffect(() => {
        // Load Facebook SDK
        if (!(window as any).FB) {
            const script = document.createElement('script');
            script.src = 'https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v18.0';
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            document.body.appendChild(script);

            script.onload = () => {
                if ((window as any).FB) {
                    (window as any).FB.XFBML.parse();
                }
            };
        } else {
            // If SDK is already loaded, parse XFBML
            (window as any).FB.XFBML.parse();
        }
    }, [pageUrl]);

    return (
        <div className="facebook-page-plugin-wrapper">
            <div id="fb-root"></div>
            <div
                className="fb-page"
                data-href={pageUrl}
                data-tabs={showPosts ? "timeline" : ""}
                data-width={width}
                data-height={height}
                data-hide-cover={hideCover}
                data-show-facepile={showFacepile}
                data-small-header={smallHeader}
            >
                <blockquote cite={pageUrl} className="fb-xfbml-parse-ignore">
                    <a href={pageUrl}>Facebook</a>
                </blockquote>
            </div>
        </div>
    );
};

export default FacebookPagePlugin;
