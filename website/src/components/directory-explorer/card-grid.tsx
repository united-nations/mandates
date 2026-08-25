'use client'

import type {
  ExploreCardState,
  ExploreCardStates,
} from '@/lib/explore-card-state'

import { ExploreButton } from './explore-button'
import type { CardGridProps } from './types'

const stateLine = (state: ExploreCardState, states: ExploreCardStates) =>
  state.condition === 'selected' && state.selection
    ? {
        kind: 'selected' as const,
        name: state.selection.name,
        title:
          state.selection.fullName !== state.selection.name
            ? state.selection.fullName
            : undefined,
      }
    : state.condition === 'scoped' &&
        states.scopeCause !== null &&
        states.spokenScopeCause !== null
      ? {
          kind: 'scoped' as const,
          cause: states.scopeCause,
          spokenCause: states.spokenScopeCause,
        }
      : undefined

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
        ? 'issuing the documents shown'
        : undefined,
    onClick: () => openPanel('organs'),
  }
}

const documentProps = ({ cardStates, openPanel }: CardGridProps) => {
  const card = cardStates.documents
  const quietLine = {
    registryPredicate: 'listed in the registry',
    filtersPredicate: 'matching your filters',
    registryDenominator: `of the ${card.baselineValue.toLocaleString()} in the registry`,
    otherFiltersDenominator: `of the ${card.baselineValue.toLocaleString()} matching your other filters`,
  }[card.frame]
  return {
    stateLine: stateLine(card, cardStates),
    count: card.value,
    countUnit: card.value === 1 ? 'document' : 'documents',
    quietLine,
    onClick: () => openPanel('catalogue'),
  }
}

const citedCountLine = (card: ExploreCardStates['cited']) => {
  if (card.countForm === 'empty') return { prefix: 'none', unit: 'of them' }
  if (card.countForm === 'collapsed')
    return { count: card.value, prefix: 'all', unit: 'of them' }
  return {
    count: card.value,
    unit:
      card.condition === 'scoped'
        ? `of the ${card.shownDocumentsValue.toLocaleString()} shown`
        : 'of them',
  }
}

const citedProps = ({ cardStates, cycleYear, openPanel }: CardGridProps) => {
  const card = cardStates.cited
  const countLine = citedCountLine(card)
  return {
    stateLine: stateLine(card, cardStates),
    count: countLine.count,
    countPrefix: countLine.prefix,
    countUnit: countLine.unit,
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
    ? `citing these documents in their ${props.cycleYear} budgets`
    : 'citing these documents in their budgets'
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

const reservesStateLine = (states: ExploreCardStates) =>
  [states.organs, states.documents, states.cited, states.entities].some(
    (card) => stateLine(card, states) !== undefined
  )

/** Renders the four immediately available summary cards. */
export const CardGrid = (props: CardGridProps) => {
  const reserveStateLine = reservesStateLine(props.cardStates)
  const cards = [
    ['organs', organProps(props)],
    ['documents', documentProps(props)],
    ['cited', citedProps(props)],
    ['entities', entityProps(props)],
  ] as const
  return (
    <>
      {cards.map(([key, card]) => (
        <ExploreButton
          key={key}
          reserveStateLine={reserveStateLine}
          {...card}
        />
      ))}
    </>
  )
}
