import { CoCitationHeatmap } from '@/components/CoCitationHeatmap'
import { ExpandableCard } from '@/components/ExpandableCard'
import { SectionEntitiesDirectory } from '@/components/sections/SectionDirectories'
import {
  SecretariatSection,
  SectionExpanders,
} from '@/components/sections/SecretariatSection'
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
  const coCitationMatrix = await getEntityCoCitationMatrix(ppbVersion)

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
      </SectionExpanders>
    </SecretariatSection>
  )
}
