import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', //  for Docker

  async redirects() {
    return [
      {
        source: '/ppb2027',
        destination: 'https://mandate-housekeeping.un-two-zero.dev/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
