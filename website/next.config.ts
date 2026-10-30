import type { NextConfig } from 'next'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'

const installedUi = path.join(__dirname, 'node_modules/@un-eosg/ui')
const localUi = path.resolve(__dirname, '../../ui')
const linkedUi =
  existsSync(installedUi) && realpathSync(installedUi) === localUi
const workspaceRoot = path.resolve(__dirname, '../..')

const nextConfig: NextConfig = {
  // Standalone is what the Docker image copies and runs; omitted on Vercel,
  // whose builders fail after page generation on Next 16.3.4 with standalone
  // set, looking for a .next/next-server.js.nft.json that is never written.
  output: process.env.VERCEL ? undefined : 'standalone',

  transpilePackages: ['@un-eosg/ui'],
  // A live sibling package must be inside Turbopack's watched filesystem root.
  turbopack: {
    root: linkedUi ? workspaceRoot : __dirname,
    // Linked UI and the app must share React, including when their installs
    // resolve different peer versions.
    resolveAlias: linkedUi
      ? {
          react:
            './' +
            path.relative(
              workspaceRoot,
              path.join(__dirname, 'node_modules/react')
            ),
          'react-dom':
            './' +
            path.relative(
              workspaceRoot,
              path.join(__dirname, 'node_modules/react-dom')
            ),
        }
      : undefined,
  },

  serverExternalPackages: ['undifferent'],

  async headers() {
    return [
      {
        source: '/api/v1/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        ],
      },
      {
        source: '/openapi.json',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=300' },
        ],
      },
      {
        source: '/mandate/:symbol*',
        headers: [
          {
            key: 'Link',
            value:
              '</llms.txt>; rel="help"; type="text/plain", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"',
          },
        ],
      },
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

  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/mandate/:symbol*.json',
          destination: '/api/v1/documents/:symbol*',
        },
      ],
    }
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
      // Legacy directory routes point to the matching Secretariat sections.
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
        source: '/methodology',
        destination: '/about',
        permanent: false,
      },
      {
        source: '/developers',
        destination: '/about#programmatic-access',
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
