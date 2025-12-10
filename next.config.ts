import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    output: 'standalone',
    /* config options here */
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    trailingSlash: false,
    // Compress responses
    compress: true,
};

export default nextConfig;
