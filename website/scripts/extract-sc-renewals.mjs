/**
 * Extract Security Council mandate-renewal clauses ("extends/renews … until
 * <date>") from S/RES resolution paragraphs and write them to
 * `website/src/data/sc-renewals.json` for the "Mandate heartbeat" chart on
 * /secretariat.
 *
 * The database is READ-ONLY for this script: it runs a single SELECT over
 * `digitallibrary.document_paragraphs` + `digitallibrary.documents` and does
 * all parsing locally.
 *
 * Run from `website/`:  node scripts/extract-sc-renewals.mjs
 * Requires DATABASE_URL in the repo-root .env (loaded below).
 *
 * Method (documented in docs/lens-heartbeat/ANALYSIS.md):
 *  1. Pull every English S/RES paragraph whose text contains an
 *     extend/renew verb near one of three expiry phrasings:
 *       A. "until 31 December 2024"
 *       B. "for a (further) period ending/expiring/terminating (on) 15 June 1994"
 *       C. "for a (further) period of six months" (converted from the
 *          adoption date, or from an explicit "from 30 March 2003" anchor)
 *  2. Keep operative paragraphs only (paragraph_type, with a lead-verb
 *     fallback where the parser left the type NULL).
 *  3. Attach each clause to a *chain* (mission, sanctions regime, panel of
 *     experts, or standing authorization) via a curated dictionary of ~70
 *     missions plus transitive clustering of cited resolution numbers for
 *     sanctions regimes.
 *  4. Deduplicate to one renewal per (resolution, chain) keeping the latest
 *     expiry, then filter to plausible leashes (0 < leash < 1500 days).
 */

import { readFileSync } from 'node:fs'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_PATH = join(__dirname, '..', 'src', 'data', 'sc-renewals.json')

// ---------------------------------------------------------------------------
// Env / DB
// ---------------------------------------------------------------------------

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  // Repo-root .env (two levels up from website/scripts/)
  for (const p of [
    join(__dirname, '..', '..', '.env'),
    join(__dirname, '..', '.env'),
  ]) {
    try {
      const line = readFileSync(p, 'utf8')
        .split('\n')
        .find((l) => l.startsWith('DATABASE_URL='))
      if (line)
        return line.slice('DATABASE_URL='.length).trim().replace(/^"|"$/g, '')
    } catch {
      /* keep looking */
    }
  }
  throw new Error('DATABASE_URL not found in env or .env')
}

// ---------------------------------------------------------------------------
// Date / period parsing
// ---------------------------------------------------------------------------

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}
const MONTH_RE =
  '(January|February|March|April|May|June|July|August|September|October|November|December)'

const NUM_WORDS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  eighteen: 18,
  'twenty-four': 24,
}

/** "15 June 1994" -> ISO date string, or null. */
function parseDayDate(day, monthWord, year) {
  const m = MONTHS[monthWord.toLowerCase()]
  if (!m) return null
  const d = Number(day)
  const y = Number(year)
  if (d < 1 || d > 31 || y < 1946 || y > 2100) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function isoToDate(iso) {
  return new Date(`${iso}T00:00:00Z`)
}

function dateToIso(date) {
  return date.toISOString().slice(0, 10)
}

function addMonths(iso, months) {
  const d = isoToDate(iso)
  d.setUTCMonth(d.getUTCMonth() + months)
  return dateToIso(d)
}

function daysBetween(fromIso, toIso) {
  return Math.round((isoToDate(toIso) - isoToDate(fromIso)) / 86400000)
}

// Pattern A: "until 31 December 2024" (also "up to and including")
const UNTIL_RE = new RegExp(
  `\\buntil (?:and including )?(\\d{1,2}) ${MONTH_RE} (\\d{4})`,
  'i'
)
// Pattern B: "period ending/expiring/terminating (on) 15 June 1994"
const ENDING_RE = new RegExp(
  `\\b(?:ending|expiring|terminating) (?:on |with )?(\\d{1,2}) ${MONTH_RE} (\\d{4})`,
  'i'
)
// Pattern C: "for a (further interim) period of six months", "of one year"
const PERIOD_RE = new RegExp(
  `\\bfor an? (?:(?:further|additional|final|interim|new) )*period of (${Object.keys(NUM_WORDS).join('|')}|\\d{1,2}) (month|year)s?`,
  'i'
)
// Optional anchor for pattern C: "from 30 March 2003", "beyond 20 December 2002"
const FROM_RE = new RegExp(
  `\\b(?:from|beyond) (\\d{1,2}) ${MONTH_RE} (\\d{4})`,
  'i'
)

const EXTEND_RE =
  /\b(extend|extends|extended|extension|renew|renews|renewed|renewal)\b/i

/**
 * Extract the expiry date from one paragraph.
 * Returns { until, method } or null.
 */
function parseUntil(text, adopted) {
  let m = text.match(UNTIL_RE)
  if (m) {
    const until = parseDayDate(m[1], m[2], m[3])
    if (until) return { until, method: 'until-date' }
  }
  m = text.match(ENDING_RE)
  if (m) {
    const until = parseDayDate(m[1], m[2], m[3])
    if (until) return { until, method: 'ending-date' }
  }
  m = text.match(PERIOD_RE)
  if (m) {
    const n = NUM_WORDS[m[1].toLowerCase()] ?? Number(m[1])
    if (!n) return null
    const months = m[2].toLowerCase() === 'year' ? n * 12 : n
    // Anchor: explicit "from <date>", else the adoption date.
    const anchorMatch = text.match(FROM_RE)
    const anchor = anchorMatch
      ? parseDayDate(anchorMatch[1], anchorMatch[2], anchorMatch[3])
      : null
    return {
      until: addMonths(anchor ?? adopted, months),
      method: anchor ? 'period-from-date' : 'period-from-adoption',
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Operative-paragraph filter
// ---------------------------------------------------------------------------

// Preambular lead words (participles). Used only when paragraph_type is NULL.
const PREAMBLE_RE =
  /^["“]?(Noting|Taking note|Taking into account|Welcoming|Recalling|Reaffirming|Expressing|Having|Bearing in mind|Commending|Recognizing|Considering|Concerned|Gravely concerned|Deeply concerned|Stressing|Emphasizing|Determining|Acknowledging|Reiterating|Underlining|Observing|Mindful|Convinced|Guided|Regretting|Alarmed|Aware|Desiring|Affirming|Condemning|Cognizant|Paying tribute)\b/

// Old scanned "Resolutions and Decisions" dossiers mistag operative decision
// items ("To renew the mandate of … until …") as preambular — accept rows
// that lead with an operative verb regardless of the stored tag.
const OPERATIVE_LEAD_RE =
  /^\s*["“]?(Decides|Extends|Renews|To renew|To extend)\b/

function isOperative(row) {
  if (row.paragraph_type === 'operative') return true
  if (row.paragraph_type === 'preambular')
    return OPERATIVE_LEAD_RE.test(row.text)
  return !PREAMBLE_RE.test(row.text.trimStart())
}

// ---------------------------------------------------------------------------
// Chain dictionary — missions (peacekeeping operations & special political
// missions). `re` must match the paragraph text; order matters only for the
// rare paragraph mentioning two missions (first match wins), which the
// dedupe step tolerates.
// ---------------------------------------------------------------------------

const MISSIONS = [
  // --- Active peacekeeping operations ---
  {
    id: 'UNMISS',
    label: 'UNMISS (South Sudan)',
    re: /\bUNMISS\b|United Nations Mission in South Sudan/i,
  },
  {
    id: 'MONUSCO',
    label: 'MONUSCO (DR Congo)',
    re: /\bMONUSCO\b|United Nations Organization Stabilization Mission/i,
  },
  {
    id: 'MINUSCA',
    label: 'MINUSCA (CAR)',
    re: /\bMINUSCA\b|Multidimensional Integrated Stabilization Mission in the Central African/i,
  },
  // OCR of old dossiers garbles "Lebanon" ("l.ebanon") — the shorter name is unique anyway.
  {
    id: 'UNIFIL',
    label: 'UNIFIL (Lebanon)',
    re: /\bUNIFIL\b|\bUNFIL\b|United Nations Interim Force/i,
  },
  {
    id: 'MINURSO',
    label: 'MINURSO (Western Sahara)',
    re: /\bMINURSO\b|United Nations Mission for the Referendum in Western Sahara/i,
  },
  {
    id: 'UNFICYP',
    label: 'UNFICYP (Cyprus)',
    re: /\bUNFICYP\b|Peace-?keeping Force in Cyprus|stationing in Cyprus of the United Nations Peace-?keeping Force/i,
  },
  {
    id: 'UNDOF',
    label: 'UNDOF (Golan Heights)',
    re: /\bUNDOF\b|United Nations Disengagement Observer Force/i,
  },
  {
    id: 'UNISFA',
    label: 'UNISFA (Abyei)',
    re: /\bUNISFA\b|United Nations Interim Security Force for Abyei/i,
  },
  {
    id: 'UNMIK',
    label: 'UNMIK (Kosovo)',
    re: /\bUNMIK\b|United Nations Interim Administration Mission in Kosovo/i,
  },
  // --- Closed peacekeeping operations ---
  {
    id: 'MINUSMA',
    label: 'MINUSMA (Mali)',
    re: /\bMINUSMA\b|Multidimensional Integrated Stabilization Mission in Mali/i,
  },
  {
    id: 'UNAMID',
    label: 'UNAMID (Darfur)',
    re: /\bUNAMID\b|African Union.United Nations Hybrid Operation in Darfur/i,
  },
  {
    id: 'UNMIL',
    label: 'UNMIL (Liberia)',
    re: /\bUNMIL\b|United Nations Mission in Liberia/i,
  },
  {
    id: 'UNOCI',
    label: 'UNOCI (Côte d’Ivoire)',
    re: /\bUNOCI\b|United Nations Operation in C.te d.Ivoire/i,
  },
  {
    id: 'MINUSTAH',
    label: 'MINUSTAH (Haiti)',
    re: /\bMINUSTAH\b|United Nations Stabilization Mission in Haiti/i,
  },
  {
    id: 'MINUJUSTH',
    label: 'MINUJUSTH (Haiti)',
    re: /\bMINUJUSTH\b|Mission for Justice Support in Haiti/i,
  },
  {
    id: 'MONUC',
    label: 'MONUC (DR Congo)',
    re: /\bMONUC\b|United Nations Organization Mission in the Democratic Republic/i,
  },
  {
    id: 'UNMIS',
    label: 'UNMIS (Sudan)',
    re: /\bUNMIS\b|United Nations Mission in the Sudan/i,
  },
  {
    id: 'UNMEE',
    label: 'UNMEE (Ethiopia–Eritrea)',
    re: /\bUNMEE\b|United Nations Mission in Ethiopia and Eritrea/i,
  },
  {
    id: 'UNMIT',
    label: 'UNMIT (Timor-Leste)',
    re: /\bUNMIT\b|United Nations Integrated Mission in Timor-Leste/i,
  },
  {
    id: 'UNMISET',
    label: 'UNMISET (Timor-Leste)',
    re: /\bUNMISET\b|United Nations Mission of Support in East Timor/i,
  },
  {
    id: 'UNTAET',
    label: 'UNTAET (East Timor)',
    re: /\bUNTAET\b|United Nations Transitional Administration in East Timor/i,
  },
  {
    id: 'UNAMSIL',
    label: 'UNAMSIL (Sierra Leone)',
    re: /\bUNAMSIL\b|United Nations Mission in Sierra Leone/i,
  },
  {
    id: 'MINURCAT',
    label: 'MINURCAT (Chad/CAR)',
    re: /\bMINURCAT\b|United Nations Mission in the Central African Republic and Chad/i,
  },
  {
    id: 'UNPROFOR',
    label: 'UNPROFOR (fmr. Yugoslavia)',
    re: /\bUNPROFOR\b|United Nations Protection Force/i,
  },
  {
    id: 'UNCRO',
    label: 'UNCRO (Croatia)',
    re: /\bUNCRO\b|United Nations Confidence Restoration Operation/i,
  },
  {
    id: 'UNPREDEP',
    label: 'UNPREDEP (Macedonia)',
    re: /\bUNPREDEP\b|United Nations Preventive Deployment Force/i,
  },
  {
    id: 'UNMIBH',
    label: 'UNMIBH (Bosnia)',
    re: /\bUNMIBH\b|United Nations Mission in Bosnia and Herzegovina/i,
  },
  {
    id: 'UNTAES',
    label: 'UNTAES (E. Slavonia)',
    re: /\bUNTAES\b|United Nations Transitional Administration for Eastern Slavonia/i,
  },
  {
    id: 'UNMOP',
    label: 'UNMOP (Prevlaka)',
    re: /\bUNMOP\b|United Nations Mission of Observers in Prevlaka|United Nations military observers to continue monitoring the demilitarization of the Prevlaka/i,
  },
  {
    id: 'UNOMIG',
    label: 'UNOMIG (Georgia)',
    re: /\bUNOMIG\b|United Nations Observer Mission in Georgia/i,
  },
  {
    id: 'UNMOT',
    label: 'UNMOT (Tajikistan)',
    re: /\bUNMOT\b|United Nations Mission of Observers in Tajikistan/i,
  },
  {
    id: 'UNAVEM',
    label: 'UNAVEM (Angola)',
    re: /\bUNAVEM\b|United Nations Angola Verification Mission/i,
  },
  {
    id: 'MONUA',
    label: 'MONUA (Angola)',
    re: /\bMONUA\b|United Nations Observer Mission in Angola/i,
  },
  {
    id: 'UNOSOM',
    label: 'UNOSOM (Somalia)',
    re: /\bUNOSOM\b|United Nations Operation in Somalia/i,
  },
  {
    id: 'ONUMOZ',
    label: 'ONUMOZ (Mozambique)',
    re: /\bONUMOZ\b|United Nations Operation in Mozambique/i,
  },
  {
    id: 'UNMIH',
    label: 'UNMIH (Haiti)',
    re: /\bUNMIH\b|United Nations Mission in Haiti/i,
  },
  {
    id: 'UNSMIH',
    label: 'UNSMIH (Haiti)',
    re: /\bUNSMIH\b|United Nations Support Mission in Haiti/i,
  },
  {
    id: 'UNTMIH',
    label: 'UNTMIH (Haiti)',
    re: /\bUNTMIH\b|United Nations Transition Mission in Haiti/i,
  },
  {
    id: 'MIPONUH',
    label: 'MIPONUH (Haiti)',
    re: /\bMIPONUH\b|United Nations Civilian Police Mission in Haiti/i,
  },
  {
    id: 'MINURCA',
    label: 'MINURCA (CAR)',
    re: /\bMINURCA\b|United Nations Mission in the Central African Republic\b(?! and)/i,
  },
  {
    id: 'MINUCI',
    label: 'MINUCI (Côte d’Ivoire)',
    re: /\bMINUCI\b|United Nations Mission in C.te d.Ivoire/i,
  },
  {
    id: 'UNOMSIL',
    label: 'UNOMSIL (Sierra Leone)',
    re: /\bUNOMSIL\b|United Nations Observer Mission in Sierra Leone/i,
  },
  {
    id: 'UNOMIL',
    label: 'UNOMIL (Liberia)',
    re: /\bUNOMIL\b|United Nations Observer Mission in Liberia/i,
  },
  {
    id: 'UNAMIR',
    label: 'UNAMIR (Rwanda)',
    re: /\bUNAMIR\b|United Nations Assistance Mission for Rwanda/i,
  },
  {
    id: 'UNOMUR',
    label: 'UNOMUR (Uganda–Rwanda)',
    re: /\bUNOMUR\b|United Nations Observer Mission Uganda-Rwanda/i,
  },
  {
    id: 'UNIIMOG',
    label: 'UNIIMOG (Iran–Iraq)',
    re: /\bUNIIMOG\b|United Nations Iran-? ?Iraq Military Observer Group/i,
  },
  {
    id: 'UNIKOM',
    label: 'UNIKOM (Iraq–Kuwait)',
    re: /\bUNIKOM\b|United Nations Iraq-Kuwait Observation Mission/i,
  },
  {
    id: 'ONUCA',
    label: 'ONUCA (Central America)',
    re: /\bONUCA\b|United Nations Observer Group in Central America/i,
  },
  {
    id: 'ONUSAL',
    label: 'ONUSAL (El Salvador)',
    re: /\bONUSAL\b|United Nations Observer Mission in El Salvador/i,
  },
  {
    id: 'UNEF',
    label: 'UNEF (Middle East)',
    re: /\bUNEF\b|United Nations Emergency Force/i,
  },
  // --- Special political missions & offices ---
  {
    id: 'UNAMA',
    label: 'UNAMA (Afghanistan)',
    re: /\bUNAMA\b|United Nations Assistance Mission in Afghanistan/i,
  },
  {
    id: 'UNAMI',
    label: 'UNAMI (Iraq)',
    re: /\bUNAMI\b|United Nations Assistance Mission for Iraq/i,
  },
  {
    id: 'UNSMIL',
    label: 'UNSMIL (Libya)',
    re: /\bUNSMIL\b|United Nations Support Mission in Libya/i,
  },
  {
    id: 'UNSOM',
    label: 'UNSOM (Somalia)',
    re: /\bUNSOM\b|United Nations Assistance Mission in Somalia/i,
  },
  {
    id: 'UNSOS',
    label: 'UNSOS (Somalia support)',
    re: /\bUNSOS\b|United Nations Support Office in Somalia/i,
  },
  {
    id: 'UNTMIS',
    label: 'UNTMIS (Somalia)',
    re: /\bUNTMIS\b|United Nations Transitional Assistance Mission in Somalia/i,
  },
  {
    id: 'UNITAMS',
    label: 'UNITAMS (Sudan)',
    re: /\bUNITAMS\b|United Nations Integrated Transition Assistance Mission in( the)? Sudan/i,
  },
  {
    id: 'UNAMIS',
    label: 'UNAMIS (Sudan advance)',
    re: /\bUNAMIS\b|United Nations Advance Mission in the Sudan/i,
  },
  {
    id: 'BINUH',
    label: 'BINUH (Haiti)',
    re: /\bBINUH\b|United Nations Integrated Office in Haiti/i,
  },
  {
    id: 'UNMHA',
    label: 'UNMHA (Hodeidah, Yemen)',
    re: /\bUNMHA\b|United Nations Mission to [Ss]upport the H.{0,2}deida|Hodeidah Agreement/i,
  },
  {
    id: 'UNVMC',
    label: 'UNVMC (Colombia)',
    re: /\bUNVMC\b|Verification Mission in Colombia|mandate of the Verification Mission/i,
  },
  {
    id: 'UNMIN',
    label: 'UNMIN (Nepal)',
    re: /\bUNMIN\b|United Nations Mission in Nepal/i,
  },
  {
    id: 'UNSMIS',
    label: 'UNSMIS (Syria)',
    re: /\bUNSMIS\b|United Nations Supervision Mission in( the Syrian Arab Republic|to Syria)/i,
  },
  {
    id: 'UNIOGBIS',
    label: 'UNIOGBIS (Guinea-Bissau)',
    re: /\bUNIOGBIS\b|Integrated Peacebuilding Office in Guinea-Bissau/i,
  },
  {
    id: 'UNOGBIS',
    label: 'UNOGBIS (Guinea-Bissau)',
    re: /\bUNOGBIS\b|Peace-?building Support Office in Guinea-Bissau/i,
  },
  {
    id: 'UNIPSIL',
    label: 'UNIPSIL (Sierra Leone)',
    re: /\bUNIPSIL\b|Integrated Peacebuilding Office in Sierra Leone/i,
  },
  {
    id: 'UNIOSIL',
    label: 'UNIOSIL (Sierra Leone)',
    re: /\bUNIOSIL\b|Integrated Office in Sierra Leone/i,
  },
  {
    id: 'BINUB',
    label: 'BINUB (Burundi)',
    re: /\bBINUB\b|United Nations Integrated Office in Burundi/i,
  },
  {
    id: 'BNUB',
    label: 'BNUB (Burundi)',
    re: /\bBNUB\b|United Nations Office in Burundi/i,
  },
  {
    id: 'BINUCA',
    label: 'BINUCA (CAR)',
    re: /\bBINUCA\b|Integrated Peacebuilding Office in the Central African Republic/i,
  },
  {
    id: 'UNOTIL',
    label: 'UNOTIL (Timor-Leste)',
    re: /\bUNOTIL\b|United Nations Office in Timor-Leste/i,
  },
  {
    id: 'UNAMET',
    label: 'UNAMET (East Timor)',
    re: /\bUNAMET\b|United Nations Mission in East Timor/i,
  },
  {
    id: 'UNOA',
    label: 'UNOA/UNMA (Angola office)',
    re: /\bUNOA\b|\bUNMA\b|United Nations Office in Angola|United Nations Mission in Angola/i,
  },
  {
    id: 'JIM',
    label: 'OPCW–UN JIM (Syria)',
    re: /Joint Investigative Mechanism/i,
    kind: 'panel',
  },
]

// Authorizations of non-UN forces — their renewals are the same "heartbeat"
// dynamic (the Council keeps another force on a leash).
const AUTHORIZATIONS = [
  {
    id: 'AMISOM',
    label: 'AMISOM/ATMIS (Somalia)',
    re: /\bAMISOM\b|\bATMIS\b|\bAUSSOM\b|African Union (Transition )?[Mm]ission in Somalia|AU Support and Stabilization Mission|Member States of the African Union to maintain a mission in Somalia/i,
  },
  {
    id: 'ISAF',
    label: 'ISAF (Afghanistan)',
    re: /\bISAF\b|International Security Assistance Force/i,
  },
  {
    id: 'EUFOR-ALTHEA',
    label: 'EUFOR Althea / SFOR (Bosnia)',
    re: /\bEUFOR\b|\bSFOR\b|multinational stabilization force|European Union-led/i,
  },
  {
    id: 'MSS-HAITI',
    label: 'MSS mission (Haiti)',
    re: /Multinational Security Support|\bMSS\b/i,
  },
  { id: 'KFOR', label: 'KFOR (Kosovo)', re: /\bKFOR\b/i },
  {
    id: 'MNF-IRAQ',
    label: 'Multinational force in Iraq',
    re: /multinational force in Iraq/i,
  },
  {
    id: 'MISAB',
    label: 'MISAB (CAR)',
    re: /\bMISAB\b|Inter-African Mission to Monitor/i,
  },
  {
    id: 'AUTH-1464',
    label: 'ECOWAS/Licorne (Côte d’Ivoire)',
    re: /ECOWAS forces|French forces/i,
  },
]

// ---------------------------------------------------------------------------
// Sanctions regimes / panels — chains built by transitive clustering of the
// resolution numbers cited in each paragraph, then labelled via anchors.
// ---------------------------------------------------------------------------

const REGIME_ANCHORS = [
  // [anchor resolution number, chain id, label]
  [1267, 'SANC-1267', 'ISIL & Al-Qaida sanctions (1267)'],
  [1989, 'SANC-1267', 'ISIL & Al-Qaida sanctions (1267)'],
  [1988, 'SANC-1988', 'Taliban sanctions (1988)'],
  [751, 'SANC-751', 'Somalia/Eritrea sanctions (751)'],
  [1907, 'SANC-751', 'Somalia/Eritrea sanctions (751)'],
  [918, 'SANC-918', 'Rwanda sanctions (918)'],
  [1132, 'SANC-1132', 'Sierra Leone sanctions (1132)'],
  [1518, 'SANC-1518', 'Iraq sanctions (1518)'],
  [1521, 'SANC-1521', 'Liberia sanctions (1521)'],
  [1343, 'SANC-1521', 'Liberia sanctions (1343/1521)'],
  [1533, 'SANC-1533', 'DR Congo sanctions (1533)'],
  [1572, 'SANC-1572', 'Côte d’Ivoire sanctions (1572)'],
  [1591, 'SANC-1591', 'Sudan sanctions (1591)'],
  [1636, 'SANC-1636', 'Lebanon measures (1636)'],
  [1718, 'SANC-1718', 'DPRK sanctions (1718)'],
  [1737, 'SANC-1737', 'Iran sanctions (1737)'],
  [1970, 'SANC-1970', 'Libya sanctions (1970)'],
  [2048, 'SANC-2048', 'Guinea-Bissau sanctions (2048)'],
  [2127, 'SANC-2127', 'CAR sanctions (2127)'],
  [2140, 'SANC-2140', 'Yemen sanctions (2140)'],
  [2206, 'SANC-2206', 'South Sudan sanctions (2206)'],
  [2374, 'SANC-2374', 'Mali sanctions (2374)'],
  [2653, 'SANC-2653', 'Haiti sanctions (2653)'],
  [2165, 'AUTH-2165', 'Syria cross-border aid (2165)'],
  [1816, 'AUTH-1816', 'Somalia piracy auth. (1816)'],
  [2240, 'AUTH-2240', 'Migrant-smuggling auth. (2240)'],
  [2146, 'SANC-1970', 'Libya sanctions (1970)'],
  [1540, 'COMM-1540', '1540 Committee (WMD)'],
  [2118, 'SANC-2118', 'Syria chemical weapons (2118)'],
  // Panels are often renewed citing a later resolution than the regime's
  // founding one — extra anchors keep those clusters resolvable.
  [1874, 'SANC-1718', 'DPRK sanctions (1718)'], // DPRK Panel of Experts
  [1596, 'SANC-1533', 'DR Congo sanctions (1533)'],
  [1526, 'SANC-1267', 'ISIL & Al-Qaida sanctions (1267)'],
  [2255, 'SANC-1988', 'Taliban sanctions (1988)'],
  [1464, 'AUTH-1464', 'ECOWAS & French forces (Côte d’Ivoire)'],
  [1497, 'AUTH-1497', 'Multinational force in Liberia (1497)'],
  [1511, 'MNF-IRAQ', 'Multinational force in Iraq'],
  [1546, 'MNF-IRAQ', 'Multinational force in Iraq'],
  [1846, 'AUTH-1816', 'Somalia piracy auth. (1816)'],
  [1929, 'SANC-1737', 'Iran sanctions (1737)'], // Iran Panel of Experts
  [2360, 'SANC-1533', 'DR Congo sanctions (1533)'], // DRC Group of Experts
  [1689, 'SANC-1521', 'Liberia sanctions (1343/1521)'],
  [2183, 'EUFOR-ALTHEA', 'EUFOR Althea / SFOR (Bosnia)'],
  [1152, 'AUTH-MISAB', 'MISAB (CAR)'],
  [1155, 'AUTH-MISAB', 'MISAB (CAR)'],
  // CAR Panel of Experts clauses cite either nothing or only each other —
  // anchor the known members of the chain directly.
  [2196, 'SANC-2127', 'CAR sanctions (2127)'],
  [2262, 'SANC-2127', 'CAR sanctions (2127)'],
  [2339, 'SANC-2127', 'CAR sanctions (2127)'],
  [2399, 'SANC-2127', 'CAR sanctions (2127)'],
  [2745, 'SANC-2127', 'CAR sanctions (2127)'],
  // 1267 Monitoring Team ("New York-based") extensions with no usable citation
  [1617, 'SANC-1267', 'ISIL & Al-Qaida sanctions (1267)'],
  [1735, 'SANC-1267', 'ISIL & Al-Qaida sanctions (1267)'],
  [1822, 'SANC-1267', 'ISIL & Al-Qaida sanctions (1267)'],
]

// Rare clauses that name their subject only as "the Mission".
const SYMBOL_OVERRIDES = new Map([['S/RES/804(1993)', 'UNAVEM']])

// Multi-anchor sanity: warn when one union-find cluster contains anchors of
// two different chain ids — that means unrelated regimes were merged.

const PANEL_RE =
  /Panel of Experts|Group of Experts|Monitoring Group|Monitoring Team|Team of Experts|Analytical Support and Sanctions Monitoring/i
const CTED_RE = /Counter-Terrorism Committee Executive Directorate|\bCTED\b/i
const SANCTIONS_RE =
  /measures (imposed|specified|set out|contained|referred to|renewed|extended|decided)|arms embargo|travel ban|asset freeze|assets freeze|financial measures|targeted sanctions|sanctions regime|provisions? (of|set out in|in) paragraphs?/i
const AUTH_RE = /authoriz|decisions? in paragraphs?/i

// Year suffix optional: renewal clauses often cite "resolution 1596" bare.
const CITED_RES_RE = /resolutions? (\d{3,4})(?: ?\((\d{4})\))?/gi

// Cross-regime "hub" resolutions cited from renewal clauses of MANY different
// sanctions regimes; following them would merge unrelated chains in the
// union-find (2664 = the 2022 humanitarian carve-out that applies to all
// regimes; 1452/2462 = counter-terrorism financing carve-outs).
const CITATION_HUBS = new Set([2664, 1452, 2462, 2178, 1373])

function citedNumbers(text) {
  const out = new Set()
  for (const m of text.matchAll(CITED_RES_RE)) {
    const n = Number(m[1])
    if (!CITATION_HUBS.has(n)) out.add(n)
  }
  return out
}

class UnionFind {
  constructor() {
    this.parent = new Map()
  }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let r = x
    while (this.parent.get(r) !== r) r = this.parent.get(r)
    while (this.parent.get(x) !== x) {
      const next = this.parent.get(x)
      this.parent.set(x, r)
      x = next
    }
    return r
  }
  union(a, b) {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent.set(rb, ra)
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const client = new pg.Client({ connectionString: loadDatabaseUrl() })
  await client.connect()

  // Broad candidate pull; all fine-grained parsing happens locally.
  const { rows } = await client.query(`
    SELECT p.symbol_normalized AS symbol,
           d.date_publication::text AS adopted,
           p.paragraph_type,
           p.text
    FROM digitallibrary.document_paragraphs p
    JOIN digitallibrary.documents d USING (symbol_normalized)
    WHERE p.symbol_normalized LIKE 'S/RES/%'
      AND p.lang = 'en'
      AND p.text ~* '(extend|renew)'
      AND (
        p.text ~* 'until (and including )?\\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \\d{4}'
        OR p.text ~* '(ending|expiring|terminating) (on |with )?\\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \\d{4}'
        OR p.text ~* 'for an? ((further|additional|final|interim|new) )*period of (one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|eighteen|twenty-four|\\d{1,2}) (month|year)'
      )
    ORDER BY p.symbol_normalized, p.position
  `)
  await client.end()
  console.error(`candidate paragraphs: ${rows.length}`)

  // Context pool per resolution (ALL candidate paragraphs, incl. preambular):
  // used to resolve clauses like "Decides to extend the present mandate until
  // 31 July 2005" where the mission is only named in the preamble.
  const contextBySymbol = new Map()
  for (const row of rows) {
    contextBySymbol.set(
      row.symbol,
      (contextBySymbol.get(row.symbol) ?? '') + ' ' + row.text
    )
  }

  // ---- pass 1: parse dates, classify kind, collect sanction clusters ------
  const parsed = []
  const uf = new UnionFind()
  let skippedPreamble = 0
  let skippedNoDate = 0

  for (const row of rows) {
    if (!isOperative(row)) {
      skippedPreamble++
      continue
    }
    const text = row.text.replace(/\s+/g, ' ')
    if (!EXTEND_RE.test(text)) continue
    // Troop-ceiling / redeployment adjustments are dated but are not mandate
    // renewals — skip unless the paragraph also extends a mandate.
    if (
      /(troop|police|personnel|authorized) ceiling|redeployment from/i.test(
        text
      ) &&
      !/mandate/i.test(text)
    ) {
      continue
    }
    const until = parseUntil(text, row.adopted)
    if (!until) {
      skippedNoDate++
      continue
    }

    const ownNum = Number((row.symbol.match(/S\/RES\/(\d+)/) ?? [])[1])
    const cited = citedNumbers(text)

    // Chain resolution, in priority order.
    let chain = null
    let kind = null
    const overrideId = SYMBOL_OVERRIDES.get(row.symbol)
    if (overrideId) {
      const m = MISSIONS.find((x) => x.id === overrideId)
      if (m) {
        chain = { id: m.id, label: m.label }
        kind = m.kind ?? 'mission'
      }
    }
    // Target-first: if the extend/renew verb directly governs a panel or the
    // sanctions measures, the clause belongs to the sanctions regime even
    // when it mentions a mission in passing (e.g. Mali panel renewals that
    // reference MINUSMA support).
    const panelTarget =
      !chain &&
      /(extend|renew)\w*[^.;]{0,80}(Panel of Experts|Group of Experts|Monitoring Group|Monitoring Team|Team of Experts)/i.test(
        text
      )
    const measuresTarget =
      !chain &&
      !panelTarget &&
      /(extend|renew)\w*[^.;]{0,60}(measures|arms embargo|travel ban|asset freeze)/i.test(
        text
      )
    if (panelTarget) kind = 'panel'
    else if (measuresTarget) kind = 'sanctions'
    const mission =
      chain || panelTarget || measuresTarget
        ? null
        : MISSIONS.find((m) => m.label && m.re.test(text))
    if (mission) {
      chain = { id: mission.id, label: mission.label }
      kind = mission.kind ?? 'mission'
    } else if (!kind && CTED_RE.test(text)) {
      chain = { id: 'CTED', label: 'CTED (Counter-Terrorism)' }
      kind = 'panel'
    } else if (!kind && /1540 Committee/.test(text)) {
      chain = { id: 'COMM-1540', label: '1540 Committee (WMD)' }
      kind = 'panel'
    } else if (!chain && !kind) {
      const auth = AUTHORIZATIONS.find((a) => a.re.test(text))
      if (auth) {
        chain = { id: auth.id, label: auth.label }
        kind = 'authorization'
      } else if (PANEL_RE.test(text)) {
        kind = 'panel' // chain assigned by cluster in pass 2
      } else if (SANCTIONS_RE.test(text)) {
        kind = 'sanctions'
      } else if (AUTH_RE.test(text)) {
        kind = 'authorization'
      } else if (
        /(extend|renew)\w*[^.;]{0,20}(the )?present mandate\b/i.test(text)
      ) {
        // "Decides to extend the present mandate until …" — the mission is
        // named only elsewhere in the resolution. Accept only when exactly
        // one mission matches the resolution's context.
        const ctx = contextBySymbol.get(row.symbol) ?? ''
        const matches = MISSIONS.filter((m) => m.label && m.re.test(ctx))
        if (matches.length === 1) {
          chain = { id: matches[0].id, label: matches[0].label }
          kind = matches[0].kind ?? 'mission'
        }
      }
    }

    if (!chain && kind) {
      // Cluster sanction/panel/authorization clauses by co-cited resolutions.
      const nums = [ownNum, ...cited]
      for (let i = 1; i < nums.length; i++) uf.union(nums[0], nums[i])
      // Some clauses cite nothing ("extend the mandate of the Panel of
      // Experts until …") — link them through the other renewal clauses of
      // the same resolution below (pass 1b).
    }

    parsed.push({
      symbol: row.symbol,
      adopted: row.adopted,
      until: until.until,
      method: until.method,
      chain,
      kind,
      ownNum,
      cited: [...cited],
      snippet: text.slice(0, 200),
    })
  }
  console.error(
    `parsed: ${parsed.length} (skipped ${skippedPreamble} preambular, ${skippedNoDate} undated)`
  )

  // ---- pass 1b: within one resolution, link its citation-less sanction
  // clauses to the numbers cited by its other non-mission clauses ------------
  const numsBySymbol = new Map()
  for (const p of parsed) {
    if (p.chain || !p.kind) continue
    const set = numsBySymbol.get(p.symbol) ?? new Set()
    for (const n of p.cited) set.add(n)
    numsBySymbol.set(p.symbol, set)
  }
  for (const [symbol, set] of numsBySymbol) {
    const ownNum = Number((symbol.match(/S\/RES\/(\d+)/) ?? [])[1])
    for (const n of set) uf.union(ownNum, n)
  }

  // ---- pass 2: assign cluster chains -------------------------------------
  const anchorByRoot = new Map()
  for (const [num, id, label] of REGIME_ANCHORS) {
    const root = uf.find(num)
    const prev = anchorByRoot.get(root)
    if (prev && prev.id !== id) {
      console.error(
        `WARNING: cluster merge — anchors ${prev.id} and ${id} (via ${num}) share a cluster; keeping ${prev.id}`
      )
      continue
    }
    // First anchor wins; later anchors of the same cluster keep the first label.
    if (!prev) anchorByRoot.set(root, { id, label })
  }

  const unresolved = []
  for (const p of parsed) {
    if (p.chain || !p.kind) continue
    const root = uf.find(p.ownNum)
    const anchor = anchorByRoot.get(root)
    if (anchor) {
      p.chain = anchor
    } else {
      unresolved.push(p)
    }
  }
  console.error(`cluster-unresolved (dropped): ${unresolved.length}`)
  const unresolvedLimit = process.env.DEBUG ? unresolved.length : 12
  for (const u of unresolved.slice(0, unresolvedLimit)) {
    console.error(`  ? ${u.symbol}: ${u.snippet.slice(0, 120)}`)
  }
  if (process.env.DEBUG_CLUSTER) {
    const target = uf.find(Number(process.env.DEBUG_CLUSTER))
    const members = [...uf.parent.keys()].filter((k) => uf.find(k) === target)
    console.error(
      `cluster of ${process.env.DEBUG_CLUSTER}: ${members.sort((a, b) => a - b).join(' ')}`
    )
    for (const p of parsed) {
      if (!p.chain && p.kind && uf.find(p.ownNum) === target) {
        console.error(
          `  * ${p.symbol} cites [${p.cited}] :: ${p.snippet.slice(0, 110)}`
        )
      }
    }
  }

  // ---- filtering + dedupe -------------------------------------------------
  const MIN_YEAR = 1990
  const MAX_LEASH = 1500
  const bySymbolChain = new Map()
  let implausible = 0
  for (const p of parsed) {
    if (!p.chain || !p.kind) continue
    const leash = daysBetween(p.adopted, p.until)
    if (leash <= 0 || leash >= MAX_LEASH) {
      implausible++
      continue
    }
    if (Number(p.adopted.slice(0, 4)) < MIN_YEAR) continue
    const key = `${p.symbol}|${p.chain.id}`
    const prev = bySymbolChain.get(key)
    // One renewal per (resolution, chain). Prefer the clause that extends the
    // *mandate* itself (tightly: "extend the (present) mandate of …"), then
    // explicitly dated clauses. On full ties keep the SHORTEST leash: old
    // scanned dossiers bundle neighbouring resolutions' clauses under one
    // symbol, and the true renewal is the one anchored at the adoption date.
    const score = (q) =>
      (/mandate/i.test(q.snippet) ? 8 : 0) +
      (/(extend|renew)\w*[^.;]{0,30}(present )?mandate of/i.test(q.snippet)
        ? 4
        : 0) +
      (q.method.startsWith('period') ? 0 : 2)
    if (
      !prev ||
      score(p) > score(prev) ||
      (score(p) === score(prev) && leash < prev.leash)
    ) {
      bySymbolChain.set(key, { ...p, leash })
    }
  }
  console.error(`implausible leash (dropped): ${implausible}`)

  // Same dossier problem, other direction: a neighbouring resolution's clause
  // can be bundled under the wrong symbol, duplicating a renewal. Within a
  // chain, when several symbols set the SAME expiry, keep the latest-adopted
  // one (the real renewal; bundled copies sit under earlier symbols).
  const byChainUntil = new Map()
  for (const p of bySymbolChain.values()) {
    const key = `${p.chain.id}|${p.until}`
    const prev = byChainUntil.get(key)
    if (!prev || p.adopted > prev.adopted) byChainUntil.set(key, p)
  }

  const renewals = [...byChainUntil.values()]
    .map((p) => ({
      chain: p.chain.id,
      symbol: p.symbol,
      adopted: p.adopted,
      until: p.until,
      leash_days: p.leash,
      kind: p.kind,
      method: p.method,
    }))
    .sort((a, b) =>
      a.chain === b.chain
        ? a.adopted.localeCompare(b.adopted)
        : a.chain.localeCompare(b.chain)
    )

  // Chain metadata (label + kind by majority + span)
  const chainMeta = new Map()
  for (const p of byChainUntil.values()) {
    const meta = chainMeta.get(p.chain.id) ?? {
      id: p.chain.id,
      label: p.chain.label,
      kinds: {},
      count: 0,
    }
    meta.kinds[p.kind] = (meta.kinds[p.kind] ?? 0) + 1
    meta.count++
    chainMeta.set(p.chain.id, meta)
  }
  const chains = [...chainMeta.values()]
    .map((m) => ({
      id: m.id,
      label: m.label,
      kind: Object.entries(m.kinds).sort((a, b) => b[1] - a[1])[0][0],
      renewals: m.count,
    }))
    .sort((a, b) => b.renewals - a.renewals)

  console.error(`\nchains: ${chains.length}, renewals: ${renewals.length}`)
  for (const c of chains) {
    console.error(
      `  ${String(c.renewals).padStart(3)}  ${c.kind.padEnd(13)} ${c.label ?? c.id}`
    )
  }

  const out = {
    generated: new Date().toISOString().slice(0, 10),
    source:
      'digitallibrary.document_paragraphs (S/RES operative paragraphs, English), extraction: website/scripts/extract-sc-renewals.mjs',
    chains,
    renewals,
  }
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 1) + '\n')
  console.error(`\nwrote ${OUT_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
