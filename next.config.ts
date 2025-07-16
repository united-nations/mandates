import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Optimize CSS loading - disabled due to build issues
  // experimental: {
  //   optimizeCss: true,
  // },
  // Enable static optimization
  trailingSlash: false,
  // Compress responses
  compress: true,
};

export default nextConfig;
