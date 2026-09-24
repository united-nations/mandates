import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildSystemDirectory,
  documentRegistryLinks,
  filterSystemDirectory,
} from '#lib/system-directory'
import type { SystemDirectoryAddition } from '#lib/system-directory'
import type { DirectorySummaryDesignation } from '#lib/focal-point-constants'
import type { UnSystemData } from '@/types'

const data: UnSystemData = JSON.parse(
  readFileSync(new URL('../data/un-system.json', import.meta.url), 'utf8')
)
const additions: SystemDirectoryAddition[] = JSON.parse(
  readFileSync(
    new URL('../data/un-system-directory-additions.json', import.meta.url),
    'utf8'
  )
)

function designation(code: string, id = 1): DirectorySummaryDesignation {
  return {
    id,
    entity: { code, name: code, entityClass: 'secretariat' },
    subUnit: 'Mandate coordination',
    functionalMailbox: null,
    contacts: [],
    coverage: [],
  }
}

test('the combined baseline has 88 unique entities and every shared body resolves', () => {
  const entities = buildSystemDirectory(data, additions, [])
  assert.equal(entities.length, 88)
  assert.equal(new Set(entities.map((entity) => entity.code)).size, 88)
  assert.equal(
    entities.filter((entity) => entity.parentCode === 'UN Secretariat').length,
    37
  )
  assert.equal(
    entities.filter((entity) => entity.governingBodies === null).length,
    31
  )
  for (const original of data.organizations) {
    const entity = entities.find((entity) => entity.code === original.code)!
    assert.equal(
      entity.governingBodies?.length,
      original.governingBodies.length
    )
    assert.ok(entity.governingBodies?.every((body) => body.name))
    assert.deepEqual(documentRegistryLinks(entity), original.mandateRegistry)
  }
})

test('category reconciliation keeps entities in exactly one display group', () => {
  const entities = buildSystemDirectory(data, additions, [])
  const counts = entities.reduce<Record<string, number>>((counts, entity) => {
    counts[entity.group] = (counts[entity.group] ?? 0) + 1
    return counts
  }, {})
  assert.deepEqual(counts, {
    secretariat: 1,
    departments: 23,
    offices: 3,
    envoys: 6,
    commissions: 5,
    'fund-programme': 8,
    research: 6,
    'other-entity': 7,
    'specialized-agency': 15,
    'related-organization': 8,
    conventions: 2,
    'joint-hosted': 4,
  })
  for (const [code, group] of Object.entries({
    UNODC: 'departments',
    UNAIDS: 'joint-hosted',
    UNFCCC: 'conventions',
    UNCCD: 'conventions',
  }))
    assert.equal(entities.find((entity) => entity.code === code)?.group, group)
  const unep = entities.find((entity) => entity.code === 'UNEP')!
  assert.equal(unep.group, 'fund-programme')
  assert.equal(unep.parentCode, null)
  assert.equal(unep.system?.secretariatAdministered, true)
})

test('all designations stay with the exact entity; children do not populate their parent', () => {
  const input = [
    designation('IOM'),
    designation('IOM', 2),
    designation('DGACM', 3),
  ]
  const entities = buildSystemDirectory(data, additions, input)
  assert.equal(entities.length, 88)
  assert.deepEqual(
    entities
      .find((entity) => entity.code === 'IOM')
      ?.designations.map((d) => d.id),
    [1, 2]
  )
  assert.equal(
    entities.find((entity) => entity.code === 'UN Secretariat')?.designations
      .length,
    0
  )
  const child = entities.find((entity) => entity.code === 'DGACM')!
  assert.equal(child.designations.length, 1)
  assert.equal(child.governingBodies, null)
  assert.deepEqual(documentRegistryLinks(child), [])
  // Rebuilding with current query results removes withdrawn designations;
  // static roster membership never preserves a previously returned contact.
  assert.ok(
    buildSystemDirectory(data, additions, []).every(
      (entity) => entity.designations.length === 0
    )
  )
})

test('new publicly returned entities are visible, with unknown classes kept explicit', () => {
  const newEntity = designation('NEW', 10)
  newEntity.entity.entityClass = 'future_class'
  newEntity.entity.name = null
  const unmatched = designation('UNMATCHED', 11)
  unmatched.entity.code = null
  const entities = buildSystemDirectory(data, additions, [newEntity, unmatched])
  assert.equal(entities.length, 89)
  const entity = entities.find((entity) => entity.code === 'NEW')!
  assert.equal(entity.group, 'unclassified')
  assert.equal(entity.name, null)
  assert.equal(entity.system, null)
  assert.deepEqual(entity.designations, [newEntity])
})

test('search covers sidebar content and preserves a matching child’s parent', () => {
  const focalPoint = designation('DGACM')
  focalPoint.functionalMailbox = 'example-office@example.org'
  focalPoint.coverage = [
    {
      kind: 'keyword',
      value: 'special coverage phrase',
      unmatchedBodyText: null,
    },
  ]
  const entities = buildSystemDirectory(data, additions, [focalPoint])
  for (const query of [
    'DGACM',
    'EXAMPLE-OFFICE@EXAMPLE.ORG',
    'special coverage phrase',
  ]) {
    assert.deepEqual(
      filterSystemDirectory(entities, query).map((entity) => entity.code),
      ['UN Secretariat', 'DGACM']
    )
  }
  assert.ok(
    filterSystemDirectory(
      entities,
      'Secretary-General of the Conference and the Council'
    ).some((entity) => entity.code === 'FAO')
  )
  assert.deepEqual(
    filterSystemDirectory(entities, 'unlikely unmatched search'),
    []
  )
})

test('an unresolved body reference is an error, not a misleading body count', () => {
  assert.throws(
    () => buildSystemDirectory({ ...data, bodies: {} }, additions, []),
    /Unknown governing body/
  )
})
