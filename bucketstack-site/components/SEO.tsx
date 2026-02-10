import { Helmet } from 'react-helmet-async';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
}

export default function SEO({
    title = "BucketStack - Native S3 File Manager for macOS, Windows & Linux",
    description = "BucketStack is a native S3 file manager built with Rust. Manage your S3 buckets like a pro with an intuitive interface. Free, open-source, and available for macOS, Windows, and Linux.",
    image = "https://www.bucketstack.app/logo.png",
    url = "https://www.bucketstack.app/",
    type = "website"
}: SEOProps) {
    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{title}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={url} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={title} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />
            <meta property="og:site_name" content="BucketStack" />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={title} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "BucketStack",
                    "description": "Native S3 file manager built with Rust for macOS, Windows, and Linux",
                    "url": "https://www.bucketstack.app",
                    "applicationCategory": "UtilityApplication",
                    "operatingSystem": ["macOS", "Windows", "Linux"],
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD"
                    },
                    "author": {
                        "@type": "Organization",
                        "name": "BucketStack",
                        "url": "https://www.bucketstack.app",
                        "logo": "https://www.bucketstack.app/logo.png"
                    }
                })}
            </script>
        </Helmet>
    );
}
