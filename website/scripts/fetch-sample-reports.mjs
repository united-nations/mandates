// One-off fetcher for the report-implementation sample pairs.
// Downloads English PDFs of the sampled reports from the UN Digital Library
// into the external SSD cache (never the internal disk), then extracts text
// with pdftotext. Usage:
//   node scripts/fetch-sample-reports.mjs /Volumes/SSDAStorage/report-mapping-cache
/* eslint-disable no-console -- CLI script */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const cacheDir = process.argv[2]
if (!cacheDir) {
  console.error('usage: fetch-sample-reports.mjs <cache-dir>')
  process.exit(1)
}

const lines = readFileSync(join(cacheDir, 'urls.txt'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => l.trim().split(/\s+/))

for (const [name, url] of lines) {
  const pdf = join(cacheDir, name)
  if (!existsSync(pdf)) {
    console.log('fetching', name)
    const res = await fetch(url.replace(/^http:/, 'https:'), {
      headers: { 'user-agent': 'Mozilla/5.0 (research; mandates.un.org)' },
      redirect: 'follow',
    })
    if (!res.ok) {
      console.error('FAIL', name, res.status)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const { writeFileSync } = await import('node:fs')
    writeFileSync(pdf, buf)
    await new Promise((r) => setTimeout(r, 1000))
  }
  const txt = pdf.replace(/\.pdf$/, '.txt')
  if (!existsSync(txt)) {
    execFileSync('pdftotext', ['-layout', pdf, txt])
  }
  console.log('OK', name, statSync(pdf).size, 'bytes ->', txt.split('/').pop())
}
