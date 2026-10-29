import { Readable, PassThrough } from 'node:stream'
import { once } from 'node:events'
import ExcelJS from 'exceljs'
import type { FilterOptions } from '@/types'
import { API_VERSION, COVERAGE_NOTES } from '../public-api'
import { csvRow, downloadName } from '../export-format'
import { publicExportBatches, resolvePublicVersion, type PublicDocument } from './public-documents'
import { getMandates, getMandateCitationsMany, getResolutionSeriesMany } from './mandates'
import { SITE_URL } from '../seo'

const columns = ['Symbol', 'Title', 'Issuing body', 'Year', 'Document type', 'Subjects', 'Matching entities', 'Matching citation count', 'Matching entity count', 'Source URL', 'Registry URL', 'JSON URL']
const documentValues = (document: PublicDocument) => [document.symbol, document.title, document.issuingBody, document.year, document.documentType, document.subjects.join('; '), document.matchingEntities.join('; '), document.matchingCitationCount, document.matchingEntityCount, document.sourceUrl, document.pageUrl, document.jsonUrl]

export async function documentExport(filters: FilterOptions, format: 'csv' | 'xlsx' | 'json', details: boolean, signal: AbortSignal) {
  const version = await resolvePublicVersion(filters)
  const effectiveFilters = { ...filters, ppb_version: version.slug, group: undefined, page: undefined, limit: undefined }
  const first = await getMandates(effectiveFilters, { limit: 1, batchOffset: 0, includeMetrics: false })
  const generatedAt = new Date().toISOString()
  const metadata = { apiVersion: API_VERSION, generatedAt, totalDocuments: first.totalCount, filters: effectiveFilters,
    requestedGrouping: filters.group === '1', grouping: 'All matching documents; versions expanded',
    budgetVersion: version, coverage: COVERAGE_NOTES, details: details ? 'included' : 'not_included',
    source: SITE_URL, documentation: `${SITE_URL}/developers`,
    consistency: 'Live data, read in batches; source updates during a download may affect results.' }
  const batches = () => publicExportBatches(effectiveFilters, version.slug, details, signal)
  const headers = { 'Content-Disposition': `attachment; filename="${downloadName(format, generatedAt)}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*', 'Access-Control-Expose-Headers': 'Content-Disposition' }
  if (format === 'xlsx') return new Response(excelStream(effectiveFilters, metadata, signal), { headers: { ...headers, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } })
  async function* chunks() {
    if (format === 'csv') {
      yield '\uFEFF' + csvRow([...columns, 'Budget cycle', 'Export generated at', 'Filters', 'Grouping', 'Coverage'])
      for await (const batch of batches()) yield batch.map(document => csvRow([...documentValues(document), version.slug, generatedAt, JSON.stringify(effectiveFilters), metadata.grouping, COVERAGE_NOTES.join(' ')])).join('')
      if (signal.aborted) throw new Error('Export cancelled')
    } else {
      yield `{"metadata":${JSON.stringify(metadata)},"documents":[`
      let comma = ''
      let exportedCount = 0
      for await (const batch of batches()) {
        for (const document of batch) { yield comma + JSON.stringify(document); comma = ','; exportedCount++ }
      }
      if (signal.aborted) throw new Error('Export cancelled')
      yield `],"exportedDocuments":${exportedCount}}`
    }
  }
  return new Response(Readable.toWeb(Readable.from(chunks())) as ReadableStream<Uint8Array>, { headers: { ...headers, 'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8' } })
}

function excelStream(filters: FilterOptions, metadata: { generatedAt: string; budgetVersion: { slug: string }; [key: string]: unknown }, signal: AbortSignal) {
  const output = new PassThrough({ highWaterMark: 64 * 1024 })
  const stop = () => output.destroy(new Error('Export cancelled'))
  signal.addEventListener('abort', stop, { once: true })
  output.once('close', () => signal.removeEventListener('abort', stop))
  const book = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: output, useStyles: false, useSharedStrings: false })
  // ExcelJS has no public cancellation method; its Node streaming writer owns
  // an Archiver instance. Abort it as well as the HTTP stream on disconnect.
  const archive = (book as unknown as { zip: { abort(): void; destroy(): void; on(event: 'error', listener: (error: Error) => void): void } }).zip
  const abortArchive = () => { archive.abort(); archive.destroy() }
  archive.on('error', error => output.destroy(error))
  output.once('close', () => { if (!output.writableFinished) abortArchive() })
  // Excel's file-format row ceiling is handled by adding sheets, never dropping rows.
  const table = (name: string, headings: string[]) => {
    let part = 1
    let count = 1
    let sheet = book.addWorksheet(name)
    sheet.addRow(headings).commit()
    return {
      row(values: unknown[]) {
        if (count === 1_048_576) {
          sheet.commit(); sheet = book.addWorksheet(`${name} ${++part}`); sheet.addRow(headings).commit(); count = 1
        }
        sheet.addRow(values).commit(); count++
      }, close() { sheet.commit() },
    }
  }
  const about = table('About this export', ['Field', 'Value'])
  for (const [key, value] of Object.entries(metadata)) about.row([key, typeof value === 'object' ? JSON.stringify(value) : value])
  about.row(['Matching fields', 'Document summary counts follow filters; Budget citations includes all citations for each document in the selected cycle.'])
  about.row(['Version relationships', 'One row per selected document in a series. The series anchor groups members within this export; superseded_by is a registry annotation, not legal status. Full member lists are available in detailed JSON.'])
  about.row(['Dates', 'Year is the recorded publication/adoption year; exact adoption dates are not available for every record.'])
  about.close()
  const run = async () => {
    try {
      const check = async () => {
        if (output.destroyed || signal.aborted) throw new Error('Export cancelled')
        await new Promise<void>(resolve => setImmediate(resolve))
        if (output.writableNeedDrain) await once(output, 'drain')
      }
      // Write sheets sequentially: ZIP entries are ordered. Interleaving sheets
      // would buffer later entries behind the unfinished first sheet.
      const documents = table('Documents', columns)
      for await (const batch of publicExportBatches(filters, metadata.budgetVersion.slug, false, signal)) {
        await check()
        for (const document of batch) documents.row(documentValues(document))
      }
      documents.close()
      const citations = table('Budget citations', ['Symbol', 'Budget cycle', 'Source budget document', 'Entity', 'Entity name', 'Part', 'Section', 'Section title', 'Programme', 'Programme title', 'Subprogramme', 'Component', 'Part in document'])
      for await (const batch of publicExportBatches(filters, metadata.budgetVersion.slug, false, signal)) {
        await check()
        const citationMap = await getMandateCitationsMany(batch.map(document => document.symbol), metadata.budgetVersion.slug, { includeTotals: false })
        for (const document of batch) for (const row of citationMap.get(document.symbol)?.citations ?? []) citations.row([document.symbol, metadata.budgetVersion.slug, row.origin_document, row.entity, row.entity_long, row.budget_part, row.section, row.section_title, row.programme, row.programme_title, row['sub-programme'], row.component, row.part_in_document])
      }
      citations.close()
      const versions = table('Version relationships', ['Symbol', 'Series anchor symbol (this export)', 'Series size', 'First year', 'Last year', 'Collection (not ordered versions)', 'Latest in series', 'Has newer', 'Superseded by'])
      for await (const batch of publicExportBatches(filters, metadata.budgetVersion.slug, false, signal)) {
        await check()
        const seriesMap = await getResolutionSeriesMany(batch.map(document => document.symbol), { includeMetrics: false })
        for (const document of batch) {
          const series = seriesMap.get(document.symbol)
          if (series) versions.row([document.symbol, series.members.at(-1)?.document_symbol ?? null, series.series_count, series.first_year, series.last_year, series.is_collection, series.is_latest, series.has_newer, series.superseded_by])
        }
      }
      versions.close()
      await check()
      await book.commit()
    } catch (error) { abortArchive(); output.destroy(error instanceof Error ? error : new Error('Export failed')) }
  }
  void run()
  return Readable.toWeb(output) as ReadableStream<Uint8Array>
}
