/**
 * Read-only preview of migration 041; no function/view creation or refresh.
 * From website/: node scripts/verify-issuing-body.mjs
 * Emits all changed symbols and any stored/source drift; exits 1 on drift.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'
import ts from 'typescript'

const website = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({
  path: [path.join(website, '.env.local'), path.join(website, '../.env')],
  quiet: true,
})
assert.ok(process.env.DATABASE_URL, 'Use the configured application database')
const migration = fs.readFileSync(
  path.join(website, '../sql/migrations/041_registry_issuing_body.sql'),
  'utf8'
)
const schema = fs.readFileSync(
  path.join(website, '../sql/schema/ppb2026.sql'),
  'utf8'
)
const functionSql = migration
  .match(/as \$issuing_body\$([\s\S]*?)\$issuing_body\$;/)?.[1]
  .trim()
assert.ok(functionSql, 'Read the actual migration expression')
assert.equal(
  schema.match(/as \$issuing_body\$([\s\S]*?)\$issuing_body\$;/)?.[1].trim(),
  functionSql
)
const expression = functionSql.replace(/^select\s+/i, '')
const derive = (symbol, fallback) =>
  expression
    .replace(/\bdocument_symbol\b/g, symbol)
    .replace(/\bfallback_body\b/g, fallback)

// Extract the real production budget predicate instead of maintaining a copy.
const mandates = fs.readFileSync(
  path.join(website, 'src/lib/data/mandates.ts'),
  'utf8'
)
const ast = ts.createSourceFile(
  'mandates.ts',
  mandates,
  ts.ScriptTarget.Latest,
  true
)
const predicateNode = ast.statements.find(
  (node) =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'versionPredicateSql'
)
assert.ok(predicateNode)
const predicateJs = ts.transpileModule(predicateNode.getText(ast), {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
const versionPredicate = new Function(
  `${predicateJs}; return versionPredicateSql`
)()
const membership = (a) =>
  `(${a}.is_catalog_pattern OR EXISTS (SELECT 1 FROM ppb2026.source_document_citations c_cat WHERE c_cat.ppb_full_document_symbol = ${a}.ppb_full_document_symbol AND ${versionPredicate('c_cat', 'NULL')}))`

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
try {
  await client.connect()
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  await client.query("SET LOCAL statement_timeout = '30000ms'")
  const [{ definition }] = (
    await client.query(
      "SELECT pg_get_viewdef('public.unified_documents'::regclass, true) AS definition"
    )
  ).rows
  assert.ok(
    !definition.includes('registry_issuing_body('),
    'This preview targets the unapplied migration; the live view already uses the function'
  )
  const columns = (
    await client.query(
      "SELECT attname FROM pg_attribute WHERE attrelid='public.unified_documents'::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum"
    )
  ).rows.map((r) => r.attname)
  assert.ok(
    columns.includes('ppb_body') && columns.includes('ppb_full_document_symbol')
  )
  const quote = (s) => '"' + s.replaceAll('"', '""') + '"'
  const projection = columns
    .map((c) =>
      c === 'ppb_body'
        ? `${derive('base.ppb_full_document_symbol', 'base.ppb_body')} AS ppb_body`
        : `base.${quote(c)}`
    )
    .join(', ')
  const cte = `WITH base AS MATERIALIZED (${definition.replace(/;\s*$/, '')}), preview AS MATERIALIZED (SELECT ${projection} FROM base)`
  const {
    rows: [summary],
  } = await client.query(`${cte}
    SELECT
      (SELECT COUNT(*) FROM base)::int AS before_total,
      (SELECT COUNT(*) FROM preview)::int AS after_total,
      (SELECT COUNT(*) FROM ((SELECT to_jsonb(b)-'ppb_body' FROM base b EXCEPT ALL SELECT to_jsonb(p)-'ppb_body' FROM preview p) UNION ALL (SELECT to_jsonb(p)-'ppb_body' FROM preview p EXCEPT ALL SELECT to_jsonb(b)-'ppb_body' FROM base b)) residual)::int AS other_field_differences,
      (SELECT COUNT(*) FROM ((SELECT * FROM base EXCEPT ALL SELECT * FROM public.unified_documents) UNION ALL (SELECT * FROM public.unified_documents EXCEPT ALL SELECT * FROM base)) freshness)::int AS live_snapshot_differences,
      (SELECT jsonb_agg(x ORDER BY ppb_body) FROM (SELECT ppb_body,COUNT(*)::int n FROM base GROUP BY ppb_body) x) AS before_bodies,
      (SELECT jsonb_agg(x ORDER BY ppb_body) FROM (SELECT ppb_body,COUNT(*)::int n FROM preview GROUP BY ppb_body) x) AS after_bodies,
      (SELECT jsonb_agg(x ORDER BY ppb_body) FROM (SELECT ppb_body,COUNT(*)::int n FROM base b WHERE ${membership('b')} GROUP BY ppb_body) x) AS before_default_bodies,
      (SELECT jsonb_agg(x ORDER BY ppb_body) FROM (SELECT ppb_body,COUNT(*)::int n FROM preview p WHERE ${membership('p')} GROUP BY ppb_body) x) AS after_default_bodies,
      (SELECT slug FROM ppb2026.budget_versions WHERE is_default LIMIT 1) AS default_version`)
  const changed = (
    await client.query(
      `${cte} SELECT b.ppb_full_document_symbol AS symbol,b.ppb_body AS before,p.ppb_body AS after,b.is_ppb FROM base b JOIN preview p USING(ppb_full_document_symbol) WHERE b.ppb_body IS DISTINCT FROM p.ppb_body ORDER BY 1`
    )
  ).rows
  const freshness = (
    await client.query(
      `${cte} SELECT COALESCE(l.ppb_full_document_symbol,p.ppb_full_document_symbol) AS symbol,to_jsonb(l) AS stored,to_jsonb(p) AS current_source FROM public.unified_documents l FULL JOIN preview p USING(ppb_full_document_symbol) WHERE (to_jsonb(l) || jsonb_build_object('ppb_body',${derive('l.ppb_full_document_symbol', 'l.ppb_body')})) IS DISTINCT FROM to_jsonb(p) ORDER BY 1`
    )
  ).rows
  const supported = (
    await client.query(
      `${cte} SELECT COUNT(*)::int n FROM preview WHERE upper(regexp_replace(ppb_full_document_symbol,'[[:space:]]','','g')) ~ '^A/HRC/(RES|PRST)/' AND ppb_body IS DISTINCT FROM 'HRC'`
    )
  ).rows[0].n
  assert.equal(summary.before_total, summary.after_total)
  assert.equal(summary.other_field_differences, 0)
  assert.equal(
    supported,
    0,
    'Every existing adopted HRC-family record accounted'
  )
  assert.ok(
    changed.every((r) => r.before === 'GA' && r.after === 'HRC'),
    'No other organ changed'
  )
  for (const dimension of ['bodies', 'default_bodies']) {
    const before = new Map(
      summary['before_' + dimension].map((r) => [r.ppb_body, r.n])
    )
    const after = new Map(
      summary['after_' + dimension].map((r) => [r.ppb_body, r.n])
    )
    for (const body of new Set([...before.keys(), ...after.keys()]))
      if (!['GA', 'HRC'].includes(body))
        assert.equal(after.get(body), before.get(body), `${dimension}: ${body}`)
    assert.equal(
      before.get('GA') - after.get('GA'),
      after.get('HRC') - before.get('HRC')
    )
  }
  const cases = [
    ['A/HRC/RES/62/1', 'GA', 'HRC'],
    ['A/HRC/RES/S-35/1', 'GA', 'HRC'],
    ['A/HRC/RES/OM/1/2', 'GA', 'HRC'],
    ['A/HRC/RES/18/R.1', 'GA', 'HRC'],
    ['A/HRC/PRST/60/1', 'GA', 'HRC'],
    ['A/HRC/PRST/OS/14/1', 'GA', 'HRC'],
    [' a/hrc/res/27/21/Corr.1 ', 'GA', 'HRC'],
    ['Ａ／ＨＲＣ／ＲＥＳ／６２／１', 'GA', 'HRC'],
    ['A/HRC/RES/62/1/Rev.1', 'GA', 'HRC'],
    ['A/HRC/RES/62/1/Add.1', 'GA', 'HRC'],
    ['A/RES/80/1', 'GA', 'GA'],
    ['A/RES/60/251', 'GA', 'GA'],
    ['S/RES/2800', 'SC', 'SC'],
    ['A/HRC/62/23', 'GA', 'GA'],
    ['A/HRC/62/L.1', 'GA', 'GA'],
    ['A/HRC/DEC/62/101', 'GA', 'GA'],
    ['A/HRC/RES/62/1;A/RES/80/1', 'GA', 'GA'],
    ['A/HRC/RES/62/1 (draft)', 'GA', 'GA'],
    ['A/HRC/RES/62/', 'GA', 'GA'],
    ['A/HRC/RES/0/1', 'Other', 'Other'],
    [null, 'GA', 'GA'],
    ['', null, null],
    ['Human Rights Council resolution', 'GA', 'GA'],
  ]
  for (const [symbol, fallback, expected] of cases) {
    const [{ actual }] = (
      await client.query(`SELECT ${derive('$1::text', '$2::text')} AS actual`, [
        symbol,
        fallback,
      ])
    ).rows
    assert.equal(actual, expected, symbol ?? 'NULL symbol')
  }
  process.stdout.write(
    JSON.stringify(
      {
        verdict: freshness.length
          ? 'BLOCKED: source freshness drift; guarded migration will roll back'
          : 'PASS',
        body_derivation: 'PASS',
        summary,
        freshness,
        changed_count: changed.length,
        changed_families: {
          RES: changed.filter((r) => r.symbol.includes('/RES/')).length,
          PRST: changed.filter((r) => r.symbol.includes('/PRST/')).length,
        },
        edge_cases: cases.length,
        changed,
      },
      null,
      2
    ) + '\n'
  )
  if (freshness.length) process.exitCode = 1
} finally {
  try {
    await client.query('ROLLBACK')
  } finally {
    await client.end()
  }
}
