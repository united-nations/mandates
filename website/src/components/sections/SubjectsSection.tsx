import { CountryAttentionMap } from '@/components/CountryAttentionMap'
import { ExpandableCard } from '@/components/ExpandableCard'
import {
  ChartNote,
  SecretariatSection,
  SectionExpanders,
} from '@/components/sections/SecretariatSection'
import { SubjectsCompact } from '@/components/SubjectsCompact'
import { TopicTrends } from '@/components/TopicTrends'
import { getTopicTrends } from '@/lib/data/mandates'
import type { SubjectDomain } from '@/types'

interface SubjectsSectionProps {
  /** From getExploreCardData, so the directory and its card agree. */
  domains: SubjectDomain[]
}

/**
 * Section 04 — what the mandates are about: the subject thesaurus, how the
 * subject mix moved over time, and which countries the texts actually name.
 */
export async function SubjectsSection({ domains }: SubjectsSectionProps) {
  const topicTrends = await getTopicTrends()

  return (
    <SecretariatSection
      id="subjects"
      imageSrc="/images/banners/hero-banner-system-expenses.png"
      title="Which topics are the mandates about?"
      description="Every subject applied to a mandate document, grouped into broad thematic domains. Select a topic to filter the mandates above."
    >
      <SubjectsCompact domains={domains} />
      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-gray-500">
        Subjects are organised by the United Nations Bibliographic Information
        System (UNBIS) thesaurus: 18 top-level domains, each broken into
        sub-domains and individual subject headings. These are bibliographic
        labels that give hints about the topics of documents; they are not a
        normative taxonomy of the United Nations.
      </p>
      <SectionExpanders>
        <ExpandableCard id="topic-trends" title="Topic trends" variant="filled">
          <div className="space-y-4">
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
              How the mix of subjects applied to mandate documents has shifted
              over time. Select a subject to see its mandates in the table
              above.
            </p>
            <TopicTrends years={topicTrends} />
          </div>
        </ExpandableCard>

        <ExpandableCard
          id="attention-map"
          title="Which countries are the resolutions about?"
          variant="filled"
        >
          <div className="space-y-4">
            <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
              Resolutions name countries unevenly. Mapping every country subject
              applied to a mandate shows attention pooling around a small set of
              conflict and post-conflict states, while much of the world is
              rarely the direct object of a mandate at all.
            </p>
            <CountryAttentionMap />
            <ChartNote>
              Counts every country subject heading applied to a document in the
              registry. A country named as the subject of a mandate is not the
              same as a country the mandate is addressed to.
            </ChartNote>
          </div>
        </ExpandableCard>
      </SectionExpanders>
    </SecretariatSection>
  )
}
