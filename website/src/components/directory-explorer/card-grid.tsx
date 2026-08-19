'use client'

import type {
  ExploreCardState,
  ExploreCardStates,
} from '@/lib/explore-card-state'

import { ExploreButton } from './explore-button'
import type { ExploreCardStateLine } from './explore-button'
import type { CardGridProps } from './types'

const selectedLine = (
  state: ExploreCardState
): ExploreCardStateLine | undefined => {
  if (state.condition !== 'selected' || !state.selection) return undefined
  const { name, fullName } = state.selection
  return {
    kind: 'selected',
    name,
    title: fullName !== name ? fullName : undefined,
  }
}

const scopedLine = (
  states: ExploreCardStates
): ExploreCardStateLine | undefined => {
  if (states.scopeCause === null || states.spokenScopeCause === null)
    return undefined
  return {
    kind: 'scoped',
    cause: states.scopeCause,
    spokenCause: states.spokenScopeCause,
  }
}

const stateLine = (state: ExploreCardState, states: ExploreCardStates) =>
  selectedLine(state) ??
  (state.condition === 'scoped' ? scopedLine(states) : undefined)

const organProps = ({ cardStates, openPanel }: CardGridProps) => {
  const card = cardStates.organs
  const countUnit =
    card.condition === 'full'
      ? card.value === 1
        ? 'source'
        : 'sources'
      : `of ${card.baselineValue.toLocaleString()} mandate sources`
  return {
    stateLine: stateLine(card, cardStates),
    count: card.value,
    countUnit,
    quietLine:
      card.condition === 'full'
        ? 'recorded as issuing the documents shown'
        : undefined,
    onClick: () => openPanel('organs'),
  }
}

const documentProps = ({ cardStates, openPanel }: CardGridProps) => {
  const card = cardStates.documents
  return {
    stateLine: stateLine(card, cardStates),
    count: card.value,
    countUnit: card.value === 1 ? 'document' : 'documents',
    quietLine:
      card.condition === 'scoped'
        ? `of the ${card.baselineValue.toLocaleString()} in the registry`
        : 'listed in the registry',
    onClick: () => openPanel('catalogue'),
  }
}

const citedProps = ({ cardStates, cycleYear, openPanel }: CardGridProps) => {
  const card = cardStates.cited
  const countUnit = card.citedMatchesShown
    ? 'of them'
    : card.condition === 'scoped'
      ? `of the ${card.shownDocumentsValue.toLocaleString()} shown`
      : 'of them'
  return {
    stateLine: stateLine(card, cardStates),
    count: card.value,
    countPrefix: card.citedMatchesShown ? 'all' : undefined,
    countUnit,
    quietLine: cycleYear
      ? `cited in the ${cycleYear} budget cycle`
      : 'cited in the budget cycle',
    onClick: () => openPanel('cited'),
  }
}

const entityQuietLine = (props: CardGridProps): string => {
  const card = props.cardStates.entities
  if (card.condition === 'selected')
    return `among ${card.value.toLocaleString()} ${card.value === 1 ? 'entity' : 'entities'} citing these documents`
  if (card.condition === 'scoped')
    return `of ${card.baselineValue.toLocaleString()}`
  return props.cycleYear
    ? `citing them in their ${props.cycleYear} budget submissions`
    : 'citing them in their budget submissions'
}

const entityProps = (props: CardGridProps) => {
  const card = props.cardStates.entities
  const selected = card.condition === 'selected'
  return {
    stateLine: stateLine(card, props.cardStates),
    count: selected ? undefined : card.value,
    countUnit: selected ? undefined : card.value === 1 ? 'entity' : 'entities',
    quietLine: entityQuietLine(props),
    onClick: () => props.openPanel('entities'),
  }
}

/** Renders the four immediately available summary cards. */
export const CardGrid = (props: CardGridProps) => (
  <>
    <ExploreButton {...organProps(props)} />
    <ExploreButton {...documentProps(props)} />
    <ExploreButton {...citedProps(props)} />
    <ExploreButton {...entityProps(props)} />
  </>
)
