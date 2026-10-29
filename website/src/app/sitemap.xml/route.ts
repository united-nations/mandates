import { getSitemapCount } from '@/lib/data/document-discovery'
import { SITE_URL } from '@/lib/seo'
export const dynamic = 'force-dynamic'
export async function GET() {
  const count = Math.max(1, Math.ceil((await getSitemapCount()) / 20000))
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: count }, (_, i) => `<sitemap><loc>${SITE_URL}/sitemap/${i}.xml</loc></sitemap>`).join('')}</sitemapindex>`,
    {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600',
      },
    }
  )
}
