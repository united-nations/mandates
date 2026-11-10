/** Freeze a 10% document sample and inspect legacy categories; no model calls or DB writes. */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { closePool } from '#lib/db/index'
import { getExtractionBudgetDocuments } from '#lib/data/paragraph-extraction-budget'
import {
  getParagraphTaxonomyAudit,
  getDeterministicTaxonomyAudit,
  getSampledAnalysisParagraphs,
  paragraphTaxonomyAuditSql,
  deterministicTaxonomyAuditSql,
  sampledAnalysisParagraphsSql,
} from '#lib/data/paragraph-taxonomy-audit'

dotenv.config({ path: '../.env', quiet: true })
const out = resolve('../.cache/paragraph-analysis-20261109')
const references = resolve('../data/references')
const seed = 'mandate-registry-paragraph-analysis-v1-20261109'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const scope = {
  registryOnly: true,
  paragraphType: 'operative',
  targetRule: "type='paragraph' AND paragraph_type='operative'",
  ppbVersion: 'ppb2027',
  citedOrigin: 'programme budget only (doc_type=ppb)',
  rollingStart: '2021-11-09',
  asOf: '2026-11-09',
  population:
    'readable English registry fulltexts: recent documents of all types OR PPB2027-cited resolutions of any age',
  resolutionDefinition: "public.unified_documents.ppb_type = 'Resolutions'",
}
await mkdir(out, { recursive: true })
try {
  const documents = await getExtractionBudgetDocuments(
    scope.ppbVersion,
    scope.rollingStart,
    '2022-01-01',
    scope.asOf
  )
  const cohort = documents.filter(
    (d) =>
      d.available && (d.recent_rolling || (d.cited_ppb_only && d.is_resolution))
  )
  const sampleSize = Math.ceil(cohort.length * 0.1)
  const ranked = cohort
    .map((d) => ({ ...d, selection_hash: hash(`${seed}\n${d.symbol}`) }))
    .sort((a, b) => a.selection_hash.localeCompare(b.selection_hash))
  const sample = ranked.slice(0, sampleSize)
  const symbols = sample.map((d) => d.symbol)
  const manifest = {
    createdAt: new Date().toISOString(),
    scope,
    seed,
    method:
      'simple random document sample without replacement; seeded SHA-256 ranking of normalized symbols; first ceil(N*0.1)',
    populationDocuments: cohort.length,
    sampleDocuments: sample.length,
    inclusionProbability: sample.length / cohort.length,
    expectedSampleContentElements: sample.reduce((n, d) => n + d.elements, 0),
    cohortSymbolSha256: hash(
      cohort
        .map((d) => d.symbol)
        .sort()
        .join('\n')
    ),
    sampleSymbolSha256: hash([...symbols].sort().join('\n')),
    documents: sample,
  }
  await writeFile(
    resolve(references, 'paragraph-analysis-sample-20261109.json'),
    JSON.stringify(manifest, null, 2)
  )
  await writeFile(
    resolve(out, 'population.json'),
    JSON.stringify({ scope, documents: cohort }, null, 2)
  )
  const results = await Promise.allSettled([
    getParagraphTaxonomyAudit(
      scope.ppbVersion,
      cohort.map((d) => d.symbol),
      symbols
    ),
    getDeterministicTaxonomyAudit(
      scope.ppbVersion,
      cohort.map((d) => d.symbol),
      symbols
    ),
    getSampledAnalysisParagraphs(symbols),
  ])
  for (const result of results)
    if (result.status === 'rejected') throw result.reason
  const legacy = results[0].status === 'fulfilled' ? results[0].value : []
  const deterministic =
    results[1].status === 'fulfilled' ? results[1].value : []
  const paragraphs = results[2].status === 'fulfilled' ? results[2].value : []
  const targets = paragraphs.filter(
    (p) => p.type === 'paragraph' && p.paragraph_type === 'operative'
  )
  const targetDocuments = new Set(targets.map((p) => p.symbol))
  const operativeTargets = {
    paragraphs: targets.length,
    documentsWithTargets: targetDocuments.size,
    documentsWithoutTargets: symbols.filter((s) => !targetDocuments.has(s)),
    sourceFile:
      '.cache/paragraph-analysis-20261109/sample-operative-targets.json',
    modelRequestsSubmitted: 0,
  }
  const operativeCount = deterministic
    .filter((r) => r.scope === 'sample' && r.kind === 'deterministic_action')
    .reduce((sum, r) => sum + Number(r.paragraphs), 0)
  if (operativeCount !== targets.length)
    throw new Error('Operative target counts do not reconcile')
  await writeFile(
    resolve(out, 'sample-operative-targets.json'),
    JSON.stringify(targets, null, 2)
  )
  await writeFile(
    resolve(references, 'paragraph-analysis-sample-20261109.json'),
    JSON.stringify({ ...manifest, operativeTargets }, null, 2)
  )
  const audit = {
    executedAt: new Date().toISOString(),
    scope,
    populationDocuments: cohort.length,
    sampleDocuments: sample.length,
    legacy,
    deterministic,
  }
  await writeFile(
    resolve(references, 'paragraph-taxonomy-audit-20261109.json'),
    JSON.stringify(audit, null, 2)
  )
  await writeFile(
    resolve(out, 'queries.sql'),
    `${paragraphTaxonomyAuditSql};\n\n${deterministicTaxonomyAuditSql};\n\n${sampledAnalysisParagraphsSql};\n`
  )
  await writeFile(
    resolve(out, 'sample-paragraphs.json'),
    JSON.stringify(paragraphs, null, 2)
  )
  // Assert file is inspectable and not a partial write.
  const saved = JSON.parse(
    await readFile(
      resolve(references, 'paragraph-analysis-sample-20261109.json'),
      'utf8'
    )
  ) as { sampleDocuments: number }
  if (saved.sampleDocuments !== sampleSize)
    throw new Error('Manifest verification failed')
  if (paragraphs.length !== manifest.expectedSampleContentElements)
    throw new Error('Sample source changed during export')
  console.warn(
    JSON.stringify(
      {
        population: cohort.length,
        sample: sample.length,
        elements: paragraphs.length,
        legacyRows: legacy.length,
        deterministicRows: deterministic.length,
        seed,
      },
      null,
      2
    )
  )
} finally {
  await closePool()
}
