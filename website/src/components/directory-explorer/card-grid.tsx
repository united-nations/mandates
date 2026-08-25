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

// The narrowed count unit absorbs the denominator ("of 23 mandate sources")
// because this line used to render only in the full state: a narrowed card
// swapped its predicate for a denominator in its own unit, and the two never
// rendered together. That is no longer the rule. The predicate is true of the
// value in every state, and a bare "4 of 23 mandate sources" does not say what
// the 4 is, so the line does more work under a filter than on the landing
// view. The narrowed unit keeps its fuller noun, which now sits beside the
// line rather than standing in for it.
//
// Matt note: the quiet line renders in every state, not only when full. The
// trailing participle can be read as attaching to the baseline ("23 mandate
// sources issuing the documents shown"), which is false under a filter.
// Overruled on two grounds: the other three cards all attach their quiet line
// to the value rather than the baseline, so a reader arrives here trained on
// that pattern; and card 1's value genuinely is the bodies issuing the
// documents shown in every state, including entity selections that narrow it
// without selecting an organ. The ambiguity is live but is resolved the right
// way by convention and by the line break. Revisit if a reader reports
// otherwise.
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
    quietLine: 'issuing the documents shown',
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
