export type AgendaBody = 'GA' | 'ECOSOC'
export interface AgendaScope {
  body: AgendaBody
  session: string
  item: string
  items: string[]
}

/** Bracketed subject refinements are not official agenda children. */
export function normalizeAgendaItem(value: string): string | null {
  const compact = value
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .replace(/(?:\[\d+\])+$/, '')
    .replace(/[\s()]/g, '')
  const match = compact.match(/^(\d+)([a-z]*)$/)
  return match ? `${Number(match[1])}${match[2]}` : null
}

export function parseAgendaScope(value?: string): AgendaScope | null {
  try {
    if (!value) return null
    const scope = JSON.parse(value)
    if (
      !scope ||
      !['GA', 'ECOSOC'].includes(scope.body) ||
      typeof scope.session !== 'string' ||
      !/^\d+$/.test(scope.session) ||
      (scope.body === 'ECOSOC' && !/^\d{4}$/.test(scope.session)) ||
      typeof scope.item !== 'string' ||
      !normalizeAgendaItem(scope.item) ||
      !Array.isArray(scope.items) ||
      !scope.items.length ||
      scope.items.length > 1000 ||
      scope.items.some(
        (item: unknown) =>
          typeof item !== 'string' || normalizeAgendaItem(item) !== item
      ) ||
      new Set(scope.items).size !== scope.items.length ||
      !scope.items.includes(normalizeAgendaItem(scope.item)) ||
      scope.items.some(
        (item: string) =>
          !item.startsWith(normalizeAgendaItem(scope.item)!) ||
          !/^[a-z]*$/.test(item.slice(normalizeAgendaItem(scope.item)!.length))
      )
    )
      return null
    return scope as AgendaScope
  } catch {
    return null
  }
}

export const agendaDocumentSymbol = (body: AgendaBody, session: string) =>
  body === 'GA' ? `A/${session}/251` : `E/${session}/100`

export const agendaScopeHref = (scope: AgendaScope) =>
  `/secretariat?${new URLSearchParams({ agenda_scope: JSON.stringify(scope), group: '0' })}`

export const normalizedDocumentSql = (value: string) =>
  `UPPER(REGEXP_REPLACE(NORMALIZE(${value}, NFKC), '[[:space:]]', '', 'g'))`

// Symbol families, not unreliable stored type labels (drafts can say Resolutions).
export const adoptedResolutionSql = (value: string) =>
  `${normalizedDocumentSql(value)} ~ '^(A(/HRC)?/RES/[0-9]+/|E/RES/[0-9]{4}/|S/RES/[0-9]+\\()'`

export const normalizedAgendaItemSql = (value: string) =>
  `REGEXP_REPLACE(REGEXP_REPLACE(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(NORMALIZE(${value}, NFKC), '^[[:space:]]+|[[:space:]]+$', '', 'g'), '(\\[[0-9]+\\])+$', '')), '[[:space:]()]', '', 'g'), '^0+([0-9])', '\\1')`

/** Read-only reconciliation recovers DL tags missing from registry enrichment. */
export const agendaResolutionReferenceCte = () => `
  agenda_resolution_registry AS MATERIALIZED (
    SELECT MIN(d.ppb_full_document_symbol) AS symbol,
      ${normalizedDocumentSql('d.ppb_full_document_symbol')} AS identity
    FROM public.unified_documents d
    WHERE ${adoptedResolutionSql('d.ppb_full_document_symbol')}
    GROUP BY ${normalizedDocumentSql('d.ppb_full_document_symbol')}
  ),
  agenda_resolution_refs AS MATERIALIZED (
    SELECT r.symbol, a AS reference, 'registry' AS provenance
    FROM public.unified_documents d
    JOIN agenda_resolution_registry r ON r.identity = ${normalizedDocumentSql('d.ppb_full_document_symbol')}
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d.agenda_items, '[]'::jsonb)) a
    UNION ALL
    SELECT r.symbol, a AS reference, 'digital_library' AS provenance
    FROM digitallibrary.documents dl
    JOIN agenda_resolution_registry r ON r.identity = ${normalizedDocumentSql('dl.document_symbol')}
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dl.agenda_items, '[]'::jsonb)) a
    WHERE dl.deleted_at IS NULL
  )`

/** Uses only official item tokens supplied by the mirrored hierarchy. */
export function agendaResolutionPredicate(
  scope: AgendaScope | null,
  start: number
) {
  if (!scope) return { predicate: 'FALSE', params: [] as (string | string[])[] }
  return {
    predicate: `d.ppb_full_document_symbol IN (
      WITH ${agendaResolutionReferenceCte()}
      SELECT symbol FROM agenda_resolution_refs a
      WHERE ${normalizedDocumentSql("a.reference->>'doc'")} = $${start}
      AND ${normalizedAgendaItemSql("a.reference->>'item'")} = ANY($${start + 1}::text[])
    )`,
    params: [agendaDocumentSymbol(scope.body, scope.session), scope.items],
  }
}
