/**
 * Warning policy: every recorded parser problem (including uncertain markers)
 * and imported quality_* problem warns, except informational issues and source
 * checks not performed because the source was unavailable. Those are provenance
 * limitations, not evidence of an extraction defect.
 * Only this boolean leaves the server; issue details may include source paths.
 */
export function hasFulltextQualityWarning(issues: unknown): boolean {
  if (!Array.isArray(issues)) return false
  return issues.some((issue: unknown) => {
    if (!issue || typeof issue !== 'object') return false
    const record = issue as Record<string, unknown>
    if (record.severity === 'info') return false
    const problem = record.problem
    if (typeof problem !== 'string' || !problem.trim()) return false
    // An unperformed or unavailable source comparison is not an extraction defect.
    return problem !== 'source_unchecked' && problem !== 'source_unreadable'
  })
}
