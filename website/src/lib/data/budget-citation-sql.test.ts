import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDirectBudgetCitations } from '#lib/data/budget-citation-sql'

test('drives budget hierarchy from the small citation set', () => {
  const sql = buildDirectBudgetCitations({
    subprogramme: 'c.sub_programme',
    versionClause: 'c.version_ok',
    whereClause: 'WHERE d.ppb_type = $2',
  })

  assert.match(sql, /FROM ppb2026\.source_document_citations c/)
  assert.match(sql, /JOIN public\.unified_documents d/)
  assert.match(sql, /WHERE c\.version_ok AND d\.ppb_type = \$2/)
  assert.doesNotMatch(sql, /filtered_docs/)
})
