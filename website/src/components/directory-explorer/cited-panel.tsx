'use client'

import { BudgetStreamTree } from '@/components/table/BudgetStreamTree'
import type { FilterOptions } from '@/types'

import { HeadingProgress, PanelHeading, ScopeButton } from './controls'
import { PanelStatus } from './panel-status'
import type {
  DirectoryData,
  PanelActions,
  PanelChoice,
  PanelProgress,
} from './types'

interface CitedPanelProps {
  actions: PanelActions
  activeVersionSlug: string
  allDocumentsCount: number
  choice: PanelChoice
  citedDocumentCount: number
  citedPredicate: string
  data: DirectoryData | null
  filters: FilterOptions
  progress: PanelProgress
  versions: { slug: string; ppb_year: number; display_name: string }[]
}

const versionLabel = (year: number) => `UN Programme Budget ${year}`

/**
 * A selection is being caught up and there is already an answer on screen to
 * catch up FROM - as opposed to a first open, which is a load and gets the
 * skeleton. Only the budget version can put the panel in this state: scope
 * changes neither the counts beside it nor the hierarchy below (see
 * directoryScopeKey), and picking a budget location closes the dialog.
 */
const isChanging = (props: CitedPanelProps) =>
  props.progress.pending && !props.progress.empty

/**
 * The version is the lens every figure in this panel is read through, so
 * switching it is the one control here that changes what the other two blocks
 * say. The wait is long enough - around three seconds - that the switch needs
 * to announce itself rather than be inferred from numbers that have not moved
 * yet, hence the spinner naming the budget being read. It sits on the heading's
 * own line, which costs no height and so cannot move the dialog.
 */
const VersionChoices = (props: CitedPanelProps) => {
  const requested = props.versions.find(
    (version) => version.slug === props.choice.version
  )
  return (
    <section className="space-y-3">
      <PanelHeading
        aside={
          isChanging(props) && requested ? (
            <HeadingProgress
              label={`Loading ${versionLabel(requested.ppb_year)}`}
            />
          ) : undefined
        }
      >
        Budget version
      </PanelHeading>
      <div className="flex flex-wrap gap-2">
        {props.versions.map((version) => (
          <ScopeButton
            key={version.slug}
            label={versionLabel(version.ppb_year)}
            detail={version.display_name}
            selected={props.choice.version === version.slug}
            onClick={() => props.actions.setVersion(version.slug)}
          />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        The whole document catalogue stays in the table either way. The budget
        you pick here supplies the citation counts, the citing entities and the
        budget locations shown against each document.
      </p>
    </section>
  )
}

/**
 * Both counts are the selected budget's, so a version switch leaves them
 * standing for a moment as the previous budget's answer. They are dimmed until
 * the page they came from is the one now selected; the labels are not, because
 * they are the controls the reader is aiming at.
 */
const ScopeChoices = (props: CitedPanelProps) => (
  <section className="space-y-3">
    <PanelHeading>Scope</PanelHeading>
    <div className="flex flex-wrap gap-2">
      <ScopeButton
        label="All documents"
        detail={`${props.allDocumentsCount.toLocaleString()} documents`}
        detailPending={isChanging(props)}
        selected={!props.choice.cited}
        onClick={() => props.actions.setCited(false)}
      />
      <ScopeButton
        label="Cited only"
        detail={`${props.citedDocumentCount.toLocaleString()} documents ${props.citedPredicate}`}
        detailPending={isChanging(props)}
        selected={props.choice.cited}
        onClick={() => props.actions.setCited(true)}
      />
    </div>
  </section>
)

/**
 * The prose names `activeVersionSlug`, not the requested one: it describes the
 * counts beside it, and those are still the budget that was loaded.
 */
const BudgetLocations = (props: CitedPanelProps) => (
  <section className="space-y-3">
    <PanelHeading>Budget location</PanelHeading>
    <PanelStatus {...props.progress}>
      {props.data?.budgetStreams?.length ? (
        <BudgetStreamTree
          hierarchy={props.data.budgetStreams}
          active={{
            stream: props.filters.budget_document,
            part: props.filters.budget_part,
            section: props.filters.section,
            entity: props.filters.entity,
            subprogramme: props.filters.subprogramme,
          }}
          onSelect={props.actions.selectBudgetLocation}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No budget locations for the current filters.
        </p>
      )}
    </PanelStatus>
    <p className="text-sm text-muted-foreground">
      Counts are documents cited at that point of{' '}
      {props.versions.find((item) => item.slug === props.activeVersionSlug)
        ?.display_name ?? 'the budget'}
      . Picking one narrows the table to those documents.
    </p>
  </section>
)

/** Renders cited scope controls immediately and lazy budget locations below. */
export const CitedPanel = (props: CitedPanelProps) => (
  <div className="space-y-6">
    <VersionChoices {...props} />
    <ScopeChoices {...props} />
    <BudgetLocations {...props} />
  </div>
)
