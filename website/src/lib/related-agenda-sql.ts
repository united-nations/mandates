/** A single OR union over source-verified occurrences, using production representatives. */
import {
  agendaDocumentSymbols,
  agendaResolutionReferenceCte,
  normalizedAgendaItemSql,
  normalizedDocumentSql,
  scRegistryResolutionSql,
} from '#lib/agenda-scope'
import { getScAgendaSnapshot } from '#lib/sc-agenda-snapshot'
import { scHeadingMandateDocuments } from '#lib/sc-agenda'
import type { RelatedOccurrence } from '#lib/related-agenda-model'

/** Union the existing row targets; source PDF editions remain provenance, not filter aliases. */
export function relatedOccurrencePredicate(
  occurrences: RelatedOccurrence[],
  start: number
) {
  const scopes = [
    ...new Map(
      occurrences
        .filter((row) => row.status === 'verified' && row.scope)
        .map((row) => [
          JSON.stringify([row.scope, row.referenceDocuments, row.itemTokens]),
          row,
        ])
    ).values(),
  ]
  if (!scopes.length)
    return { predicate: 'FALSE', params: [] as (string | string[])[] }
  const references = scopes
    .filter((row) => row.body !== 'SC')
    .map((row) => ({
      body: row.body,
      documents: agendaDocumentSymbols(row.body, row.session),
      items: row.scope!.items,
    }))
  const sc = [
    ...new Set(
      scopes
        .filter((row) => row.body === 'SC')
        .flatMap(
          (row) =>
            scHeadingMandateDocuments(
              getScAgendaSnapshot(row.session)!,
              row.session,
              row.scHeadingId!
            ) ?? []
        )
    ),
  ]
  const params: (string | string[])[] = []
  const selections: string[] = []
  if (references.length) {
    selections.push(referenceUnionSql(start))
    params.push(JSON.stringify(references))
  }
  if (sc.length) {
    selections.push(
      `SELECT symbol FROM (${scRegistryResolutionSql(start + params.length)}) sc_resolutions`
    )
    params.push(sc)
  }
  if (!selections.length) return { predicate: 'FALSE', params }
  return {
    predicate: `d.ppb_full_document_symbol IN (${references.length ? `WITH ${agendaResolutionReferenceCte()} ` : ''}${selections.join(' UNION ')})`,
    params,
  }
}

/** Each binding is an OR arm; its own document and item must match together. */
function referenceUnionSql(start: number) {
  return `SELECT DISTINCT a.symbol FROM agenda_resolution_refs a
    JOIN jsonb_to_recordset($${start}::jsonb) AS b(body text, documents text[], items text[])
      ON ${normalizedDocumentSql("a.reference->>'doc'")} = ANY(b.documents)
      AND ${normalizedAgendaItemSql("a.reference->>'item'")} = ANY(b.items)
      AND (b.body <> 'HRC' OR ${normalizedDocumentSql('a.symbol')} ~ '^A/HRC/')`
}

/** Count exact latest-occurrence targets in one canonical membership query. */
export function relatedOccurrenceCountsSql(occurrences: RelatedOccurrence[]) {
  const bindings = occurrences
    .filter((row) => row.status === 'verified' && row.scope)
    .map((row) => ({
      id: row.id,
      body: row.body,
      documents:
        row.body === 'SC' ? [] : agendaDocumentSymbols(row.body, row.session),
      items: row.scope!.items,
      symbols:
        row.body === 'SC'
          ? (scHeadingMandateDocuments(
              getScAgendaSnapshot(row.session)!,
              row.session,
              row.scHeadingId!
            ) ?? [])
          : [],
    }))
  const symbols = [...new Set(bindings.flatMap((binding) => binding.symbols))]
  return {
    text: `WITH ${agendaResolutionReferenceCte()},
      related_count_bindings AS (
        SELECT * FROM jsonb_to_recordset($1::jsonb)
          AS b(id text, body text, documents text[], items text[], symbols text[])
      ),
      related_count_targets AS (
        SELECT DISTINCT b.id, a.symbol
        FROM related_count_bindings b
        JOIN agenda_resolution_refs a
          ON ${normalizedDocumentSql("a.reference->>'doc'")} = ANY(b.documents)
          AND ${normalizedAgendaItemSql("a.reference->>'item'")} = ANY(b.items)
          AND (b.body <> 'HRC' OR ${normalizedDocumentSql('a.symbol')} ~ '^A/HRC/')
        UNION
        SELECT b.id, s.symbol FROM related_count_bindings b
        JOIN (${scRegistryResolutionSql(2)}) s ON s.identity = ANY(b.symbols)
      )
      SELECT b.id, COUNT(DISTINCT d.ppb_full_document_symbol)::int AS resolution_count
      FROM related_count_bindings b
      LEFT JOIN related_count_targets t ON t.id = b.id
      LEFT JOIN public.unified_documents d ON d.ppb_full_document_symbol = t.symbol
      GROUP BY b.id ORDER BY b.id`,
    params: [JSON.stringify(bindings), symbols],
  }
}
