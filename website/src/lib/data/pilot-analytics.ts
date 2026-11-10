import 'server-only'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import original from '@/data/paragraph-pilot-analytics.json'
import type { PilotAnalytics } from '../pilot-document-analytics'

/** Completed run snapshots only; the medium export is written after processing. */
export function getPilotAnalyticsRuns(): PilotAnalytics[] {
  const runs: PilotAnalytics[] = [original as PilotAnalytics]
  const path = join(process.cwd(), 'src/data/paragraph-pilot-analytics-medium.json')
  if (existsSync(path)) {
    const medium = JSON.parse(readFileSync(path, 'utf8')) as PilotAnalytics
    if (medium.sampleHash === original.sampleHash) runs.push(medium)
  }
  return runs
}
