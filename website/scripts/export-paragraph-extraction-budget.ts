/** Export scoped source text through the application's shared read-only DB helpers. */
import { mkdir, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { once } from 'node:events'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { closePool } from '#lib/db/index'
import {
  extractionBudgetDocumentsSql,
  extractionBudgetElementsSql,
  getExtractionBudgetDocuments,
  getExtractionBudgetElements,
} from '#lib/data/paragraph-extraction-budget'

dotenv.config({ path: '../.env', quiet: true })
const out = resolve('../.cache/paragraph-entity-budget-registry-20261109')
const scope = {
  registryOnly: true,
  registryDefinition: 'mandateMembershipSql for the selected PPB version',
  version: 'ppb2027',
  rollingStart: '2021-11-09',
  calendarStart: '2022-01-01',
  asOf: '2026-11-09',
  language: 'en',
}
await mkdir(out, { recursive: true })
try {
  const documents = await getExtractionBudgetDocuments(
    scope.version,
    scope.rollingStart,
    scope.calendarStart,
    scope.asOf
  )
  await writeFile(
    resolve(out, 'selection.json'),
    JSON.stringify(
      { executedAt: new Date().toISOString(), scope, documents },
      null,
      2
    )
  )
  await writeFile(
    resolve(out, 'queries.sql'),
    `${extractionBudgetDocumentsSql};\n\n${extractionBudgetElementsSql};\n`
  )
  const selected = documents.filter(
    (d) =>
      d.available && (d.recent_rolling || d.recent_calendar || d.cited_version)
  )
  console.log('Selected readable fulltexts', selected.length)
  const stream = createWriteStream(resolve(out, 'elements.ndjson'))
  const failures = new Promise<never>((_, reject) =>
    stream.once('error', reject)
  )
  let rows = 0
  try {
    for await (const batch of getExtractionBudgetElements(
      selected.map((d) => d.symbol)
    )) {
      for (const row of batch) {
        if (!stream.write(`${JSON.stringify(row)}\n`))
          await Promise.race([once(stream, 'drain'), failures])
        rows++
      }
    }
    stream.end()
    await Promise.race([once(stream, 'finish'), failures])
  } finally {
    stream.destroy()
  }
  const expected = selected.reduce((sum, d) => sum + d.elements, 0)
  if (rows !== expected)
    throw new Error(`Source changed during export: ${rows} vs ${expected}`)
  console.log('Exported elements', rows, 'to', out)
} finally {
  await closePool()
}
