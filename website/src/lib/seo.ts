import type { Metadata } from 'next'
export const SITE_URL = 'https://mandates.un.org'
export const SITE_NAME = 'UN Mandate Registry'
export function mandatePath(symbol: string) {
  return `/mandate/${symbol.split('/').map(encodeURIComponent).join('/')}`
}
export function documentSeo(record: {
  symbol: string
  title: string
  body?: string | null
  year?: string | number | null
}) {
  const { symbol, title, body, year } = record
  const path = mandatePath(symbol)
  const description = `${title} (${symbol})${body ? `, issued by ${body}` : ''}${year ? ` in ${year}` : ''}. Explore its text, resolution history and citations in UN programme budgets.`
  const image = `/og/mandate?symbol=${encodeURIComponent(symbol)}`
  return {
    title: `${title} — ${symbol} | ${SITE_NAME}`,
    description,
    alternates: {
      canonical: path,
      types: { 'application/json': `${path}.json` },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      images: [
        { url: image, width: 1200, height: 630, alt: `${title} — ${symbol}` },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  } satisfies Metadata
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
