import { MandateDetailSheet } from '@/components/MandateDetailSheet'
import { getMandateBySymbol } from '@/lib/data/mandates'
import { decodeUrlSegments, getMandateDisplayTitle } from '@/lib/utils'

/**
 * The sheet needs the record's name for its header, and only the route knows
 * it. The same query runs in the page below; `readRequestQueryCache` keys on
 * the SQL text and params, so the second call is served from the request cache
 * rather than the database.
 */
export default async function ModalMandateLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ segments: string[] }>
}) {
  const { segments } = await params
  const symbol = decodeUrlSegments(segments)
  const mandate = await getMandateBySymbol(symbol)

  return (
    <MandateDetailSheet
      eyebrow="Mandate document"
      title={mandate ? getMandateDisplayTitle(mandate) : symbol}
      symbol={mandate?.full_document_symbol ?? symbol}
      link={mandate?.link ?? null}
    >
      {children}
    </MandateDetailSheet>
  )
}
