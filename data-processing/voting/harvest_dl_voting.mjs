/**
 * Harvest the UN Digital Library "Voting Data" collection (MARCXML).
 *
 * Every recorded vote (GA plenary, Security Council, HRC, …) is a separate DL
 * record with per-country votes in repeated MARC 967 fields. The search
 * endpoint sits behind an AWS WAF JavaScript challenge, so plain HTTP clients
 * get 202 challenge pages; a headless real Chrome passes the challenge, and
 * all requests are then made inside that browser context.
 *
 * Usage:  node harvest_dl_voting.mjs [firstYear] [lastYear]
 * Output: one raw MARCXML file per search page under
 *         /Volumes/SSDAStorage/un-voting-data/raw/search-pages/
 *         (external disk; ~50-150 KB per page, 50 records per page).
 *
 * Polite: 1.5 s between requests, identifies itself via User-Agent comment.
 * Re-runs skip pages already on disk, so the harvest is resumable.
 *
 * Requires a Playwright installation with the system Chrome channel; the
 * import path below reuses the machine-wide @playwright/mcp install.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { chromium } from '/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright/index.mjs'

const OUT_DIR = '/Volumes/SSDAStorage/un-voting-data/raw/search-pages'
const BASE = 'https://digitallibrary.un.org'
const PAGE_SIZE = 50
const DELAY_MS = 1500

const firstYear = Number(process.argv[2] ?? 2015)
const lastYear = Number(process.argv[3] ?? new Date().getFullYear())

mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 ' +
    '(mandates.un.org research; davidpomerenke@mailbox.org)',
})
const page = await ctx.newPage()

/** Visit the HTML search page so the WAF challenge can set its token. */
async function refreshWafToken() {
  await page.goto(`${BASE}/search?cc=Voting+Data&ln=en&rg=10`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  })
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2500)
    const ok = await page.evaluate(() =>
      document.body.innerText.includes('records found')
    )
    if (ok) return
  }
  throw new Error('WAF challenge did not clear')
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchPage(year, jrec) {
  const url =
    `${BASE}/search?cc=Voting+Data&of=xm&rg=${PAGE_SIZE}&jrec=${jrec}` +
    `&fct__3=${year}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const resp = await ctx.request.get(url, { timeout: 60000 })
    const body = await resp.text()
    if (resp.status() === 200 && body.includes('<collection')) return body
    console.log(`  challenge/${resp.status()} — refreshing WAF token`)
    await refreshWafToken()
  }
  throw new Error(`could not fetch ${url}`)
}

await refreshWafToken()

let totalRecords = 0
for (let year = firstYear; year <= lastYear; year++) {
  let yearRecords = 0
  for (let pageNo = 0; ; pageNo++) {
    const file = `${OUT_DIR}/vd-${year}-p${String(pageNo).padStart(2, '0')}.xml`
    let xml
    if (existsSync(file)) {
      xml = readFileSync(file, 'utf8')
    } else {
      xml = await fetchPage(year, 1 + pageNo * PAGE_SIZE)
      writeFileSync(file, xml)
      await sleep(DELAY_MS)
    }
    const n = (xml.match(/<record>/g) ?? []).length
    yearRecords += n
    if (n < PAGE_SIZE) break
  }
  totalRecords += yearRecords
  console.log(`${year}: ${yearRecords} records`)
}
console.log(`total: ${totalRecords} records`)

await browser.close()
