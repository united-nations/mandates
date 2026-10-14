import type { NextConfig } from 'next'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'

const installedUi = path.join(__dirname, 'node_modules/@un-eosg/ui')
const localUi = path.resolve(__dirname, '../../ui')
const linkedUi =
  existsSync(installedUi) && realpathSync(installedUi) === localUi

const nextConfig: NextConfig = {
  // Standalone is what the Docker image copies and runs; omitted on Vercel,
  // whose builders fail after page generation on Next 16.3.4 with standalone
  // set, looking for a .next/next-server.js.nft.json that is never written.
  output: process.env.VERCEL ? undefined : 'standalone',

  transpilePackages: ['@un-eosg/ui'],
  // A live sibling package must be inside Turbopack's watched filesystem root.
  turbopack: { root: linkedUi ? path.resolve(__dirname, '../..') : __dirname },

  serverExternalPackages: ['undifferent'],

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // These directives do not interfere with Next's inline bootstrap or
          // the analytics/feedback integrations. A strict script policy needs
          // request nonces and separate browser validation before enforcement.
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
          },
        ],
      },
    ]
  },

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
      // The organs / entities / subjects / about pages are now sections of the
      // single /secretariat page. The hash targets the matching section; if the
      // fragment is dropped, the ExpandableCard hash listener still auto-opens
      // Methodology once on the page.
      {
        source: '/organs',
        destination: '/secretariat#organs',
        permanent: false,
      },
      {
        source: '/entities',
        destination: '/secretariat#entities',
        permanent: false,
      },
      {
        source: '/subjects',
        destination: '/secretariat#subjects',
        permanent: false,
      },
      {
        source: '/about',
        destination: '/methodology',
        permanent: false,
      },
      {
        source: '/resources',
        destination: '/secretariat#resources',
        permanent: false,
      },
      {
        source: '/ppb2027',
        destination: 'https://mandate-housekeeping.un-two-zero.dev/',
        permanent: true,
      },
      {
        source: '/diff',
        destination: 'https://diff.un-two-zero.org/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
