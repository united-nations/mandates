import missionData from '@/data/mission-implementation.json'

/**
 * Peace-operation implementation data: UN Peace & Security Data Hub (DPPA-DPO
 * official open data, via HDX) joined with mandate-renewal resolutions from our
 * Digital Library mirror on the mission acronym.
 *
 * Produced by `data-processing/scripts/build_mission_implementation.py`;
 * research notes in `docs/lens-impact/SOURCES.md`.
 */

export interface MissionRenewal {
  symbol: string
  date: string
  /** Mandate end date parsed from the resolution's DL title ("… until 30 Apr. 2025"). */
  until?: string
}

export interface MissionPersonnelYear {
  year: string // budget year, e.g. "2024/25" (July–June)
  approved: number
  actual: number
  approvedUniformed: number
  actualUniformed: number
}

export interface MissionDeploymentMonth {
  m: string // "YYYY-MM"
  n: number
}

export interface MissionFatalityYear {
  y: number
  total: number
  malicious: number
}

export interface MissionBudgetYear {
  year: string
  appropriation: number
  expenditure: number
}

export interface MissionIndicatorPeriod {
  period: string
  met: number
  total: number
}

export interface Mission {
  acronym: string
  name: string
  location: string
  type: string // "Peacekeeping Mission" | "Special Political Mission"
  chapterVii: boolean
  open: boolean
  initialSymbol: string | null
  latestSymbol: string | null
  mandateExpiry: string | null
  mandateTasks: number | null
  mandateParagraphs: number
  renewals: MissionRenewal[]
  personnel: MissionPersonnelYear[]
  deployment: MissionDeploymentMonth[]
  fatalities: MissionFatalityYear[]
  budget: MissionBudgetYear[]
  indicators: MissionIndicatorPeriod[]
}

export interface MissionImplementationData {
  generated: string
  missions: Mission[]
}

const data = missionData as MissionImplementationData

export function getMissionImplementation(): MissionImplementationData {
  return data
}

/** Latest budget year with a non-zero actual personnel figure. */
export function latestPersonnel(m: Mission): MissionPersonnelYear | null {
  for (let i = m.personnel.length - 1; i >= 0; i--) {
    if (m.personnel[i].actual > 0) return m.personnel[i]
  }
  return null
}

/** Latest month with a reported uniformed deployment. */
export function latestDeployment(m: Mission): MissionDeploymentMonth | null {
  return m.deployment.length > 0 ? m.deployment[m.deployment.length - 1] : null
}

export function totalFatalities(m: Mission): {
  total: number
  malicious: number
} {
  let total = 0
  let malicious = 0
  for (const f of m.fatalities) {
    total += f.total
    malicious += f.malicious
  }
  return { total, malicious }
}

/** Latest budget year with both appropriation and expenditure reported. */
export function latestBudgetExecution(m: Mission): {
  year: string
  rate: number
} | null {
  for (let i = m.budget.length - 1; i >= 0; i--) {
    const b = m.budget[i]
    if (b.appropriation > 0 && b.expenditure > 0) {
      return { year: b.year, rate: b.expenditure / b.appropriation }
    }
  }
  return null
}

export function latestIndicators(m: Mission): MissionIndicatorPeriod | null {
  return m.indicators.length > 0 ? m.indicators[m.indicators.length - 1] : null
}

/** First year the mission existed, from the initial resolution symbol or first renewal. */
export function missionSinceYear(m: Mission): number | null {
  const fromSymbol = m.initialSymbol?.match(/\((\d{4})\)/)?.[1]
  if (fromSymbol) return Number(fromSymbol)
  if (m.renewals.length > 0) return Number(m.renewals[0].date.slice(0, 4))
  return null
}

/**
 * Split a register symbol field into individual document symbols. The DPPA
 * register occasionally packs two symbols into one field
 * ("S/RES/2333 (2016) OR S/PRST/2017/11").
 */
export function splitSymbols(symbol: string): string[] {
  return symbol
    .split(/\s+OR\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** undocs.org link for a document symbol like "S/RES/2729 (2024)". */
export function undocsUrl(symbol: string): string {
  return `https://undocs.org/${symbol.replace(/\s+/g, '')}`
}

export function formatUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${Math.round(n / 1e3)}K`
}
