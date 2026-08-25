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
      : `of ${card.baselineValue.toLocaleString()} mandate ${card.baselineValue === 1 ? 'source' : 'sources'}`
  return {
    stateLine: stateLine(card, cardStates),
    count: card.value,
    countUnit,
    quietLine: `${card.value === 1 ? 'issues' : 'issue'} the documents shown`,
    onClick: () => openPanel('organs'),
  }
}

// Card 2's count line is not a partitive, so the finite verb closes no
// ambiguity here; it is taken so that all four cards read the same way. It does
// add an agreement point that did not exist, because the count can be 1.
//
// Both predicate frames take it. filtersPredicate is the same reduced relative
// as registryPredicate over the same head, so leaving it a participle would put
// the inconsistency inside one card rather than between two.
//
// The two denominator frames are left alone, and the card is finite in one
// frame and verbless in the other as a result. Neither is a predicate of the
// count: "of the 42,944 in the registry" is a bare prepositional phrase, and
// the participle in otherFiltersDenominator modifies the figure it stands
// beside rather than the head, so there is no attachment for a finite verb to
// close. A verb could be introduced by naming what the figure is, which is what
// card 3 does with "shown" in "1,180 of the 27,942 shown" - the vocabulary is
// already on the page. Left open deliberately; the wording has not been chosen.
const documentProps = ({ cardStates, openPanel }: CardGridProps) => {
  const card = cardStates.documents
  const singular = card.value === 1
  const quietLine = {
    registryPredicate: `${singular ? 'is' : 'are'} listed in the registry`,
    filtersPredicate: `${singular ? 'matches' : 'match'} your filters`,
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

// The verb agrees with the count line's head, which is not the same figure in
// every form. In the fraction form the head is the card's own value, so a lone
// cited document reads "1 of the 5 shown is cited". The empty and collapsed
// forms lead with "none" and "all", which take a plural verb whatever follows
// them.
//
// "None of them are cited" rather than "is cited". English settles neither, and
// every other form on this card is plural, so a lone singular in the empty
// state would read as a different sentence rather than as the same sentence
// about nothing.
const citedVerb = (card: ExploreCardStates['cited']) =>
  card.countForm === 'fraction' && card.value === 1 ? 'is' : 'are'

const citedProps = ({ cardStates, cycleYear, openPanel }: CardGridProps) => {
  const card = cardStates.cited
  const countLine = citedCountLine(card)
  return {
    stateLine: stateLine(card, cardStates),
    count: countLine.count,
    countPrefix: countLine.prefix,
    countUnit: countLine.unit,
    quietLine: cycleYear
      ? `${citedVerb(card)} cited in the ${cycleYear} budget cycle`
      : `${citedVerb(card)} cited in the budget cycle`,
    onClick: () => openPanel('cited'),
  }
}

// Two agreement points, on two different figures. The noun sits inside "of
// <baseline> entities", so it agrees with the BASELINE; the verb's subject is
// the partitive head, so it agrees with the VALUE. "1 of 107 entities cites
// these documents" is right on both counts, and keying either to the other
// figure gets one of them wrong.
const entityQuietLine = (props: CardGridProps): string => {
  const card = props.cardStates.entities
  const cite = card.value === 1 ? 'cites' : 'cite'
  const budgets = props.cycleYear
    ? `their ${props.cycleYear} budgets`
    : 'their budgets'
  if (card.condition === 'selected')
    return `among ${card.value.toLocaleString()} ${card.value === 1 ? 'entity' : 'entities'} that ${cite} these documents`
  if (card.condition === 'scoped')
    return `${cite} these documents in ${budgets}`
  return `${cite} those ${props.cardStates.cited.baselineValue.toLocaleString()} in ${budgets}`
}

const entityProps = (props: CardGridProps) => {
  const card = props.cardStates.entities
  const selected = card.condition === 'selected'
  return {
    stateLine: stateLine(card, props.cardStates),
    count: selected ? undefined : card.value,
    countUnit: selected
      ? undefined
      : card.condition === 'scoped'
        ? `of ${card.baselineValue.toLocaleString()} ${card.baselineValue === 1 ? 'entity' : 'entities'}`
        : card.value === 1
          ? 'entity'
          : 'entities',
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
