import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone', //  for Docker

  serverExternalPackages: ['undifferent'],

  async redirects() {
    return [
      // Temporary while the / landing page is undecided: the Secretariat
      // mandate explorer is the de-facto home.
      {
        source: '/',
        destination: '/secretariat',
        permanent: false,
      },
      // Old routes folded into the new navigation structure.
      {
        source: '/contact',
        destination: '/system',
        permanent: false,
      },
      {
        source: '/contacts',
        destination: '/system',
        permanent: false,
      },
      {
        source: '/methodology',
        destination: '/about',
        permanent: false,
      },
      {
        source: '/resources',
        destination: '/about',
        permanent: false,
      },
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
