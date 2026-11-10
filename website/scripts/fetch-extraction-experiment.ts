/** Read-only snapshot for the budget-capped extraction experiment. */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
import { closePool } from '#lib/db/index'
import { getExtractionExperimentSeries } from '#lib/data/paragraph-extraction-budget'
import { getSampledAnalysisParagraphs } from '#lib/data/paragraph-taxonomy-audit'

dotenv.config({ path: '../.env', quiet: true })
const out = resolve('../.cache/extraction-experiment-20261110')
await mkdir(out, { recursive: true })
try {
  if (process.argv.includes('--series')) {
    const rows = await getExtractionExperimentSeries()
    await writeFile(resolve(out, 'series.json'), JSON.stringify(rows))
    console.warn(
      'Series rows',
      rows.length,
      'fields',
      Object.keys(rows[0]?.metadata ?? {})
    )
  } else {
    const symbols = JSON.parse(
      await readFile(resolve(out, 'fetch-symbols.json'), 'utf8')
    ) as string[]
    const rows = await getSampledAnalysisParagraphs(symbols)
    await writeFile(resolve(out, 'paragraphs.json'), JSON.stringify(rows))
    console.warn('Documents', symbols.length, 'elements', rows.length)
  }
} finally {
  await closePool()
}
