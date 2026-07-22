/**
 * build-reports-lens.mjs — precompute the "mandates → reports" lens.
 *
 * Read-only over Azure Postgres. Produces website/src/data/reports-lens.json
 * consumed by /reports and the mandate detail pages.
 *
 * Three steps:
 *  1. REQUESTED  — regex-extract reporting obligations (incl. frequency) from
 *     resolution paragraph text in mandates.paragraphs.
 *  2. DELIVERED  — parse "Submitted pursuant to … resolution X" statements in
 *     UN Digital Library report records (notes + titles) into normalized
 *     resolution symbols.
 *  3. JOIN       — match both sides against the mandate registry
 *     (public.unified_documents) and compute coverage stats + aggregates.
 *
 * Usage:
 *   node --env-file=../.env scripts/build-reports-lens.mjs           # build JSON
 *   node --env-file=../.env scripts/build-reports-lens.mjs --probe   # print samples for hand-checking
 */

/* eslint-disable no-console -- CLI script; console output is its interface */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const PROBE = process.argv.includes('--probe')
const OUT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'data',
  'reports-lens.json'
)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 4,
})

// ---------------------------------------------------------------------------
// Symbol helpers
// ---------------------------------------------------------------------------

const norm = (s) => s.toUpperCase().replace(/\s+/g, '')

// ---------------------------------------------------------------------------
// Step 1 — requested reports from resolution paragraphs
// ---------------------------------------------------------------------------

// A paragraph is a reporting request when a requesting verb is followed (in
// the same operative paragraph) by an addressee and a report-flavoured
// obligation. UN drafting is highly formulaic, which makes this tractable.
const REQ_VERB =
  /\b(requests|also requests|further requests|reiterates its requests?|renews its request|decides to request|to request|invites|calls upon|urges|encourages|asks)\b/i

const ADDRESSEE_RE =
  /\b(Secretary-General|High Commissioner|Executive Director|Special Rapporteur|Special Representative|Independent Expert|Working Group|Special Envoy|Advisory Committee|Ombudsperson|Panel of Experts|Monitoring Group|Commissioner-General|Director General|Director-General|Ad Hoc Committee|Special Committee|Commission of Inquiry|fact-finding mission|Group of Experts|team of international experts|Board of Auditors|Joint Inspection Unit|Office of Internal Oversight Services|Commission on Human Rights in|Secretariat|High Representative)\b/i

// The report obligation itself. Anchored on "report"/"update"/"inform".
const OBLIGATION_RE =
  /\bto\s+(?:[a-z-]+\s+){0,3}?(?:submit|present|provide|prepare|transmit)\b[^.;]{0,220}?\breports?\b|\bto\s+report\b|\breport\s+(?:thereon|annually|biennially|periodically|regularly)\b|\bto\s+keep\s+(?:it|the\s+(?:Council|General\s+Assembly|Assembly|Commission))[^.;]{0,60}\binformed\b|\bto\s+update\s+the\s+(?:Council|General\s+Assembly|Assembly|Commission)\b/i

// Frequency classification, checked in order of specificity.
const FREQUENCY_RULES = [
  ['monthly', /\bevery\s+(30|thirty)\s+days\b|\bmonthly\b|\beach month\b/i],
  [
    'quarterly',
    /\bevery\s+(three|3)\s+months\b|\bevery\s+(90|ninety)\s+days\b|\bquarterly\b/i,
  ],
  [
    'semiannual',
    /\bevery\s+(six|6)\s+months\b|\bevery\s+(180|hundred and eighty)\s+days\b|\btwice\s+a\s+year\b|\bsemi-?annually\b|\bevery\s+(120|hundred and twenty)\s+days\b/i,
  ],
  [
    'annual',
    /\bannually\b|\bannual\s+(?:reports?|updates?|basis)\b|\bevery\s+year\b|\byearly\b/i,
  ],
  [
    'biennial',
    /\bbiennially\b|\bbiennial\s+reports?\b|\bevery\s+two\s+years\b|\bon\s+a\s+biennial\s+basis\b/i,
  ],
  [
    'session',
    /\bat\s+its\s+[a-z-]+\s+session\b|\bat\s+the\s+[a-z-]+\s+session\b|\bto\s+the\s+General\s+Assembly\s+at\s+its\b/i,
  ],
  [
    'regular',
    /\bregularly\b|\bperiodic(?:ally)?\b|\bkeep(?:ing)?\s+.{0,40}\binformed\b/i,
  ],
]

function classifyFrequency(text) {
  for (const [label, re] of FREQUENCY_RULES) {
    if (re.test(text)) return label
  }
  return 'unspecified'
}

function extractAddressee(text) {
  const m = ADDRESSEE_RE.exec(text)
  if (!m) return null
  // Canonical casing/hyphenation.
  const canon = m[1]
    .toLowerCase()
    .replace(/director general/, 'director-general')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\b(Of|On|In)\b/g, (w) => w.toLowerCase())
    .replace(
      /^Commission on Human Rights in$/,
      'Commission on Human Rights in …'
    )
  return canon
}

async function fetchRequests() {
  // Only operative paragraphs of registry documents; SQL prefilter keeps the
  // transfer small, JS does the precise matching.
  const { rows } = await pool.query(`
    SELECT p.document_symbol, p.position, p.prefix, p.text
    FROM mandates.paragraphs p
    WHERE p.type = 'paragraph'
      AND p.paragraph_type IS DISTINCT FROM 'preambular'
      AND p.text ~* '(report|informed|update the)'
    ORDER BY p.document_symbol, p.position
  `)
  const requests = []
  for (const r of rows) {
    const text = r.text.replace(/\s+/g, ' ').trim()
    const verbMatch = REQ_VERB.exec(text)
    if (!verbMatch) continue
    // Scope: from the verb onwards (operative paragraphs open with the verb).
    const scope = text.slice(verbMatch.index)
    if (!OBLIGATION_RE.test(scope)) continue
    if (!ADDRESSEE_RE.test(scope)) continue
    requests.push({
      symbol: r.document_symbol,
      position: r.position,
      para: r.prefix ? r.prefix.replace(/[.\s]+$/, '') : null,
      verb: verbMatch[1],
      addressee: extractAddressee(scope),
      frequency: classifyFrequency(scope),
      excerpt: text.length > 320 ? text.slice(0, 317) + '…' : text,
    })
  }
  return requests
}

// ---------------------------------------------------------------------------
// Step 2 — delivered reports from Digital Library metadata
// ---------------------------------------------------------------------------

// One body-phrase can carry several references:
//   "Human Rights Council resolutions 52/28 and 55/21"
//   "General Assembly resolution 663 (VII)"
//   "Security Council resolution 2374 (2017)"
const BODY_PHRASE_RE =
  /(General Assembly|Security Council|Human Rights Council|Economic and Social Council|UNSCR?)\s+(resolutions?|decisions?)?\s*((?:\d+\s*\(\s*(?:\d{4}|[IVXLCDM]+(?:-[IVXLCDM]+)?)\s*\)|\d+\/\d+(?:\s?[A-Z]\b)?)(?:\s*(?:,|and|&)\s*(?:\d+\s*\(\s*(?:\d{4}|[IVXLCDM]+(?:-[IVXLCDM]+)?)\s*\)|\d+\/\d+(?:\s?[A-Z]\b)?))*)/g

const REF_RE =
  /(\d+)\s*\(\s*(\d{4}|[IVXLCDM]+(?:-[IVXLCDM]+)?)\s*\)|(\d+\/\d+(?:\s?[A-Z](?![a-z]))?)/g

function refsToSymbols(body, kind, refsBlob) {
  const symbols = []
  const decision = /decision/i.test(kind || '')
  for (const m of refsBlob.matchAll(REF_RE)) {
    if (m[1] !== undefined) {
      // "N (YYYY)" or "N (ROMAN)"
      const n = m[1]
      const paren = m[2]
      if (/^\d{4}$/.test(paren)) {
        // Year style — Security Council.
        if (body === 'Security Council' || body.startsWith('UNSC')) {
          symbols.push(`S/RES/${n}(${paren})`)
        }
      } else {
        // Roman session — early GA / ECOSOC.
        if (body === 'General Assembly') symbols.push(`A/RES/${n}(${paren})`)
        else if (body === 'Economic and Social Council')
          symbols.push(`E/RES/${n}(${paren})`)
      }
    } else if (m[3] !== undefined) {
      // Keep part letters ("72/262 C") but drop the space, matching the
      // registry's normalized form.
      const ref = m[3].replace(/\s+/g, '')
      if (body === 'General Assembly')
        symbols.push(decision ? `A/DEC/${ref}` : `A/RES/${ref}`)
      else if (body === 'Human Rights Council')
        symbols.push(decision ? `A/HRC/DEC/${ref}` : `A/HRC/RES/${ref}`)
      else if (body === 'Economic and Social Council')
        symbols.push(decision ? `E/DEC/${ref}` : `E/RES/${ref}`)
      else if (body === 'Security Council' || body.startsWith('UNSC')) {
        // "Security Council resolution 2717/2023" style is rare/nonstandard; skip.
      }
    }
  }
  return symbols
}

/** Extract resolution symbols from a "pursuant to …" style statement. */
function parsePursuant(str) {
  const out = []
  for (const m of str.matchAll(BODY_PHRASE_RE)) {
    out.push(...refsToSymbols(m[1], m[2] ?? 'resolution', m[3]))
  }
  return out
}

async function fetchDelivered() {
  // Candidate report records: DL Reports (and addenda) whose notes or title
  // carry a pursuant/response statement.
  const { rows } = await pool.query(`
    SELECT recid, document_symbol, display_title, date_publication, un_body,
           subjects, notes, title
    FROM digitallibrary.documents
    WHERE deleted_at IS NULL
      AND document_symbol IS NOT NULL
      AND (
        (resource_subtype = 'Reports'
         AND (array_to_string(notes, ' | ') ~* '(pursuant to|in response to|in accordance with)'
              OR title ~* 'pursuant to'))
        -- Many mandated documents (UPR compilations, OIOS reports, SR addenda)
        -- carry no resource_subtype but the same provenance note.
        OR (resource_subtype IS NULL
            AND array_to_string(notes, ' | ') ~* '(submitted|prepared) (pursuant to|in response to)')
      )
    ORDER BY document_symbol, recid DESC
  `)
  const delivered = []
  const seenSymbols = new Set()
  for (const r of rows) {
    // Dedupe DL records sharing a document symbol (keep the newest recid,
    // which the ORDER BY puts first).
    const symKey = norm(r.document_symbol)
    if (seenSymbols.has(symKey)) continue
    seenSymbols.add(symKey)
    const statements = [
      ...r.notes.filter((n) =>
        /(pursuant to|in response to|in accordance with)/i.test(n)
      ),
      ...(/pursuant to/i.test(r.title ?? '') ? [r.title] : []),
    ]
    const symbols = new Set()
    let verbatim = null
    for (const s of statements) {
      // Only trust sentences that are about the provenance of this report —
      // not annex listings etc. Require the linking phrase.
      const anchored =
        /^(submitted|prepared|issued|transmitted)?\s*.{0,80}?(pursuant to|in response to)/i.test(
          s
        )
      if (!anchored) continue
      const found = parsePursuant(s)
      if (found.length && !verbatim) verbatim = s
      found.forEach((x) => symbols.add(x))
    }
    if (!symbols.size) continue
    delivered.push({
      recid: r.recid,
      symbol: r.document_symbol,
      title: r.display_title,
      date: r.date_publication
        ? r.date_publication.toISOString().slice(0, 10)
        : null,
      body: r.un_body,
      subjects: r.subjects ?? [],
      resolutions: [...symbols],
      note: verbatim,
    })
  }
  return delivered
}

// ---------------------------------------------------------------------------
// Step 3 — registry join, stats, aggregates
// ---------------------------------------------------------------------------

async function fetchRegistry() {
  const { rows } = await pool.query(`
    SELECT DISTINCT ON (k) k, ppb_full_document_symbol AS symbol, display_title,
           ppb_year AS year, ppb_body AS body, subjects
    FROM (
      SELECT upper(regexp_replace(ppb_full_document_symbol, '[[:space:]]', '', 'g')) AS k,
             ppb_full_document_symbol, display_title, ppb_year, ppb_body, subjects,
             is_ppb
      FROM public.unified_documents
    ) t
    ORDER BY k, is_ppb DESC
  `)
  const map = new Map()
  for (const r of rows) map.set(r.k, r)
  return map
}

function jaccard(a, b) {
  if (!a?.length || !b?.length) return null
  const A = new Set(a.map((x) => x.toLowerCase()))
  const B = new Set(b.map((x) => x.toLowerCase()))
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  return inter / (A.size + B.size - inter)
}

async function main() {
  const [requests, delivered, registry] = await Promise.all([
    fetchRequests(),
    fetchDelivered(),
    fetchRegistry(),
  ])

  if (PROBE) {
    console.log('--- 20 random REQUESTS ---')
    for (const r of [...requests].sort(() => Math.random() - 0.5).slice(0, 20))
      console.log(
        `[${r.symbol} ¶${r.para ?? r.position}] (${r.verb} → ${r.addressee}, ${r.frequency})\n  ${r.excerpt}\n`
      )
    console.log('--- 20 random DELIVERED links ---')
    for (const d of [...delivered].sort(() => Math.random() - 0.5).slice(0, 20))
      console.log(
        `${d.symbol} → ${d.resolutions.join(', ')}\n  note: ${d.note}\n`
      )
  }

  // --- join delivered → registry ------------------------------------------
  const reportsByResolution = new Map() // normalized resolution symbol -> delivered[]
  let linkEdges = 0
  let linkEdgesInRegistry = 0
  for (const d of delivered) {
    for (const res of d.resolutions) {
      linkEdges++
      const k = norm(res)
      if (registry.has(k)) linkEdgesInRegistry++
      if (!reportsByResolution.has(k)) reportsByResolution.set(k, [])
      reportsByResolution.get(k).push(d)
    }
  }

  // --- join requests → delivered -------------------------------------------
  const requestsBySymbol = new Map()
  for (const r of requests) {
    const k = norm(r.symbol)
    if (!requestsBySymbol.has(k)) requestsBySymbol.set(k, [])
    requestsBySymbol.get(k).push(r)
  }

  const symbolsWithRequests = [...requestsBySymbol.keys()]
  const symbolsWithRequestsAndReports = symbolsWithRequests.filter((k) =>
    reportsByResolution.has(k)
  )

  // --- per-resolution entries ----------------------------------------------
  const resolutions = {}
  const allSymbols = new Set([
    ...symbolsWithRequests,
    ...reportsByResolution.keys(),
  ])
  for (const k of allSymbols) {
    const reg = registry.get(k)
    // Keep only resolutions the registry knows — the lens lives inside the
    // mandate registry, dangling references are counted in stats only.
    if (!reg) continue
    const reqs = requestsBySymbol.get(k) ?? []
    const reps = (reportsByResolution.get(k) ?? [])
      .map((d) => ({
        symbol: d.symbol,
        recid: d.recid,
        title: d.title,
        date: d.date,
        note: d.note,
        topicOverlap: jaccard(reg.subjects, d.subjects),
      }))
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    resolutions[reg.symbol] = {
      title: reg.display_title,
      year: reg.year,
      body: reg.body,
      requests: reqs.map(({ symbol: _s, ...rest }) => rest),
      reports: reps,
    }
  }

  // --- aggregates -----------------------------------------------------------
  const freqCount = {}
  for (const r of requests)
    freqCount[r.frequency] = (freqCount[r.frequency] ?? 0) + 1

  const addresseeCount = {}
  for (const r of requests) {
    const a = r.addressee ?? 'Other'
    addresseeCount[a] = (addresseeCount[a] ?? 0) + 1
  }

  const byBody = {}
  for (const [sym, entry] of Object.entries(resolutions)) {
    const b = entry.body ?? 'Other'
    if (!byBody[b])
      byBody[b] = { requests: 0, reports: 0, resolutionsWithRequests: 0 }
    byBody[b].requests += entry.requests.length
    byBody[b].reports += entry.reports.length
    if (entry.requests.length) byBody[b].resolutionsWithRequests++
    void sym
  }

  // reports per year (delivered, linked to registry)
  const reportsPerYear = {}
  for (const [k, list] of reportsByResolution) {
    if (!registry.has(k)) continue
    for (const d of list) {
      const y = d.date ? new Date(d.date).getUTCFullYear() : null
      if (y) reportsPerYear[y] = (reportsPerYear[y] ?? 0) + 1
    }
  }

  // topic overlap distribution
  const overlaps = []
  for (const entry of Object.values(resolutions))
    for (const rep of entry.reports)
      if (rep.topicOverlap != null) overlaps.push(rep.topicOverlap)
  overlaps.sort((a, b) => a - b)
  const q = (p) =>
    overlaps.length ? overlaps[Math.floor(p * (overlaps.length - 1))] : null

  const stats = {
    generatedAt: new Date().toISOString(),
    requestParagraphs: requests.length,
    resolutionsWithRequests: symbolsWithRequests.length,
    parsedResolutionDocs: 2829, // documents with paragraph parses (mandates.paragraphs)
    deliveredReports: delivered.length,
    deliveredLinkEdges: linkEdges,
    deliveredLinkEdgesInRegistry: linkEdgesInRegistry,
    requestsMatchedToReports: symbolsWithRequestsAndReports.length,
    requestMatchRate:
      symbolsWithRequestsAndReports.length / (symbolsWithRequests.length || 1),
    linkEdgeRegistryRate: linkEdgesInRegistry / (linkEdges || 1),
    topicOverlap: {
      n: overlaps.length,
      median: q(0.5),
      p25: q(0.25),
      p75: q(0.75),
    },
    frequencies: freqCount,
    addressees: addresseeCount,
    byBody,
    reportsPerYear,
  }

  if (PROBE) {
    console.log(JSON.stringify(stats, null, 2))
    await pool.end()
    return
  }

  writeFileSync(OUT, JSON.stringify({ stats, resolutions }))
  console.log(
    `Wrote ${OUT}: ${Object.keys(resolutions).length} resolutions, ` +
      `${requests.length} requests, ${delivered.length} delivered reports`
  )
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
