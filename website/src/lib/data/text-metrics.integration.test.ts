import assert from 'node:assert/strict'
import test from 'node:test'
import { getPool, closePool } from '#lib/db/index'
import { buildTextMetricsSql } from '#lib/data/text-metrics-sql'

// All fixture relations are CTEs in one SELECT. This test cannot write data,
// create tables, or rely on the production corpus. Opt in with DATABASE_URL.
test(
  'persisted metrics fail closed across corpus and chronology changes',
  {
    skip: !process.env.DATABASE_URL,
  },
  async () => {
    const fixtures: Record<string, Record<string, unknown>[]> = {
      resolution_series: [],
      documents: [],
      document_files: [],
      document_parses: [],
      document_text_metrics: [],
      resolution_series_comparisons: [],
    }
    const schemas: Record<string, string> = {
      resolution_series:
        'document_symbol text, recid integer, series_key text, un_body text, doc_type text, is_collection boolean',
      documents: 'recid integer, date_publication date',
      document_files: 'symbol_normalized text, lang text, status text',
      document_parses:
        'symbol_normalized text, lang text, parser_version text, parsed_at timestamptz',
      document_text_metrics:
        'symbol_normalized text, lang text, text_profile_version text, metric_version text, parser_version text, computed_at timestamptz, source_parsed_at timestamptz, word_count integer, content_sha256 text',
      resolution_series_comparisons:
        'symbol_normalized text, lang text, text_profile_version text, method_version text, comparison_status text, previous_symbol_normalized text, series_key text, un_body text, doc_type text, publication_date date, previous_publication_date date, current_content_sha256 text, previous_content_sha256 text, similarity double precision',
    }
    const cases = [
      'ready',
      'failed',
      'stale',
      'parser',
      'hash',
      'previous_hash',
      'wrong_previous',
      'date_changed',
      'tied',
      'undated',
      'collection',
      'missing_previous',
      'score_pending',
      'zero',
      'duplicate',
    ]
    const symbols: string[] = []
    let recid = 0
    for (const scenario of cases) {
      const hash = 'a'.repeat(64)
      for (let i = 0; i < 3; i++) {
        const symbol = `${scenario}/${i}`
        const date =
          scenario === 'tied' && i === 1
            ? '2022-01-01'
            : scenario === 'undated' && i === 0
              ? null
              : `${2020 + i}-01-01`
        fixtures.resolution_series.push({
          document_symbol: symbol,
          recid: ++recid,
          series_key: scenario,
          un_body: 'GA',
          doc_type: 'resolution',
          is_collection: scenario === 'collection',
        })
        fixtures.documents.push({ recid, date_publication: date })
        fixtures.document_files.push({
          symbol_normalized: symbol,
          lang: 'en',
          status: scenario === 'failed' && i === 2 ? 'parse_failed' : 'parsed',
        })
        fixtures.document_parses.push({
          symbol_normalized: symbol,
          lang: 'en',
          parser_version: 'sem-v5',
          parsed_at: '2026-08-01T00:00:00Z',
        })
        if (!(scenario === 'missing_previous' && i === 1))
          fixtures.document_text_metrics.push({
            symbol_normalized: symbol,
            lang: 'en',
            text_profile_version: 'substantive-v1',
            metric_version: 'unicode-word-v1',
            parser_version:
              scenario === 'parser' && i === 2 ? 'sem-v4' : 'sem-v5',
            computed_at:
              scenario === 'stale' && i === 2
                ? '2026-07-01T00:00:00Z'
                : '2026-08-02T00:00:00Z',
            source_parsed_at:
              scenario === 'stale' && i === 2
                ? '2026-07-01T00:00:00Z'
                : '2026-08-01T00:00:00Z',
            word_count: scenario === 'zero' ? 0 : 100 + i,
            content_sha256: hash,
          })
      }
      symbols.push(`${scenario}/2`)
      fixtures.resolution_series_comparisons.push({
        symbol_normalized: `${scenario}/2`,
        lang: 'en',
        text_profile_version: 'substantive-v1',
        method_version: 'token-levenshtein-v1',
        comparison_status:
          scenario === 'score_pending' ? 'missing_current_text' : 'ready',
        previous_symbol_normalized: `${scenario}/${scenario === 'wrong_previous' ? 0 : 1}`,
        series_key: scenario,
        un_body: 'GA',
        doc_type: 'resolution',
        publication_date:
          scenario === 'date_changed' ? '2022-02-01' : '2022-01-01',
        previous_publication_date: '2021-01-01',
        current_content_sha256: scenario === 'hash' ? 'b'.repeat(64) : hash,
        previous_content_sha256:
          scenario === 'previous_hash' ? 'b'.repeat(64) : hash,
        similarity: scenario === 'zero' ? 0 : 0.91,
      })
    }
    // A duplicate symbol in a different series must still make its original
    // series ambiguous; count occurrences before selecting relevant groups.
    fixtures.resolution_series.push({
      document_symbol: 'duplicate/0',
      recid: ++recid,
      series_key: 'different-series',
      un_body: 'GA',
      doc_type: 'resolution',
      is_collection: false,
    })
    fixtures.documents.push({ recid, date_publication: '2020-01-01' })
    let sql = buildTextMetricsSql(
      'SELECT symbol FROM unnest($1::text[]) symbols(symbol)'
    )
    for (const table of Object.keys(fixtures))
      sql = sql.replaceAll(`digitallibrary.${table}`, `fixture_${table}`)
    sql = sql.replace(
      'WITH requested',
      `WITH ${Object.entries(schemas)
        .map(
          ([name, columns]) =>
            `fixture_${name} AS (SELECT * FROM jsonb_to_recordset($2::jsonb->'${name}') AS rows(${columns}))`
        )
        .join(', ')}, requested`
    )
    const client = await getPool().connect()
    try {
      await client.query('BEGIN READ ONLY')
      const { rows } = await client.query(sql, [
        symbols,
        JSON.stringify(fixtures),
      ])
      assert.equal(rows.length, cases.length)
      const byCase = new Map(rows.map((row) => [row.symbol.split('/')[0], row]))
      assert.equal(byCase.get('ready').similarity_to_previous, 0.91)
      assert.equal(byCase.get('ready').previous_document_symbol, 'ready/1')
      assert.equal(byCase.get('zero').word_count, 0)
      assert.equal(byCase.get('zero').similarity_to_previous, 0)
      for (const scenario of cases.filter(
        (c) => !['ready', 'zero'].includes(c)
      )) {
        assert.equal(
          byCase.get(scenario).similarity_to_previous,
          null,
          scenario
        )
      }
      for (const scenario of ['failed', 'stale', 'parser'])
        assert.equal(byCase.get(scenario).word_count, null, scenario)
      for (const scenario of [
        'duplicate',
        'tied',
        'undated',
        'collection',
        'missing_previous',
        'failed',
        'stale',
        'parser',
      ])
        assert.equal(byCase.get(scenario).can_compare, false, scenario)
      assert.equal(byCase.get('score_pending').can_compare, true)
      assert.equal(byCase.get('hash').can_compare, true)

      // Sorting uses the same eligibility checks across all matching rows,
      // before pagination. Zero is a score; unavailable/stale scores go last.
      for (const [direction, expected] of [
        ['ASC', ['zero/2', 'ready/2']],
        ['DESC', ['ready/2', 'zero/2']],
      ] as const) {
        const sorted = await client.query(
          `SELECT * FROM (${sql}) metrics
           ORDER BY similarity_to_previous ${direction} NULLS LAST, symbol
           LIMIT 2`,
          [symbols, JSON.stringify(fixtures)]
        )
        assert.deepEqual(
          sorted.rows.map((row) => row.symbol),
          expected
        )
        const nextPage = await client.query(
          `SELECT * FROM (${sql}) metrics
           ORDER BY similarity_to_previous ${direction} NULLS LAST, symbol
           LIMIT 1 OFFSET 2`,
          [symbols, JSON.stringify(fixtures)]
        )
        assert.equal(nextPage.rows[0].similarity_to_previous, null)
      }
    } finally {
      await client.query('ROLLBACK')
      client.release()
      await closePool()
    }
  }
)
