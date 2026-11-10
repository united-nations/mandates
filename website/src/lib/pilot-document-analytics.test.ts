import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  countDocumentFacets,
  matchesDocumentFacet,
  type PilotDocument,
} from '#lib/pilot-document-analytics'

test('analytics counts each document once despite repeated operative annotations and overlapping categories', () => {
  const doc: PilotDocument = {
    symbol: 'A/RES/1',
    body: 'GA',
    targets: 100,
    validated: 99,
    facets: {
      actions: [],
      assignees: [],
      tasks: [
        ['reporting', 'update'],
        ['reporting', 'written_report'],
        ['reporting', 'update'],
        ['substantive', 'capacity_building'],
      ],
    },
  }
  const other: PilotDocument = {
    ...doc,
    symbol: 'A/RES/2',
    facets: { actions: [], assignees: [], tasks: [['reporting', 'update']] },
  }
  const counts = countDocumentFacets([doc, other], 'tasks')
  assert.equal(counts.find((f) => f.path.join(':') === 'reporting')?.count, 2)
  assert.equal(
    counts.find((f) => f.path.join(':') === 'reporting:update')?.count,
    2
  )
  assert.equal(
    counts.find((f) => f.path.join(':') === 'reporting:written_report')?.count,
    1
  )
  assert.equal(matchesDocumentFacet(doc, 'tasks', ['reporting']), true)
  assert.equal(matchesDocumentFacet(other, 'tasks', ['substantive']), false)
})

test('assignee hierarchy unions UN organizations at document grain and preserves Member States and other subtypes', () => {
  const doc: PilotDocument = {
    symbol: 'A/RES/1',
    body: 'GA',
    targets: 10,
    validated: 9,
    facets: {
      actions: [],
      tasks: [],
      assignees: [
        ['un_organs', 'GA'],
        ['un_secretariat', 'UN Secretary-General'],
        ['un_system', 'UNICEF'],
        ['member_states', 'Member States'],
        ['unresolved', 'Stakeholders'],
      ],
    },
  }
  const other: PilotDocument = {
    ...doc,
    symbol: 'A/RES/2',
    facets: {
      actions: [],
      tasks: [],
      assignees: [
        ['un_system', 'UNICEF'],
        ['other', 'Civil society'],
      ],
    },
  }
  const counts = countDocumentFacets([doc, other], 'assignees')
  assert.deepEqual(
    counts.filter((f) => f.path.length === 1).map((f) => f.path[0]),
    ['member_states', 'un', 'other']
  )
  assert.equal(counts.find((f) => f.path.join(':') === 'un')?.count, 2)
  assert.equal(
    counts.find((f) => f.path.join(':') === 'un:un_secretariat')?.count,
    1
  )
  assert.equal(counts.find((f) => f.path.join(':') === 'other')?.count, 2)
  assert.equal(
    matchesDocumentFacet(doc, 'assignees', ['un', 'un_system', 'UNICEF']),
    true
  )
  assert.equal(
    matchesDocumentFacet(other, 'assignees', ['member_states']),
    false
  )
})
