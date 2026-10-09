import hrcSnapshot from './data/hrc-agenda-snapshot.json' with { type: 'json' }
import { scAgendaSnapshot } from '#lib/sc-agenda-snapshot'
import { scHeadingResolutions, scHeadingDisplayTitle } from '#lib/sc-agenda'

export type AgendaBody = 'GA' | 'ECOSOC' | 'HRC' | 'SC'
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
    if (scope?.body === 'SC') {
      if (
        scope.session !== scAgendaSnapshot.year ||
        typeof scope.item !== 'string' ||
        !Array.isArray(scope.items) ||
        scope.items.length !== 1 ||
        scope.items[0] !== scope.item ||
        !scHeadingResolutions(scAgendaSnapshot, scope.session, scope.item)
      )
        return null
      return {
        body: 'SC',
        session: scope.session,
        item: scope.item,
        items: [scope.item],
      }
    }
    if (
      !scope ||
      !['GA', 'ECOSOC', 'HRC'].includes(scope.body) ||
      typeof scope.session !== 'string' ||
      !/^\d+$/.test(scope.session) ||
      (scope.body === 'ECOSOC' && !/^\d{4}$/.test(scope.session)) ||
      (scope.body === 'HRC' &&
        !hrcSnapshot.sessions.some(
          (source) => source.session === scope.session
        )) ||
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
      (scope.body === 'HRC' &&
        (scope.items.length !== 1 ||
          !hrcSnapshot.items.some((item) => item.item === scope.item))) ||
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

export const agendaDocumentSymbol = (body: AgendaBody, session: string) => {
  if (body === 'SC')
    throw new Error(
      'SC considered matters have no annual numbered agenda document'
    )
  return body === 'GA'
    ? `A/${session}/251`
    : body === 'HRC'
      ? `A/HRC/${session}/1`
      : `E/${session}/100`
}

/** Only the base agenda and the revision actually present in the verified snapshot. */
export function agendaDocumentSymbols(body: AgendaBody, session: string) {
  const base = agendaDocumentSymbol(body, session)
  const source =
    body === 'HRC'
      ? hrcSnapshot.sessions.find((entry) => entry.session === session)
      : undefined
  return [...new Set([base, ...(source ? [source.symbol.toUpperCase()] : [])])]
}

export const agendaScopeHref = (scope: AgendaScope) =>
  `/secretariat?${new URLSearchParams({ agenda_scope: JSON.stringify(scope), group: '0' })}`

export const normalizedDocumentSql = (value: string) =>
  `UPPER(REGEXP_REPLACE(NORMALIZE(${value}, NFKC), '[[:space:]]', '', 'g'))`

/** One actual catalogue representative per verified SC adoption symbol. */
export const scRegistryResolutionSql = (start: number) => `
  SELECT MIN(d.ppb_full_document_symbol) AS symbol,
    ${normalizedDocumentSql('d.ppb_full_document_symbol')} AS identity
  FROM public.unified_documents d
  WHERE d.is_catalog_pattern
    AND ${normalizedDocumentSql('d.ppb_full_document_symbol')} = ANY($${start}::text[])
  GROUP BY ${normalizedDocumentSql('d.ppb_full_document_symbol')}`

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
  if (scope.body === 'SC') {
    const validated = parseAgendaScope(JSON.stringify(scope))
    if (!validated)
      return { predicate: 'FALSE', params: [] as (string | string[])[] }
    const symbols = scHeadingResolutions(
      scAgendaSnapshot,
      validated.session,
      validated.item
    )!
    return {
      predicate: `d.ppb_full_document_symbol IN (SELECT symbol FROM (${scRegistryResolutionSql(start)}) sc_resolutions)`,
      params: [symbols],
    }
  }
  return {
    predicate: `d.ppb_full_document_symbol IN (
      WITH ${agendaResolutionReferenceCte()}
      SELECT symbol FROM agenda_resolution_refs a
      WHERE ${normalizedDocumentSql("a.reference->>'doc'")} ${scope.body === 'HRC' ? `= ANY($${start}::text[])` : `= $${start}`}
      ${scope.body === 'HRC' ? `AND ${normalizedDocumentSql('a.symbol')} ~ '^A/HRC/RES/[0-9]+/'` : ''}
      AND ${normalizedAgendaItemSql("a.reference->>'item'")} = ANY($${start + 1}::text[])
    )`,
    params: [
      scope.body === 'HRC'
        ? agendaDocumentSymbols(scope.body, scope.session)
        : agendaDocumentSymbol(scope.body, scope.session),
      scope.items,
    ],
  }
}

export const agendaScopeItemLabel = (scope: AgendaScope) =>
  scope.body === 'SC'
    ? scHeadingDisplayTitle(
        scAgendaSnapshot.headings.find((row) => row.id === scope.item)?.title ??
          scope.item
      )
    : scope.item
