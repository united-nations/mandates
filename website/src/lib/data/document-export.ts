import { splitSubprogrammeLabel } from '../budget-labels'
import { publicSeries } from '../public-series'
import { createExportTable } from '../excel-export-style'
import { Readable, PassThrough } from 'node:stream'
import { once } from 'node:events'
import ExcelJS from 'exceljs'
import type { FilterOptions } from '@/types'
import { API_VERSION, COVERAGE_NOTES } from '../public-api'
import { csvRow, downloadName } from '../export-format'
import {
  publicExportBatches,
  resolvePublicVersion,
  type PublicDocument,
} from './public-documents'
import {
  getMandates,
  getExcelCitationBatches,
  getExcelVersionBatches,
} from './mandates'
import { SITE_URL } from '../seo'

const columns = [
  'Symbol',
  'Title',
  'Issuing body',
  'Year',
  'Document type',
  'Subjects',
  'Agenda item numbers',
  'Agenda item titles',
  'Matching programmes',
  'Foundational citing entities',
  'Matching entities',
  'Matching citation count',
  'Matching entity count',
  'Series size',
  'Latest in series',
  'Collection (related documents)',
  'Latest version',
  'Source URL',
  'Registry URL',
  'JSON URL',
]
const documentValues = (document: PublicDocument) => [
  document.symbol,
  document.title,
  document.issuingBody,
  document.year,
  document.documentType,
  document.subjects.join('; '),
  document.agendaItems.numbers.join('; '),
  document.agendaItems.titles.join('; '),
  document.matchingProgrammes.join('; '),
  document.matchingFoundationalEntities.join('; '),
  document.matchingEntities.join('; '),
  document.matchingCitationCount,
  document.matchingEntityCount,
  document.series?.series_count ?? null,
  document.series?.is_latest ?? null,
  document.series?.is_collection ?? null,
  document.series?.latest_version ?? null,
  document.sourceUrl,
  document.pageUrl,
  document.jsonUrl,
]

export async function documentExport(
  filters: FilterOptions,
  format: 'csv' | 'xlsx' | 'json',
  details: boolean,
  signal: AbortSignal
) {
  const version = await resolvePublicVersion(filters)
  const effectiveFilters = {
    ...filters,
    ppb_version: version.slug,
    group: undefined,
    page: undefined,
    limit: undefined,
  }
  const first = await getMandates(effectiveFilters, {
    limit: 1,
    batchOffset: 0,
    includeMetrics: false,
  })
  const generatedAt = new Date().toISOString()
  const metadata = {
    apiVersion: API_VERSION,
    generatedAt,
    totalDocuments: first.totalCount,
    filters: effectiveFilters,
    requestedGrouping: filters.group === '1',
    grouping: 'All matching documents; versions expanded',
    budgetVersion: version,
    coverage: COVERAGE_NOTES,
    details: details ? 'included' : 'not_included',
    source: SITE_URL,
    documentation: `${SITE_URL}/about#programmatic-access`,
    consistency:
      'Live data, read in batches; source updates during a download may affect results.',
  }
  const batches = () =>
    publicExportBatches(effectiveFilters, version.slug, details, signal, true)
  const headers = {
    'Content-Disposition': `attachment; filename="${downloadName(format, generatedAt)}"`,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Content-Disposition',
  }
  if (format === 'xlsx')
    return new Response(excelStream(effectiveFilters, metadata, signal), {
      headers: {
        ...headers,
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  async function* chunks() {
    if (format === 'csv') {
      yield '\uFEFF' + csvRow(columns)
      for await (const batch of batches())
        yield batch.map((document) => csvRow(documentValues(document))).join('')
      if (signal.aborted) throw new Error('Export cancelled')
    } else {
      yield `{\n  "metadata": ${JSON.stringify(metadata, null, 2).replace(/\n/g, '\n  ')},\n  "documents": [`
      let comma = ''
      let exportedCount = 0
      for await (const batch of batches()) {
        for (const document of batch) {
          yield comma +
            '\n' +
            JSON.stringify(document, null, 2)
              .split('\n')
              .map((line) => `    ${line}`)
              .join('\n')
          comma = ','
          exportedCount++
        }
      }
      if (signal.aborted) throw new Error('Export cancelled')
      yield `\n  ],\n  "exportedDocuments": ${exportedCount}\n}\n`
    }
  }
  return new Response(
    Readable.toWeb(Readable.from(chunks())) as ReadableStream<Uint8Array>,
    {
      headers: {
        ...headers,
        'Content-Type':
          format === 'csv'
            ? 'text/csv; charset=utf-8'
            : 'application/json; charset=utf-8',
      },
    }
  )
}

function excelStream(
  filters: FilterOptions,
  metadata: {
    generatedAt: string
    budgetVersion: { slug: string; display_name: string }
    [key: string]: unknown
  },
  signal: AbortSignal
) {
  const output = new PassThrough({ highWaterMark: 64 * 1024 })
  const stop = () => output.destroy(new Error('Export cancelled'))
  signal.addEventListener('abort', stop, { once: true })
  output.once('close', () => signal.removeEventListener('abort', stop))
  const book = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: output,
    useStyles: true,
    useSharedStrings: false,
  })
  book.creator = 'United Nations — Mandate Registry'
  book.created = new Date(metadata.generatedAt)
  // ExcelJS has no public cancellation method; its Node streaming writer owns
  // an Archiver instance. Abort it as well as the HTTP stream on disconnect.
  const archive = (
    book as unknown as {
      zip: {
        abort(): void
        destroy(): void
        on(event: 'error', listener: (error: Error) => void): void
      }
    }
  ).zip
  const abortArchive = () => {
    archive.abort()
    archive.destroy()
  }
  archive.on('error', (error) => output.destroy(error))
  output.once('close', () => {
    if (!output.writableFinished) abortArchive()
  })
  const table = (name: string, headings: string[]) =>
    createExportTable(book, name, headings)
  const about = table('About this export', ['Field', 'Value'])
  about.row(['Source', 'UN Mandate Registry'])
  about.row(['Generated (UTC)', metadata.generatedAt])
  about.row(['Budget cycle', metadata.budgetVersion.display_name])
  about.row(['Budget cycle identifier', metadata.budgetVersion.slug])
  about.row(['Matching documents', metadata.totalDocuments])
  about.row(['Version grouping', metadata.grouping])
  about.row([
    'Website had versions grouped',
    metadata.requestedGrouping ? 'Yes' : 'No',
  ])
  const selectedFilters = metadata.filters as FilterOptions
  for (const [key, value] of Object.entries(selectedFilters)) {
    if (value !== undefined && key !== 'ppb_version')
      about.row([`Filter: ${key.replace(/_/g, ' ')}`, String(value)])
  }
  for (const note of COVERAGE_NOTES) about.row(['Coverage', note])
  about.row(['Data consistency', metadata.consistency])
  about.row(['Registry', SITE_URL])
  about.row(['API documentation', metadata.documentation])
  about.row([
    'Worksheet continuation',
    'All matching records and URLs are retained. Beyond Excel’s clickable-link limit, URLs remain as text on the same sheet. Tables continue on numbered sheets only at Excel’s row limit.',
  ])
  about.row([
    'Matching fields',
    'Document summary counts follow filters; Budget citations includes all citations for each document in the selected cycle.',
  ])
  about.row([
    'Version relationships',
    'One row per selected document in a series. The series anchor groups members within this export; Latest version is a registry annotation, not legal status. Full member lists are available in detailed JSON.',
  ])
  about.row([
    'Dates',
    'Year is the recorded publication/adoption year; exact adoption dates are not available for every record.',
  ])
  about.close()
  const run = async () => {
    try {
      const check = async () => {
        if (output.destroyed || signal.aborted)
          throw new Error('Export cancelled')
        await new Promise<void>((resolve) => setImmediate(resolve))
        if (output.writableNeedDrain) await once(output, 'drain')
      }
      // Write sheets sequentially: ZIP entries are ordered. Interleaving sheets
      // would buffer later entries behind the unfinished first sheet.
      const documents = table('Documents', columns)
      for await (const batch of publicExportBatches(
        filters,
        metadata.budgetVersion.slug,
        false,
        signal,
        true
      )) {
        await check()
        for (const document of batch) documents.row(documentValues(document))
      }
      documents.close()
      const citationHeadings = [
        'Symbol',
        'Budget cycle',
        'Source budget document',
        'Entity',
        'Entity name',
        'Part',
        'Part title',
        'Section',
        'Section title',
        'Programme',
        'Programme title',
        'Subprogramme',
        'Subprogramme title',
      ]
      let citations: ReturnType<typeof table> | undefined
      let includeComponents = false
      for await (const batch of getExcelCitationBatches(filters, signal)) {
        await check()
        if (!citations) {
          includeComponents = batch[0]?.has_components ?? false
          citations = table('Budget citations', [
            ...citationHeadings,
            ...(includeComponents ? ['Component'] : []),
            'Part in document',
          ])
        }
        for (const row of batch)
          citations.row([
            row.symbol,
            metadata.budgetVersion.slug,
            row.origin_document || '',
            row.entity || '',
            row.entity_long || row.entity || '',
            row.budget_part_number || '',
            row.part_title || row.budget_part || '',
            row.section || '',
            row.section_title || '',
            row.programme,
            row.programme_title || '',
            splitSubprogrammeLabel(row.sub_programme, row.sub_programme_number)
              .number,
            splitSubprogrammeLabel(row.sub_programme, row.sub_programme_number)
              .title,
            ...(includeComponents ? [row.component || null] : []),
            row.part_in_document || '',
          ])
      }
      ;(
        citations ??
        table('Budget citations', [...citationHeadings, 'Part in document'])
      ).close()
      const versions = table('Version relationships', [
        'Symbol',
        'Series anchor symbol (this export)',
        'Series size',
        'First year',
        'Last year',
        'Collection (not ordered versions)',
        'Latest in series',
        'Latest version',
      ])
      for await (const batch of getExcelVersionBatches(filters, signal)) {
        await check()
        for (const row of batch)
          versions.row([
            row.symbol,
            row.anchor,
            row.series_count,
            row.first_year || null,
            row.last_year || null,
            row.is_collection,
            row.is_latest,
            publicSeries(row, row.symbol)?.latest_version,
          ])
      }
      versions.close()
      await check()
      await book.commit()
    } catch (error) {
      abortArchive()
      output.destroy(
        error instanceof Error ? error : new Error('Export failed')
      )
    }
  }
  void run()
  return Readable.toWeb(output) as ReadableStream<Uint8Array>
}
