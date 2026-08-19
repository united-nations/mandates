// Runs on Node's built-in test runner (`pnpm test`) — see
// sg-report-summary.test.ts for the setup notes. The `#lib/` specifier
// resolves via package.json `imports`.
//
// Every assertion here is keyed on FIGURES, never on filter kind. Which cards
// a selection narrows is a fact about the data — two selections of the same
// kind can narrow different numbers of cards — so "an organ filter scopes
// three cards" is not a property of the resolver and is not asserted anywhere.
// The figure sets below are the measured card magnitudes from the live page,
// which is what makes the expected conditions right for these inputs.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  exploreCardBaselineFilters,
  organSelectionLabel,
  resolveExploreCardStates,
  type ExploreCardFigures,
} from '#lib/explore-card-state'

/** Full-state figures under the default lens, as measured on the live page. */
const FULL: ExploreCardFigures = {
  organCount: 23,
  entityCount: 107,
  allDocumentsCount: 42_944,
  citedDocumentCount: 2_777,
}

const NO_SELECTIONS = { citedOnly: false }

describe('resolveExploreCardStates', () => {
  it('resolves every card full when nothing is selected', () => {
    const states = resolveExploreCardStates(FULL, FULL, NO_SELECTIONS)
    assert.equal(states.organs.condition, 'full')
    assert.equal(states.documents.condition, 'full')
    assert.equal(states.cited.condition, 'full')
    assert.equal(states.entities.condition, 'full')
    assert.equal(states.scopeCause, null)
    assert.equal(states.cited.countForm, 'fraction')
  })

  it('keeps every card full under a version switch, with no version logic', () => {
    // The 2026 lens: every figure moves, and the baseline — resolved through
    // the SAME lens — moves with it, so every card compares equal. The
    // resolver never sees a version; this test is the assertion that it does
    // not need to.
    const lens2026: ExploreCardFigures = {
      organCount: 23,
      entityCount: 110,
      allDocumentsCount: 43_020,
      citedDocumentCount: 3_962,
    }
    const states = resolveExploreCardStates(lens2026, lens2026, NO_SELECTIONS)
    assert.equal(states.organs.condition, 'full')
    assert.equal(states.documents.condition, 'full')
    assert.equal(states.cited.condition, 'full')
    assert.equal(states.entities.condition, 'full')
    assert.equal(states.scopeCause, null)
  })

  it('scopes exactly the cards whose figures moved under an organ selection', () => {
    const current: ExploreCardFigures = {
      organCount: 1,
      entityCount: 61,
      allDocumentsCount: 27_942,
      citedDocumentCount: 1_180,
    }
    const states = resolveExploreCardStates(current, FULL, {
      organ: { code: 'GA', longName: 'General Assembly' },
      citedOnly: false,
    })
    assert.equal(states.organs.condition, 'selected')
    // The selected card's own label keeps the long name where it fits...
    assert.equal(states.organs.selection?.name, 'General Assembly')
    assert.equal(states.documents.condition, 'scoped')
    assert.equal(states.documents.value, 27_942)
    assert.equal(states.documents.baselineValue, 42_944)
    assert.equal(states.cited.condition, 'scoped')
    assert.equal(states.cited.shownDocumentsValue, 27_942)
    assert.equal(states.cited.countForm, 'fraction')
    assert.equal(states.entities.condition, 'scoped')
    // ...while the visible cause abbreviates to the code, and the spoken
    // cause keeps the full name.
    assert.equal(states.scopeCause, 'GA')
    assert.equal(states.spokenScopeCause, 'General Assembly')
  })

  it('collapses cards 2 and 3 to one number under an entity selection', () => {
    // OHCHR: every document it cites is in view because it is cited, so shown
    // equals cited and the fraction would say nothing.
    const current: ExploreCardFigures = {
      organCount: 8,
      entityCount: 14,
      allDocumentsCount: 433,
      citedDocumentCount: 433,
    }
    const states = resolveExploreCardStates(current, FULL, {
      entity: { code: 'OHCHR', longName: 'Office of the High Commissioner for Human Rights' },
      citedOnly: false,
    })
    assert.equal(states.organs.condition, 'scoped')
    assert.equal(states.organs.value, 8)
    assert.equal(states.organs.baselineValue, 23)
    assert.equal(states.documents.condition, 'scoped')
    assert.equal(states.cited.condition, 'scoped')
    assert.equal(states.cited.countForm, 'collapsed')
    assert.equal(states.entities.condition, 'selected')
    assert.equal(states.entities.selection?.name, 'OHCHR')
    assert.equal(states.entities.value, 14)
    assert.equal(states.scopeCause, 'OHCHR')
    assert.equal(
      states.spokenScopeCause,
      'Office of the High Commissioner for Human Rights'
    )
  })

  it('scopes exactly one card under cited only', () => {
    // Card 1 stays at 23 — measured, not assumed: every body that issues a
    // listed document also issues a cited one. Card 4 stays at 107 for the
    // same kind of reason. Only card 2 shrinks.
    const current: ExploreCardFigures = {
      organCount: 23,
      entityCount: 107,
      allDocumentsCount: 42_944,
      citedDocumentCount: 2_777,
    }
    const states = resolveExploreCardStates(current, FULL, { citedOnly: true })
    assert.equal(states.organs.condition, 'full')
    assert.equal(states.documents.condition, 'scoped')
    assert.equal(states.documents.value, 2_777)
    assert.equal(states.cited.condition, 'selected')
    assert.equal(states.cited.selection?.name, 'Cited only')
    assert.equal(states.entities.condition, 'full')
    // The cited selection has no code to abbreviate to; both causes carry its
    // frame.
    assert.equal(states.scopeCause, 'the cited set')
    assert.equal(states.spokenScopeCause, 'the cited set')
    // Under the cited filter, shown and cited are the same number by
    // construction.
    assert.equal(states.cited.countForm, 'collapsed')
  })

  // Card 3's three count forms. The equality that used to decide this had no
  // lower bound, so an empty result set satisfied it and card 3 claimed all of
  // nothing.
  it('gives card 3 the empty form when nothing is shown', () => {
    // No card-owned selection: a filter the cards cannot name (a keyword, say)
    // matches nothing, so the baseline is empty too and every card is full.
    // Emptiness is therefore not a scoped-state concern, and this is the case
    // that proves it.
    const empty: ExploreCardFigures = {
      organCount: 0,
      entityCount: 0,
      allDocumentsCount: 0,
      citedDocumentCount: 0,
    }
    const states = resolveExploreCardStates(empty, empty, NO_SELECTIONS)
    assert.equal(states.cited.condition, 'full')
    assert.equal(states.cited.value, 0)
    assert.equal(states.cited.shownDocumentsValue, 0)
    assert.equal(states.cited.countForm, 'empty')
  })

  it('gives card 3 the empty form under a selection that shows nothing', () => {
    // The live state this was found in: an organ selection with an agenda and
    // a document type filter alongside it, returning nothing. Card 1's
    // baseline of 2 is the measured figure; the other baselines are set only
    // non-zero, which follows from two sources matching the filters that
    // survive into the baseline, and nothing is asserted about them.
    const states = resolveExploreCardStates(
      {
        organCount: 0,
        entityCount: 0,
        allDocumentsCount: 0,
        citedDocumentCount: 0,
      },
      { organCount: 2, entityCount: 3, allDocumentsCount: 9, citedDocumentCount: 4 },
      { organ: { code: 'UNCTAD', longName: null }, citedOnly: false }
    )
    assert.equal(states.organs.condition, 'selected')
    assert.equal(states.cited.condition, 'scoped')
    assert.equal(states.cited.countForm, 'empty')
  })

  it('keeps the collapsed form at one rather than treating it as degenerate', () => {
    // "all 1 of them" is awkward and true. A threshold at two would have
    // nothing behind it, so this pins the inclusion against being read later
    // as an oversight and quietly raised.
    const current: ExploreCardFigures = {
      organCount: 1,
      entityCount: 1,
      allDocumentsCount: 1,
      citedDocumentCount: 1,
    }
    const states = resolveExploreCardStates(current, FULL, {
      organ: { code: 'GA', longName: 'General Assembly' },
      citedOnly: false,
    })
    assert.equal(states.cited.value, 1)
    assert.equal(states.cited.shownDocumentsValue, 1)
    assert.equal(states.cited.countForm, 'collapsed')
  })

  it('joins conjunction causes in card order, not selection order', () => {
    const current: ExploreCardFigures = {
      organCount: 1,
      entityCount: 5,
      allDocumentsCount: 310,
      citedDocumentCount: 310,
    }
    const states = resolveExploreCardStates(current, FULL, {
      // Passed entity-first: the cause must still read organ-first.
      entity: { code: 'OHCHR', longName: null },
      organ: { code: 'GA', longName: 'General Assembly' },
      citedOnly: false,
    })
    assert.equal(states.scopeCause, 'GA and OHCHR')
    // The entity has no long name in this fixture, so its spoken frame falls
    // back to what it has: the code.
    assert.equal(states.spokenScopeCause, 'General Assembly and OHCHR')
    assert.equal(states.organs.condition, 'selected')
    assert.equal(states.entities.condition, 'selected')
    assert.equal(states.documents.condition, 'scoped')
  })
})

describe('organSelectionLabel', () => {
  it('keeps a long name at or under the threshold', () => {
    assert.equal(
      organSelectionLabel('ECOSOC', 'Economic and Social Council'),
      'Economic and Social Council'
    )
  })

  it('falls back to the code above the threshold', () => {
    assert.equal(
      organSelectionLabel(
        'ESCAP',
        'Economic and Social Commission for Asia and the Pacific'
      ),
      'ESCAP'
    )
  })

  it('falls back to the code when the vocabulary has no long name', () => {
    // Some organ rows carry a code and no long name; the column is null even
    // though the row type says string.
    assert.equal(organSelectionLabel('SGB', null), 'SGB')
  })
})

describe('exploreCardBaselineFilters', () => {
  it('drops exactly the card-owned selections and keeps the lens', () => {
    const baseline = exploreCardBaselineFilters({
      organ: 'GA',
      entity: 'OHCHR',
      cited: '1',
      ppb_version: 'ppb-2026',
      keyword: 'climate',
      subject: 'human rights',
    })
    // The three failure modes here are all silent: dropping the lens would
    // scope every card under a non-default version; keeping a card-owned
    // selection would make cards compare equal against a filtered baseline
    // and scope nothing; dropping a filter no card can name would scope cards
    // with nothing to attribute the scoping to.
    assert.equal(baseline.organ, undefined)
    assert.equal(baseline.entity, undefined)
    assert.equal(baseline.cited, undefined)
    assert.equal(baseline.ppb_version, 'ppb-2026')
    assert.equal(baseline.keyword, 'climate')
    assert.equal(baseline.subject, 'human rights')
  })
})
