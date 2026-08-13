import { CitationMatrixView } from '@/components/CitationMatrixView'
import { CoCitationHeatmap } from '@/components/CoCitationHeatmap'
import { ExpandableCard } from '@/components/ExpandableCard'
import { SectionEntitiesDirectory } from '@/components/sections/SectionDirectories'
import {
  ChartNote,
  SecretariatSection,
  SectionExpanders,
} from '@/components/sections/SecretariatSection'
import { getCitationMatrix } from '@/lib/data/citation-matrix'
import { getEntityCoCitationMatrix } from '@/lib/data/mandates'
import type { BudgetStream } from '@/types'

interface EntitiesSectionProps {
  /** From getExploreCardData, so the directory and its card agree. */
  streams: BudgetStream[]
  ppbVersion?: string
}

/** Section 02 — who implements the mandates, and who shares them. */
export async function EntitiesSection({
  streams,
  ppbVersion,
}: EntitiesSectionProps) {
  // The pillar matrix reads its own two budget versions, so it does not take
  // ppbVersion: its whole point is the comparison between them.
  const [coCitationMatrix, citationMatrix] = await Promise.all([
    getEntityCoCitationMatrix(ppbVersion),
    getCitationMatrix(),
  ])

  return (
    <SecretariatSection
      id="entities"
      imageSrc="/images/banners/hero-banner-secretariat-expenses.png"
      title="Which entities are implementing the mandates?"
      description="Every budget-holding entity, grouped by the United Nations programme budget structure. Select one to filter the mandates above."
    >
      <SectionEntitiesDirectory streams={streams} />
      <SectionExpanders>
        <ExpandableCard
          id="co-citations"
          title="Co-citations between entities"
          variant="filled"
        >
          <div className="space-y-4">
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
              Which entities cite the same mandate sources — a proxy for shared
              mandates and overlapping work. Select a cell to see the shared
              documents in the table above.
            </p>
            <CoCitationHeatmap matrix={coCitationMatrix} />
          </div>
        </ExpandableCard>

        {/* Same question as the expander above, asked the way the UN80 report
            asks it. Kept separate rather than merged, because the two differ in
            what they are for: the heatmap above is interactive and follows the
            page's filters, this one reproduces a published figure and compares
            the two budget versions. */}
        <ExpandableCard
          id="citation-matrix"
          title="The UN80 cross-citation matrix, 2026 against 2027"
          variant="filled"
        >
          <div className="space-y-4">
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
              Each cell counts the source documents cited by both the row entity
              and the column entity; the diagonal is the entity&apos;s own
              total. Entities are grouped by pillar — Development, Human rights,
              Peace and security, Humanitarian, Legal, Effective functioning —
              which reproduces the figure on p. 11 of the UN80 initiative
              report. Switch to the difference view to see what the 2027 budget
              changed.
            </p>
            <CitationMatrixView data={citationMatrix} />
            <ChartNote>
              Source:{' '}
              <a
                href="https://www.un.org/un80-initiative/sites/default/files/2025-09/2512998E_MIR_web.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-un-blue underline"
              >
                UN80 initiative report
              </a>
              , p. 11, rebuilt from the citation data in this registry. Rows
              whose pillar is missing in the source data are grouped by budget
              part instead.
            </ChartNote>
          </div>
        </ExpandableCard>
      </SectionExpanders>
    </SecretariatSection>
  )
}
