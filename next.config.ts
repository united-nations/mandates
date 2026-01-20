import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  typedRoutes: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // Note: eslint config is no longer supported in next.config.ts in Next.js 16
  // Configure ESLint directly in .eslintrc.json or eslint.config.js instead
  trailingSlash: false,
  // Compress responses
  compress: true,
  // Externalize server-only packages that use Node.js APIs
  serverExternalPackages: ['undifferent', 'word-extractor', 'unpdf'],
}

export default nextConfig
