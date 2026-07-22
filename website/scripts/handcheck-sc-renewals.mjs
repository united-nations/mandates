// Hand-check helper: draw a stratified random sample of extracted renewals
// and print each next to the source paragraph text for manual verification.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const data = JSON.parse(
  readFileSync(new URL('../src/data/sc-renewals.json', import.meta.url))
)
const url = readFileSync(new URL('../../.env', import.meta.url), 'utf8')
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))
  .slice('DATABASE_URL='.length)
  .trim()
  .replace(/^"|"$/g, '')

let seed = 7
const rand = () => (
  (seed = (seed * 1103515245 + 12345) % 2147483648),
  seed / 2147483648
)
const shuffled = (arr) => [...arr].sort(() => rand() - 0.5)

const missions = shuffled(
  data.renewals.filter((r) => r.kind === 'mission')
).slice(0, 13)
const panels = shuffled(data.renewals.filter((r) => r.kind === 'panel')).slice(
  0,
  6
)
const sanc = shuffled(
  data.renewals.filter((r) => r.kind === 'sanctions')
).slice(0, 3)
const auth = shuffled(
  data.renewals.filter((r) => r.kind === 'authorization')
).slice(0, 4)
const sample = [...missions, ...panels, ...sanc, ...auth]

const client = new pg.Client({ connectionString: url })
await client.connect()
for (const r of sample) {
  const { rows } = await client.query(
    `SELECT text FROM digitallibrary.document_paragraphs
     WHERE symbol_normalized = $1 AND lang='en' AND text ~* '(extend|renew)'
     ORDER BY position`,
    [r.symbol]
  )
  console.log('='.repeat(100))
  console.log(
    `${r.symbol} | chain=${r.chain} kind=${r.kind} adopted=${r.adopted} until=${r.until} leash=${r.leash_days}d method=${r.method}`
  )
  for (const row of rows) {
    const t = row.text.replace(/\s+/g, ' ')
    if (/(until|ending|expiring|terminating|period of)/i.test(t))
      console.log('  ¶ ' + t.slice(0, 400))
  }
}
await client.end()
