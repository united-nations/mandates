import { ExpandableCard } from '@/components/ExpandableCard'
import { GaContestedTopics } from '@/components/GaContestedTopics'
import { GaVotingBySession } from '@/components/GaVotingBySession'
import { LanguageStrengthGradient } from '@/components/LanguageStrengthGradient'
import { LanguageStrengthTrend } from '@/components/LanguageStrengthTrend'
import {
  LanguageStrengthDemands,
  LanguageStrengthVerbs,
} from '@/components/LanguageStrengthVerbs'
import { MandateHeartbeat } from '@/components/MandateHeartbeat'
import { OrganEntityHeatmap } from '@/components/OrganEntityHeatmap'
import { SectionOrgansDirectory } from '@/components/sections/SectionDirectories'
import {
  ChartHeading,
  ChartNote,
  SecretariatSection,
  SectionExpanders,
} from '@/components/sections/SecretariatSection'
import { VotingIdealPointTrends } from '@/components/VotingIdealPointTrends'
import { VotingLoneliestVoters } from '@/components/VotingLoneliestVoters'
import { VotingSimilarityMatrix } from '@/components/VotingSimilarityMatrix'
import { getVotingAnalysis } from '@/lib/data/country-votes'
import { getLanguageStrength } from '@/lib/data/language-strength'
import { getOrganEntityMatrix } from '@/lib/data/mandates'
import { getGaTopicVoteLeague, getGaVotingBySession } from '@/lib/data/votes'
import { getScRenewalData } from '@/lib/sc-renewals'
import type { OrganGroup } from '@/types'

interface OrgansSectionProps {
  /** From getExploreCardData, so the directory and its card agree. */
  groups: OrganGroup[]
  ppbVersion?: string
}

/**
 * Section 03 — who issues the mandates. This is the heaviest section, because
 * four of the seven lenses are about the issuing organ rather than the
 * implementing entity: how firmly it words its orders, how united it is when it
 * adopts them, which blocs form in its votes, and how short a leash it puts on
 * the mandates it renews.
 */
export async function OrgansSection({
  groups,
  ppbVersion,
}: OrgansSectionProps) {
  // getLanguageStrength reads digitallibrary.document_paragraphs. Everything
  // else in this section is static JSON or already cached, so a database
  // hiccup should cost one expander, not the whole page.
  const [organEntityMatrix, gaVotingBySession, gaTopicVoteLeague] =
    await Promise.all([
      getOrganEntityMatrix(ppbVersion),
      getGaVotingBySession(),
      getGaTopicVoteLeague(),
    ])

  let languageStrength: Awaited<ReturnType<typeof getLanguageStrength>> | null =
    null
  try {
    languageStrength = await getLanguageStrength()
  } catch {
    languageStrength = null
  }

  const votingAnalysis = getVotingAnalysis()

  return (
    <SecretariatSection
      id="organs"
      imageSrc="/images/banners/hero-banner-homepage.png"
      title="Which organs are creating the mandates?"
      description="The intergovernmental organs and bodies that adopt Secretariat mandates. Select one to filter the mandates above."
    >
      <SectionOrgansDirectory groups={groups} />
      <SectionExpanders>
        <ExpandableCard
          id="organ-entity"
          title="Citation patterns between entities and organs"
          variant="filled"
        >
          <OrganEntityHeatmap matrix={organEntityMatrix} />
        </ExpandableCard>

        {languageStrength && (
          <ExpandableCard
            id="language-of-command"
            title="The language of command"
            variant="filled"
          >
            <div className="space-y-10">
              <div>
                <ChartHeading>
                  The Assembly asks more and orders less; the Council went the
                  other way
                </ChartHeading>
                <LanguageStrengthTrend data={languageStrength.decades} />
              </div>
              <div>
                <ChartHeading>
                  The command gradient: the Secretary-General gets told, Member
                  States get asked
                </ChartHeading>
                <LanguageStrengthGradient data={languageStrength.gradient} />
              </div>
              <div>
                <ChartHeading>The verbs of the United Nations</ChartHeading>
                <LanguageStrengthVerbs verbs={languageStrength.verbs} />
              </div>
              <LanguageStrengthDemands data={languageStrength.scDemands} />
              <ChartNote>
                Source: parsed English texts of ~21,900 General Assembly,
                Security Council and Economic and Social Council resolutions and
                decisions in the UN Digital Library. Each operative paragraph is
                classified by the verb it opens with. &ldquo;Directive&rdquo;
                and &ldquo;requesting&rdquo; describe the strength of the
                wording only — they say nothing about legal force. Paragraphs
                opening with stocktaking verbs (<em>recalls</em>,{' '}
                <em>welcomes</em>, <em>notes</em>) are excluded.
              </ChartNote>
            </div>
          </ExpandableCard>
        )}

        <ExpandableCard
          id="renewals"
          title="Mandate renewals: how long a leash the Security Council grants"
          variant="filled"
        >
          <MandateHeartbeat data={getScRenewalData()} />
        </ExpandableCard>

        <ExpandableCard
          id="ga-consensus"
          title="Consensus and contestation in the General Assembly"
          variant="filled"
        >
          <div className="space-y-10">
            <div>
              <ChartHeading>How often does the Assembly vote?</ChartHeading>
              <GaVotingBySession data={gaVotingBySession} />
            </div>
            <div>
              <ChartHeading>Contested-topics league</ChartHeading>
              <GaContestedTopics league={gaTopicVoteLeague} />
            </div>
          </div>
        </ExpandableCard>

        <ExpandableCard
          id="geopolitics"
          title="Who votes with whom? Country blocs in Assembly voting"
          variant="filled"
        >
          <div className="space-y-10">
            <div>
              <ChartHeading>Voting agreement between countries</ChartHeading>
              <VotingSimilarityMatrix analysis={votingAnalysis} />
            </div>
            <div>
              <ChartHeading>
                Eighty years of geopolitical alignment
              </ChartHeading>
              <VotingIdealPointTrends analysis={votingAnalysis} />
            </div>
            <div>
              <ChartHeading>Loneliest voters</ChartHeading>
              <VotingLoneliestVoters analysis={votingAnalysis} />
            </div>
          </div>
        </ExpandableCard>
      </SectionExpanders>
    </SecretariatSection>
  )
}
