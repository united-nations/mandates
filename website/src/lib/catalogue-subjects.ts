import type { SubjectDomain } from '@/types'

/** One subject filter, retaining every domain placement in the hierarchy. */
export interface CatalogueSubject {
  subject: string
  count: number
  domainCodes: string[]
}

/** Collapse placements before searching, sorting or limiting the flat list. */
export function getCatalogueSubjects(
  domains: SubjectDomain[]
): CatalogueSubject[] {
  const subjects = new Map<string, CatalogueSubject>()
  for (const domain of domains) {
    const leaves = [
      ...domain.directSubjects,
      ...domain.subdomains.flatMap((subdomain) => subdomain.subjects),
    ]
    for (const leaf of leaves) {
      const key = leaf.subject.trim().toUpperCase()
      const existing = subjects.get(key)
      if (!existing) {
        subjects.set(key, {
          subject: leaf.subject.trim(),
          count: leaf.count,
          domainCodes: [domain.code],
        })
        continue
      }
      // Each placement counts the same distinct documents. Summing would
      // count them twice; disagreement means the hierarchy is inconsistent.
      if (existing.count !== leaf.count) {
        throw new Error(`Inconsistent catalogue counts for subject ${key}`)
      }
      if (!existing.domainCodes.includes(domain.code)) {
        existing.domainCodes.push(domain.code)
      }
    }
  }
  return [...subjects.values()]
}
