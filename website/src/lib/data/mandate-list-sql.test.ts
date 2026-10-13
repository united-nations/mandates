import assert from 'node:assert/strict'
import test from 'node:test'

import { buildUngroupedListSql } from '#lib/data/mandate-list-sql'

test('paginates before resolution-series enrichment', () => {
  const sql = buildUngroupedListSql({
    filteredCte: 'filtered_docs AS (SELECT 1)',
    keywordRank: '',
    limitParam: '$2',
    offsetParam: '$3',
    orderBy: 'ORDER BY num_entities DESC',
    seriesColumns: 'rs.series_count',
  })

  assert.ok(sql.indexOf('LIMIT $2 OFFSET $3') < sql.indexOf('resolution_series'))
  assert.match(sql, /LEFT JOIN LATERAL/)
  assert.doesNotMatch(sql, /series_lookup/)
})
