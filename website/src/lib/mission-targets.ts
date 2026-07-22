import rawTargets from '@/data/mission-targets.json'

/**
 * Semantic classification of the UN Peace & Security Data Hub `dos-indicators`
 * results-based-budgeting (RBB) performance indicators into
 * met / partially met / not met / not assessable.
 *
 * Built by `data-processing/scripts/classify_mission_targets.py`. Each indicator
 * family is assigned a semantic direction (higher-is-better / lower-is-better /
 * in-band) from its wording; each record is then graded on its direction-aware
 * distance from the planned target, with a reason grounded in the actual
 * planned-vs-actual numbers. See docs/lens-impact/ANALYSIS.md.
 */

export type TargetStatus = 'met' | 'partial' | 'not_met' | 'not_assessable'

export interface TargetRecord {
  id: number
  indicator: string
  desc: string
  value: number | null
  target: number | null
  target2: number | null
  status: TargetStatus
  reason: string
  official: boolean
}

interface RawTargets {
  generated: string
  method: string
  statusTally: Record<string, number>
  missions: Record<string, Record<string, TargetRecord[]>>
}

const data = rawTargets as unknown as RawTargets

export const STATUS_META: Record<
  TargetStatus,
  { label: string; color: string; order: number }
> = {
  met: { label: 'Met', color: 'var(--color-un-blue)', order: 2 },
  partial: { label: 'Partially met', color: 'var(--color-tier-2)', order: 1 },
  not_met: { label: 'Not met', color: 'var(--color-au-chico)', order: 0 },
  not_assessable: {
    label: 'Not assessable',
    color: 'var(--color-trout)',
    order: 3,
  },
}

export interface MissionTargetPeriod {
  period: string
  records: TargetRecord[]
  counts: Record<TargetStatus, number>
}

function countStatuses(records: TargetRecord[]): Record<TargetStatus, number> {
  const c: Record<TargetStatus, number> = {
    met: 0,
    partial: 0,
    not_met: 0,
    not_assessable: 0,
  }
  for (const r of records) c[r.status]++
  return c
}

/** Latest RBB period for a mission (by acronym), with its classified targets. */
export function latestTargetPeriod(
  acronym: string
): MissionTargetPeriod | null {
  const periods = data.missions[acronym]
  if (!periods) return null
  const keys = Object.keys(periods).sort()
  const period = keys[keys.length - 1]
  const records = periods[period]
  return { period, records, counts: countStatuses(records) }
}

/** All periods for a mission, newest last. */
export function allTargetPeriods(acronym: string): MissionTargetPeriod[] {
  const periods = data.missions[acronym]
  if (!periods) return []
  return Object.keys(periods)
    .sort()
    .map((period) => ({
      period,
      records: periods[period],
      counts: countStatuses(periods[period]),
    }))
}

export function targetsGenerated(): string {
  return data.generated
}

export function targetsStatusTally(): Record<string, number> {
  return data.statusTally
}
