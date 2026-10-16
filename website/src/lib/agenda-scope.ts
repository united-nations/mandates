import {
  parseAgendaScope,
  type AgendaBody,
  type AgendaScope,
} from '#lib/agenda-scope-client'
export {
  parseAgendaScope,
  normalizeAgendaItem,
  agendaScopeHref,
  agendaScopeItemLabel,
  type AgendaBody,
  type AgendaScope,
} from '#lib/agenda-scope-client'
import { mandateMembershipSql } from '#lib/mandate-membership'
import hrcSnapshot from './data/hrc-agenda-snapshot.json' with { type: 'json' }
import { getScAgendaSnapshot } from '#lib/sc-agenda-snapshot'
import { scHeadingMandateDocuments } from '#lib/sc-agenda'

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

export const normalizedDocumentSql = (value: string) =>
  `UPPER(REGEXP_REPLACE(NORMALIZE(${value}, NFKC), '[[:space:]]', '', 'g'))`

/** One actual catalogue representative per verified SC adoption symbol. */
export const scRegistryResolutionSql = (start: number) => `
  WITH sc_candidates AS MATERIALIZED (
    SELECT d.ppb_full_document_symbol, d.is_catalog_pattern,
      ${normalizedDocumentSql('d.ppb_full_document_symbol')} AS identity
    FROM public.unified_documents d
    WHERE ${normalizedDocumentSql('d.ppb_full_document_symbol')} = ANY($${start}::text[])
  )
  SELECT MIN(d.ppb_full_document_symbol) AS symbol, d.identity
  FROM sc_candidates d
  WHERE ${mandateMembershipSql('d')}
  GROUP BY d.identity`

// Symbol families, not unreliable stored type labels (drafts can say Resolutions).
export const adoptedResolutionSql = (value: string) =>
  `${normalizedDocumentSql(value)} ~ '^(A(/HRC)?/RES/[0-9]+/|E/RES/[0-9]{4}/|S/RES/[0-9]+\\()'`

export const normalizedAgendaItemSql = (value: string) =>
  `REGEXP_REPLACE(REGEXP_REPLACE(LOWER(REGEXP_REPLACE(REGEXP_REPLACE(NORMALIZE(${value}, NFKC), '^[[:space:]]+|[[:space:]]+$', '', 'g'), '(\\[[0-9]+\\])+$', '')), '[[:space:]()]', '', 'g'), '^0+([0-9])', '\\1')`

/** Read-only reconciliation of every registered mandate type and its DL agenda tags. */
export const agendaResolutionReferenceCte = () => `
  agenda_resolution_registry AS MATERIALIZED (
    SELECT MIN(d.ppb_full_document_symbol) AS symbol,
      ${normalizedDocumentSql('d.ppb_full_document_symbol')} AS identity
    FROM public.unified_documents d
    WHERE ${mandateMembershipSql('d')}
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

/** Uses only official item tokens supplied by the mirrored hierarchy.
 * GA, ECOSOC and HRC scopes take their symbols pre-resolved (agendaScopeSymbols):
 * embedding the reference scans here re-ran them in every filtered query on the
 * page, and the page's concurrent queries ran past the database timeout. */
export function agendaResolutionPredicate(
  scope: AgendaScope | null,
  start: number,
  symbols: string[] | undefined
) {
  if (!scope) return { predicate: 'FALSE', params: [] as (string | string[])[] }
  if (scope.body === 'SC') {
    const validated = parseAgendaScope(JSON.stringify(scope))
    if (!validated)
      return { predicate: 'FALSE', params: [] as (string | string[])[] }
    const symbols = scHeadingMandateDocuments(
      getScAgendaSnapshot(validated.session)!,
      validated.session,
      validated.item
    )!
    return {
      predicate: `d.ppb_full_document_symbol IN (SELECT symbol FROM (${scRegistryResolutionSql(start)}) sc_resolutions)`,
      params: [symbols],
    }
  }
  if (!symbols)
    throw new Error(
      `Agenda scope ${scope.body} ${scope.session} ${scope.item} reached the filter without resolved symbols`
    )
  return {
    predicate: `d.ppb_full_document_symbol = ANY($${start}::text[])`,
    params: [symbols],
  }
}
