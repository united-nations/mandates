/** Refresh operative-only frequencies and targets without redrawing the frozen sample. */
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import dotenv from 'dotenv'
import { closePool } from '#lib/db/index'
import {
  getParagraphTaxonomyAudit,
  getDeterministicTaxonomyAudit,
  paragraphTaxonomyAuditSql,
  deterministicTaxonomyAuditSql,
  type AnalysisParagraph,
} from '#lib/data/paragraph-taxonomy-audit'

dotenv.config({ path: '../.env', quiet: true })
const directory = resolve('../.cache/paragraph-analysis-20261109')
const sampleFile = resolve(
  '../data/references/paragraph-analysis-sample-20261109.json'
)
const auditFile = resolve(
  '../data/references/paragraph-taxonomy-audit-20261109.json'
)
const manifest = JSON.parse(await readFile(sampleFile, 'utf8')) as {
  scope: Record<string, unknown>
  documents: { symbol: string }[]
  sampleSymbolSha256: string
  populationDocuments: number
  sampleDocuments: number
  operativeTargets?: Record<string, unknown>
}
const population = JSON.parse(
  await readFile(resolve(directory, 'population.json'), 'utf8')
) as { documents: { symbol: string }[] }
const source = JSON.parse(
  await readFile(resolve(directory, 'sample-paragraphs.json'), 'utf8')
) as AnalysisParagraph[]
const symbols = manifest.documents.map((d) => d.symbol)
const hash = createHash('sha256')
  .update([...symbols].sort().join('\n'))
  .digest('hex')
if (hash !== manifest.sampleSymbolSha256)
  throw new Error('Frozen sample changed')
const targets = source.filter(
  (p) => p.type === 'paragraph' && p.paragraph_type === 'operative'
)
const docsWithTargets = new Set(targets.map((p) => p.symbol))
const analysisScope = {
  ...manifest.scope,
  paragraphType: 'operative',
  targetRule: "type='paragraph' AND paragraph_type='operative'",
}
try {
  const results = await Promise.allSettled([
    getParagraphTaxonomyAudit(
      'ppb2027',
      population.documents.map((d) => d.symbol),
      symbols
    ),
    getDeterministicTaxonomyAudit(
      'ppb2027',
      population.documents.map((d) => d.symbol),
      symbols
    ),
  ])
  for (const result of results)
    if (result.status === 'rejected') throw result.reason
  const legacy = results[0].status === 'fulfilled' ? results[0].value : []
  const deterministic =
    results[1].status === 'fulfilled' ? results[1].value : []
  const total = deterministic
    .filter((r) => r.scope === 'sample' && r.kind === 'deterministic_action')
    .reduce((n, r) => n + Number(r.paragraphs), 0)
  if (total !== targets.length)
    throw new Error(
      'Frozen sample/live source operative counts differ; reconcile before continuing'
    )
  await writeFile(
    resolve(directory, 'population.json'),
    JSON.stringify({ ...population, scope: analysisScope }, null, 2)
  )
  manifest.scope = analysisScope
  manifest.operativeTargets = {
    paragraphs: targets.length,
    documentsWithTargets: docsWithTargets.size,
    documentsWithoutTargets: symbols.filter((s) => !docsWithTargets.has(s)),
    sourceFile:
      '.cache/paragraph-analysis-20261109/sample-operative-targets.json',
    modelRequestsSubmitted: 0,
  }
  await writeFile(
    resolve(directory, 'sample-operative-targets.json'),
    JSON.stringify(targets, null, 2)
  )
  await writeFile(
    resolve(directory, 'operative-audit-queries.sql'),
    `${paragraphTaxonomyAuditSql};\n\n${deterministicTaxonomyAuditSql};\n`
  )
  await writeFile(sampleFile, JSON.stringify(manifest, null, 2))
  await writeFile(
    auditFile,
    JSON.stringify(
      {
        executedAt: new Date().toISOString(),
        scope: analysisScope,
        populationDocuments: manifest.populationDocuments,
        sampleDocuments: manifest.sampleDocuments,
        legacy,
        deterministic,
      },
      null,
      2
    )
  )
  console.warn(
    JSON.stringify({
      operativeTargets: targets.length,
      documentsWithTargets: docsWithTargets.size,
      documentsWithoutTargets: symbols.length - docsWithTargets.size,
      legacyRows: legacy.length,
      deterministicRows: deterministic.length,
    })
  )
} finally {
  await closePool()
}
