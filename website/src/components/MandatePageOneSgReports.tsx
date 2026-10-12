import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { SgReportList } from '@/components/SgReportList'
import { explainerTexts } from '@/lib/en_text_contents'
import type { PageOneSgReports } from '@/lib/data/sg-report-page-one-links'
import { observedYearSpan } from '@/lib/sg-report-summary'

/**
 * Secretary-General reports that state, on their own first pages, that they
 * were submitted under the mandate on view (lib/data/sg-report-page-one-links.ts).
 *
 * Same shape as the catalogue-notes block (MandateSgReports): heading with
 * the count and observed year span, then the shared report list. It has no
 * annex note or summary tiles; the page-one source records neither.
 *
 * Two states besides the list:
 * - No accepted run: the block stays, with a line saying no links have been
 *   approved, so a reader does not take the absence of a list for "no
 *   reports". The read function also logs it on the server.
 * - An accepted run with no report for this page: nothing renders, as for
 *   the catalogue-notes block with no reports.
 */
export function MandatePageOneSgReports({ data }: { data: PageOneSgReports }) {
  const text = explainerTexts.mandateDetail.sgReportsPageOne

  if (data.acceptedRunId === null) {
    return (
      <section className="space-y-3">
        <DetailSectionHeading disclaimer={text.disclaimer}>
          {text.title}
        </DetailSectionHeading>
        <p className="max-w-[44rem] text-sm text-muted-foreground">
          {text.notAccepted}
        </p>
      </section>
    )
  }

  const { reports } = data
  if (reports.length === 0) return null

  const n = reports.length
  const span = observedYearSpan(reports.map((r) => r.date_published))

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={`${n} report${n === 1 ? '' : 's'}${span ? ` · ${span.label}` : ''}`}
        disclaimer={text.disclaimer}
      >
        {text.title}
      </DetailSectionHeading>

      <SgReportList
        rows={reports.map((report) => ({
          report_recid: report.report_recid,
          // Every symbol the record carries, each its own chip, in record
          // order. The catalogue-notes block shows one symbol per report, from
          // digitallibrary.documents.document_symbol, so for a report issued
          // to two organs it shows only the first.
          symbols: report.report_symbols,
          title: report.title,
          date_published: report.date_published,
        }))}
      />
    </section>
  )
}
