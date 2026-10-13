import { MandatePageOneSgReports } from '@/components/MandatePageOneSgReports'
import { MandateSgReports } from '@/components/MandateSgReports'
import { MandateUnionSgReports } from '@/components/MandateUnionSgReports'
import type { MandatedSgReports } from '@/lib/data/mandated-sg-reports'

/** The block for whichever source getMandatedSgReports read. */
export function MandatedSgReportsBlock({
  block,
}: {
  block: MandatedSgReports
}) {
  switch (block.source) {
    case 'catalogue_notes':
      return <MandateSgReports reports={block.reports} />
    case 'page_one':
      return <MandatePageOneSgReports data={block.data} />
    case 'union':
      return <MandateUnionSgReports data={block.data} />
  }
}
