import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', //  for Docker

  serverExternalPackages: ['undifferent'],

  async redirects() {
    return [
      {
        source: '/ppb2027',
        destination: 'https://mandate-housekeeping.un-two-zero.dev/',
        permanent: true,
      },
      {
        source: '/diff',
        destination: 'https://diff.un-two-zero.dev/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
