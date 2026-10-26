import assert from 'node:assert/strict'
import test from 'node:test'
import { getPool, closePool } from '#lib/db/index'
import { resolutionFamilySql } from '#lib/data/mandated-sg-reports-sql'

// CTE-only fixtures: no tables are created and no production rows are read.
test('report families preserve canonical identities and ambiguity guards', {
  skip: !process.env.DATABASE_URL,
}, async () => {
  const sql = resolutionFamilySql
    .replaceAll('digitallibrary.resolution_series', 'fixture_series')
    .replaceAll('digitallibrary.documents', 'fixture_documents')
    .replace('WITH me', `WITH
      fixture_series (recid, document_symbol, series_key, un_body, doc_type, is_collection) AS (
        VALUES (1, 'A/RES/1/1', 'annual', 'GA', 'RES', false),
          (2, 'A/RES/2/1', 'annual', 'GA', 'RES', false),
          (3, 'A/RES/3/1', 'annual', 'GA', 'RES', false),
          (4, 'S/RES/1(2000)', 'annual', 'SC', 'RES', false),
          (5, 'A/DEC/1/1', 'annual', 'GA', 'DEC', false),
          (6, 'A/RES/1/2', 'collection', 'GA', 'RES', true),
          (7, 'A/RES/2/2', 'collection', 'GA', 'RES', true),
          (8, 'A/RES/1/3', 'ambiguous-one', 'GA', 'RES', false),
          (9, 'A/RES/1/3', 'ambiguous-two', 'GA', 'RES', false),
          (10, 'A/RES/1/4', 'missing-document', 'GA', 'RES', false)
      ),
      fixture_documents (recid, symbol_normalized) AS (
        VALUES (1, 'A/RES/1/1'), (2, 'A/RES/2/1'), (3, 'A/RES/2/1'),
          (4, 'S/RES/1(2000)'), (5, 'A/DEC/1/1'),
          (6, 'A/RES/1/2'), (7, 'A/RES/2/2'),
          (8, 'A/RES/1/3'), (9, 'A/RES/1/3')
      ), me`)
  const client = await getPool().connect()
  try {
    await client.query('BEGIN READ ONLY')
    for (const symbol of ['A/RES/1/1', ' a/res/1/1 ']) {
      const { rows } = await client.query(sql, [symbol])
      assert.deepEqual(rows, [
        { symbol, canonical: 'A/RES/1/1' },
        { symbol: 'A/RES/2/1', canonical: 'A/RES/2/1' },
      ])
    }
    assert.deepEqual((await client.query(sql, ['A/RES/1/2'])).rows, [
      { symbol: 'A/RES/1/2', canonical: 'A/RES/1/2' },
    ])
    for (const symbol of ['A/RES/1/3', 'A/RES/1/4', 'UNKNOWN'])
      assert.deepEqual((await client.query(sql, [symbol])).rows, [], symbol)
  } finally {
    await client.query('ROLLBACK')
    client.release()
    await closePool()
  }
})
