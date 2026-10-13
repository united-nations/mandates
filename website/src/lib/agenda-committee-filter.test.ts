import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  agendaAllocations,
  filterAgendaCommittee,
} from '#lib/agenda-committee-filter'
import {
  buildAgendaTree,
  groupAgendaNodes,
  type MirroredAgendaRow,
} from '#lib/agenda-tree'

const row = (item: string, allocation: string): MirroredAgendaRow => ({
  row_id: item,
  igov_body: 'GA',
  igov_session: '80',
  agenda_item: item,
  title: `Item ${item}`,
  allocation,
  synced_at: '2026-10-12',
  data: {
    AG_Body: 'GA',
    AG_SessionNo: '80',
    AG_Item: item,
    AG_Heading: 'Heading',
  },
})
const entries = groupAgendaNodes(
  buildAgendaTree(
    [
      row('1', 'GA Plenary'),
      row('1(a)', 'Second Committee;Third Committee'),
      row('1(b)', 'First Committee'),
      row('2', ''),
      row('3', 'Second Committee'),
    ],
    'GA',
    '80',
    []
  ).nodes
)
const items = (committee: string) =>
  filterAgendaCommittee(entries, committee).flatMap((entry) =>
    entry.kind === 'item' ? [entry.node.item] : []
  )

test('committee filtering splits multiple allocations and retains only matches and ancestors', () => {
  assert.deepEqual(items('Second Committee'), ['1', '1(a)', '3'])
  assert.deepEqual(items('Third Committee'), ['1', '1(a)'])
  assert.equal(
    filterAgendaCommittee(entries, 'Second Committee')[0].kind,
    'group'
  )
})

test('parent allocations are not inherited and blanks do not imply plenary', () => {
  assert.deepEqual(items('GA Plenary'), ['1'])
  assert.deepEqual(items('untagged'), ['2'])
  assert.deepEqual(items('Sixth Committee'), [])
  assert.deepEqual(filterAgendaCommittee(entries, ''), entries)
})

test('allocation labels ignore separator spacing and duplicate tags', () => {
  assert.deepEqual(
    agendaAllocations([
      'Second Committee; Third Committee',
      ' Second Committee ; ',
    ]),
    ['Second Committee', 'Third Committee']
  )
})
