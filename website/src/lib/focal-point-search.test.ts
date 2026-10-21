import assert from 'node:assert/strict'
import test from 'node:test'

import type { DirectorySummaryDesignation } from '#lib/focal-point-constants'
import {
  assembleSearchVocabulary,
  designationSearchIndex,
  matchSearch,
  normaliseSearchText,
  queryVariantForms,
} from '#lib/focal-point-search'

// Rows shaped as mandate_focal_points.search_vocabulary_terms and
// search_vocabulary_assignments are, every column included, so the fixtures
// read as what the tables will hold once seeded.
interface TermTableRow {
  id: number
  term_text: string
  term_text_normalised: string
  term_variants_normalised: string[] | null
  added_by: string
  added_at: string
  retired_at: string | null
  term_note: string | null
}

interface AssignmentTableRow {
  id: number
  entity_code: string
  search_vocabulary_term_id: number
  added_by: string
  added_at: string
  retired_at: string | null
  assignment_source_note: string
}

const termRows: TermTableRow[] = [
  {
    id: 1,
    term_text: 'Child',
    term_text_normalised: 'child',
    term_variants_normalised: ['children'],
    added_by: 'MS',
    added_at: '2026-10-20',
    retired_at: null,
    term_note: null,
  },
  {
    id: 2,
    term_text: 'Climate change',
    term_text_normalised: 'climate change',
    term_variants_normalised: ['climate', 'global warming'],
    added_by: 'MS',
    added_at: '2026-10-20',
    retired_at: null,
    term_note: 'Mitigation and adaptation alike.',
  },
  {
    id: 3,
    term_text: 'Environment',
    term_text_normalised: 'environment',
    term_variants_normalised: null,
    added_by: 'MS',
    added_at: '2026-10-20',
    retired_at: null,
    term_note: null,
  },
]

const assignmentRows: AssignmentTableRow[] = [
  {
    id: 10,
    entity_code: 'UNEP',
    search_vocabulary_term_id: 2,
    added_by: 'MS',
    added_at: '2026-10-20',
    retired_at: null,
    assignment_source_note: 'Strategy for 2026-2029, p. 4',
  },
  {
    id: 11,
    entity_code: 'UNEP',
    search_vocabulary_term_id: 3,
    added_by: 'MS',
    added_at: '2026-10-20',
    retired_at: null,
    assignment_source_note: 'Mandate, GA resolution 2997 (XXVII)',
  },
  {
    id: 12,
    entity_code: 'UNICEF',
    search_vocabulary_term_id: 2,
    added_by: 'MS',
    added_at: '2026-10-20',
    retired_at: null,
    assignment_source_note: 'Strategic plan, goal area 4',
  },
]

const vocabulary = assembleSearchVocabulary(termRows, assignmentRows)

function designation(
  code: string,
  keywords: string[],
  extra: Partial<DirectorySummaryDesignation> = {}
): DirectorySummaryDesignation {
  return {
    id: 1,
    entity: {
      code,
      name: `${code} display name`,
      entityClass: null,
      searchTerms: vocabulary.termsByEntity.get(code) ?? [],
    },
    subUnit: 'Office of the Director',
    functionalMailbox: null,
    contacts: [
      {
        name: 'Amina Okafor',
        title: 'Programme Officer',
        email: 'a.okafor@example.org',
        telephone: null,
        telephoneExtension: null,
        role: 'primary',
        workingLanguages: ['EN'],
      },
      {
        name: 'Lars Lindqvist',
        title: null,
        email: 'l.lindqvist@example.org',
        telephone: null,
        telephoneExtension: null,
        role: 'alternate',
        workingLanguages: null,
      },
    ],
    coverage: [
      { kind: 'body', value: 'Human Rights Council', unmatchedBodyText: null },
      { kind: 'document_symbol', value: 'A/RES/79/1', unmatchedBodyText: null },
      ...keywords.map((value) => ({
        kind: 'keyword' as const,
        value,
        unmatchedBodyText: null,
      })),
    ],
    ...extra,
  }
}

function match(d: DirectorySummaryDesignation, query: string) {
  const needle = normaliseSearchText(query)
  return matchSearch(
    designationSearchIndex(d, false),
    needle,
    queryVariantForms(needle, vocabulary.terms)
  )
}

test('the vocabulary groups each term with its variants and attaches terms to entities', () => {
  assert.deepEqual(vocabulary.terms[0], { text: 'Child', forms: ['child', 'children'] })
  assert.deepEqual(vocabulary.terms[2], { text: 'Environment', forms: ['environment'] })
  assert.deepEqual(
    vocabulary.termsByEntity.get('UNEP')?.map((t) => t.text),
    ['Climate change', 'Environment']
  )
  assert.equal(vocabulary.termsByEntity.get('UNOCHA'), undefined)
})

test('an assignment naming no live term throws rather than being skipped', () => {
  assert.throws(
    () =>
      assembleSearchVocabulary(termRows, [
        { ...assignmentRows[0], search_vocabulary_term_id: 99 },
      ]),
    /term id=99/
  )
})

test('own keyword: a keyword containing the query matches and is shown as typed', () => {
  assert.deepEqual(match(designation('UNICEF', ['Early Childhood Development']), 'childhood'), {
    on: 'keyword',
    keyword: 'Early Childhood Development',
  })
})

test('own keyword: a query equal to a variant finds a keyword holding another form of the group', () => {
  // "children" is a variant of Child; the keyword says "child". The group used
  // is a live term not assigned to this entity: variants are about the words.
  assert.deepEqual(match(designation('UNHCR', ['Child protection']), 'children'), {
    on: 'keyword',
    keyword: 'Child protection',
  })
  // Equality, not containment: a fragment of a form widens to nothing.
  assert.equal(match(designation('UNHCR', ['Child protection']), 'childre'), null)
})

test('EOSG term: the term or any variant containing the query matches, as "relevant to"', () => {
  assert.deepEqual(match(designation('UNEP', ['Ozone layer']), 'warming'), {
    on: 'term',
    term: 'Climate change',
  })
  assert.deepEqual(match(designation('UNEP', ['Ozone layer']), 'Environ'), {
    on: 'term',
    term: 'Environment',
  })
  // A term assigned elsewhere does not make this entity relevant to it.
  assert.equal(match(designation('UNHCR', ['Ozone layer']), 'warming'), null)
})

test('other fields match as before and are not explained', () => {
  const d = designation('UNICEF', ['Nutrition'])
  assert.deepEqual(match(d, 'okafor'), { on: 'other' })
  assert.deepEqual(match(d, 'lindqvist'), { on: 'other' }, 'the alternate is searchable')
  assert.deepEqual(match(d, 'a/res/79/1'), { on: 'other' })
  assert.deepEqual(match(d, 'human rights council'), { on: 'other' })
  assert.equal(match(d, 'fisheries'), null)
})

test('precedence: an own keyword wins over an EOSG term, and the first keyword is the one shown', () => {
  // UNICEF holds Climate change as an EOSG term and claims "climate" itself.
  assert.deepEqual(
    match(designation('UNICEF', ['Climate resilience', 'Climate-smart WASH']), 'climate'),
    { on: 'keyword', keyword: 'Climate resilience' }
  )
  // Without the keyword, the same query is a term match.
  assert.deepEqual(match(designation('UNICEF', ['Nutrition']), 'climate'), {
    on: 'term',
    term: 'Climate change',
  })
})

test('case and whitespace are normalised on both sides', () => {
  assert.deepEqual(match(designation('UNICEF', ['Child   Protection']), '  CHILD protection '), {
    on: 'keyword',
    keyword: 'Child   Protection',
  })
})

test('an empty query is the caller\'s branch, not a match', () => {
  const index = designationSearchIndex(designation('UNICEF', []), false)
  assert.throws(() => matchSearch(index, '', []), /non-empty/)
})
