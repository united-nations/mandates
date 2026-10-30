import { ImageResponse } from 'next/og'
import { getDocumentDiscovery } from '@/lib/data/document-discovery'
export async function GET(request: Request) {
  const symbol = new URL(request.url).searchParams.get('symbol')
  if (!symbol) return new Response('Missing symbol', { status: 400 })
  const record = await getDocumentDiscovery(symbol)
  if (!record) return new Response('Not found', { status: 404 })
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#fff',
        color: '#182c3c',
        padding: 64,
        width: '100%',
        height: '100%',
        borderTop: '16px solid #009edb',
      }}
    >
      <div style={{ fontSize: 28, color: '#0077a8' }}>UN Mandate Registry</div>
      <div style={{ fontSize: 32, marginTop: 36 }}>{record.symbol}</div>
      <div style={{ fontSize: 48, marginTop: 20, lineHeight: 1.15 }}>
        {record.title.length > 180
          ? `${record.title.slice(0, 177)}…`
          : record.title}
      </div>
      <div style={{ fontSize: 26, marginTop: 'auto' }}>
        {[record.body, record.year].filter(Boolean).join(' · ')}
      </div>
    </div>,
    { width: 1200, height: 630 }
  )
}
