import { getSitemapSymbols } from '@/lib/data/document-discovery'
import { SITE_URL, mandatePath } from '@/lib/seo'
export const dynamic = 'force-dynamic'
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params
  if (!/^(0|[1-9][0-9]*)\.xml$/.test(file))
    return new Response('Not found', { status: 404 })
  const index = Number(file.slice(0, -4))
  if (!Number.isSafeInteger(index) || index > Number.MAX_SAFE_INTEGER / 20000)
    return new Response('Not found', { status: 404 })
  const rows = await getSitemapSymbols(index * 20000, 20000)
  if (index > 0 && !rows.length)
    return new Response('Not found', { status: 404 })
  const pages =
    index === 0
      ? [
          '/secretariat',
          '/secretariat/agenda-items',
          '/secretariat/entities-and-programs',
          '/methodology',
          '/developers',
          '/system',
        ]
      : []
  const urls = [...pages, ...rows.map((row) => mandatePath(row.symbol))]
  const xml = urls
    .map(
      (path) =>
        `<url><loc>${SITE_URL}${path.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</loc></url>`
    )
    .join('')
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xml}</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, s-maxage=3600',
      },
    }
  )
}
