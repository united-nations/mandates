import { Grid3x3 } from 'lucide-react'
import { CitationMatrixView } from '@/components/CitationMatrixView'
import { getCitationMatrix } from '@/lib/data/citation-matrix'

export const metadata = {
  title: 'Citation Matrix — UN Mandate Source Registry',
  description:
    'Cross-citation matrix showing how often pairs of Secretariat entities are co-cited across UN mandate documents.',
}

export default async function CitationMatrixPage() {
  const data = await getCitationMatrix()

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Grid3x3 className="h-8 w-8 text-un-blue" />
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Citation Matrix
        </h1>
      </div>
      <div className="mb-6 max-w-195 space-y-4 text-left text-muted-foreground sm:text-justify">
        <p className="leading-relaxed">
          Each cell shows the number of source documents that are cited by both
          the row entity and the column entity in the Secretariat&apos;s
          Programme Budget. Cell intensity scales with the count; the diagonal
          is each entity&apos;s own citation total. Switch between the 2026
          budget, the 2027 budget, and the difference between them.
        </p>
        <p className="leading-relaxed">
          Entities are grouped by pillar (Development, Human Rights, Peace and
          security, Humanitarian, Legal, Effective functioning), mirroring the
          figure on p. 11 of the{' '}
          <a
            href="https://www.un.org/un80-initiative/sites/default/files/2025-09/2512998E_MIR_web.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-un-blue underline hover:text-shuttle-gray"
          >
            UN80 initiative report
          </a>
          .
        </p>
      </div>

      <CitationMatrixView data={data} />

      <hr className="my-8 border-muted" />
      <div className="max-w-195 text-left">
        <p className="text-sm leading-relaxed text-muted-foreground italic sm:text-justify">
          Groupings are derived from the pillar and budget-part classification
          recorded in the Programme Budget. UNODC, which the UN80 report places
          under Peace &amp; security, is classified under Development in the
          budget data and appears there here. Field missions, panels of
          experts, and special envoys are omitted to keep the matrix readable.
          The 2027 view is sparser than 2026 because the Proposed Programme
          Budget for 2027 is not yet complete in the source dataset.
        </p>
      </div>
    </div>
  )
}
