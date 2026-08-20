import assert from 'node:assert/strict'
import test from 'node:test'

import { subjectCountSql } from '#lib/data/subject-count-sql'

test('deduplicates headings within each document before global counting', () => {
  const sql = subjectCountSql('filtered_docs')

  assert.match(sql, /CROSS JOIN LATERAL/)
  assert.match(sql, /SELECT DISTINCT LOWER\(TRIM\(s\)\)/)
  assert.match(sql, /COUNT\(\*\)::int AS n/)
  assert.doesNotMatch(sql, /COUNT\(DISTINCT sym\)/)
})
