import { DetailSectionHeading } from '@/components/MandateDetailUi'
import { SgReportAnnexChip, SgReportList } from '@/components/SgReportList'
import { explainerTexts } from '@/lib/en_text_contents'
import { annexPositionNote, observedYearSpan } from '@/lib/sg-report-summary'
import type { SgReportProvenance, UnionSgReports } from '@/lib/sg-report-union'

/**
 * Secretary-General reports submitted under the mandate on view, from both
 * sources at once (lib/sg-report-union.ts): what each report states on its
 * first pages, and the Digital Library catalogue notes. Each row says which
 * source found it, on a quiet line under the title.
 *
 * Same shape as the single-source blocks: heading with the count and the
 * observed year span over the union, the annex note, then the shared report
 * list. The annex chip and note are the catalogue notes' claim, so both say
 * so; they appear on every row the catalogue notes mark, including rows page
 * one also found.
 *
 * With no accepted page-one run the catalogue-notes rows are listed, each
 * labelled, under a line saying the report-stated links are not yet
 * approved. With an accepted run and no row from either source, nothing
 * renders.
 */
export function MandateUnionSgReports({ data }: { data: UnionSgReports }) {
  const text = explainerTexts.mandateDetail.sgReportsUnion
  const { reports } = data

  if (data.pageOneAccepted && reports.length === 0) return null

  const n = reports.length
  const span = observedYearSpan(reports.map((r) => r.date_published))
  const annexCount = reports.filter((r) => r.catalogueAnnexOnly).length
  const annexNote = annexPositionNote(annexCount, n)

  const provenanceLabel: Record<SgReportProvenance, string> = {
    page_one: text.statedInReport,
    catalogue_notes: text.perCatalogueNotes,
    both: `${text.statedInReport} · ${text.perCatalogueNotes}`,
  }

  return (
    <section className="space-y-3">
      <DetailSectionHeading
        hint={
          n > 0
            ? `${n} report${n === 1 ? '' : 's'}${span ? ` · ${span.label}` : ''}`
            : undefined
        }
        disclaimer={text.disclaimer}
      >
        {text.title}
      </DetailSectionHeading>

      {!data.pageOneAccepted && (
        <p className="max-w-[44rem] text-sm text-muted-foreground">
          {text.notAccepted}
        </p>
      )}

      {annexNote && (
        <p className="max-w-[44rem] text-sm text-foreground">
          {text.annexNotePrefix} {annexNote}
        </p>
      )}

      {n > 0 && (
        <SgReportList
          rows={reports.map((report) => ({
            report_recid: report.report_recid,
            symbols: report.symbols,
            title: report.title,
            date_published: report.date_published,
            marker: report.catalogueAnnexOnly && (
              <SgReportAnnexChip title={text.annexChipTitle} />
            ),
            note: provenanceLabel[report.provenance],
          }))}
        />
      )}
    </section>
  )
}
