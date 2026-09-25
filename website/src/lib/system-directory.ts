import { coverageClaimLabel } from '#lib/focal-point-constants'
import type {
  DirectorySummaryDesignation,
  DirectorySummaryEntity,
} from './focal-point-constants'
import type { UnSystemBody, UnSystemData, UnSystemEntity } from '@/types'

/** Display groups, not a replacement for either source's classification. */
export const SYSTEM_DIRECTORY_GROUPS = [
  { id: 'fund-programme', label: 'Funds and programmes', depth: 0 },
  { id: 'secretariat', label: 'UN Secretariat', depth: 0 },
  { id: 'departments', label: 'Departments and offices', depth: 1 },
  { id: 'offices', label: 'Offices away from headquarters', depth: 1 },
  {
    id: 'envoys',
    label: 'Special advisers, representatives and envoys',
    depth: 1,
  },
  { id: 'commissions', label: 'Regional commissions', depth: 1 },
  { id: 'specialized-agency', label: 'Specialized agencies', depth: 0 },
  { id: 'other-entity', label: 'Other UN entities', depth: 0 },
  { id: 'related-organization', label: 'Related organizations', depth: 0 },
  { id: 'conventions', label: 'Convention secretariats', depth: 1 },
  { id: 'research', label: 'Research and training', depth: 0 },
  { id: 'joint-hosted', label: 'Joint and hosted bodies', depth: 0 },
  {
    id: 'unclassified',
    label: 'Other entities — classification pending',
    depth: 0,
  },
] as const

export type SystemDirectoryGroup =
  (typeof SYSTEM_DIRECTORY_GROUPS)[number]['id']

export interface SystemDirectoryAddition {
  code: string
  name: string
  entityClass: string
}

export interface SystemDirectoryEntity {
  code: string
  name: string | null
  group: SystemDirectoryGroup
  parentCode: string | null
  /** Missing metadata is different from a verified empty list. */
  governingBodies: UnSystemBody[] | null
  system: UnSystemEntity | null
  designations: DirectorySummaryDesignation[]
}

const RESEARCH = new Set([
  'UNITAR',
  'UNU',
  'UNSSC',
  'UNIDIR',
  'UNICRI',
  'UNRISD',
])
const OTHER_ENTITIES = new Set([
  'ITC',
  'UNCTAD',
  'UNHCR',
  'UNOPS',
  'UNRWA',
  'UN Women',
  'Tech Bank',
])
const OFFICES = new Set(['UNOG', 'UNON', 'UNOV'])
const SECRETARIAT_GROUPS = new Set<SystemDirectoryGroup>([
  'departments',
  'offices',
  'envoys',
  'commissions',
])

function groupFor(
  code: string,
  system: UnSystemEntity | null,
  entityClass: string | null
): SystemDirectoryGroup {
  // Explicit reconciliation wins over the two sources' conflicting classes.
  if (code === 'UN Secretariat') return 'secretariat'
  if (code === 'UNODC') return 'departments'
  if (code === 'UNAIDS') return 'joint-hosted'
  if (code === 'UNFCCC' || code === 'UNCCD') return 'conventions'
  if (RESEARCH.has(code)) return 'research'
  if (OTHER_ENTITIES.has(code)) return 'other-entity'
  if (OFFICES.has(code)) return 'offices'
  if (system) {
    if (system.grouping === 'regional-commission') return 'commissions'
    if (system.grouping === 'secretariat') return 'departments'
    return system.grouping
  }
  switch (entityClass) {
    case 'secretariat':
      return 'departments'
    case 'special_adviser_or_envoy':
      return 'envoys'
    case 'regional_commission':
      return 'commissions'
    case 'fund_programme_institute':
      return 'other-entity'
    case 'specialized_agency':
      return 'specialized-agency'
    case 'related_organization':
      return 'related-organization'
    default:
      return 'unclassified'
  }
}

/** Join by entity code, never by fuzzy names or by coverage claims. */
export function buildSystemDirectory(
  data: UnSystemData,
  additions: SystemDirectoryAddition[],
  designations: DirectorySummaryDesignation[]
): SystemDirectoryEntity[] {
  const entities = new Map<string, SystemDirectoryEntity>()
  const add = (
    entity: DirectorySummaryEntity,
    system: UnSystemEntity | null
  ) => {
    if (!entity.code) return
    const group = groupFor(entity.code, system, entity.entityClass)
    entities.set(entity.code, {
      code: entity.code,
      name: entity.name,
      group,
      parentCode: SECRETARIAT_GROUPS.has(group) ? 'UN Secretariat' : null,
      governingBodies:
        system?.governingBodies.map((entry) => {
          if (!('ref' in entry)) return entry
          const body = data.bodies[entry.ref]
          if (!body) throw new Error(`Unknown governing body: ${entry.ref}`)
          return body
        }) ?? null,
      system,
      designations: [],
    })
  }
  for (const system of data.organizations) {
    add({ code: system.code, name: system.name, entityClass: null }, system)
  }
  for (const entity of additions) {
    if (!entities.has(entity.code)) add(entity, null)
  }
  for (const designation of designations) {
    const code = designation.entity.code
    // The public query excludes off-roster submissions. Never invent an ID
    // or promote an unmatched submission into the canonical roster.
    if (!code) continue
    if (!entities.has(code)) add(designation.entity, null)
    entities.get(code)!.designations.push(designation)
  }
  const order = new Map(
    SYSTEM_DIRECTORY_GROUPS.map((group, index) => [group.id, index])
  )
  return [...entities.values()].sort(
    (a, b) =>
      order.get(a.group)! - order.get(b.group)! || a.code.localeCompare(b.code)
  )
}

export function filterSystemDirectory(
  entities: SystemDirectoryEntity[],
  query: string
): SystemDirectoryEntity[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return entities
  const matches = entities.filter((entity) => {
    const system = entity.system
    const group = SYSTEM_DIRECTORY_GROUPS.find(
      (group) => group.id === entity.group
    )!
    return [
      entity.code,
      entity.name,
      group.label,
      entity.parentCode,
      system?.note,
      system?.registryNote,
      ...(entity.governingBodies?.flatMap((body) => [
        body.name,
        body.note,
        ...(body.contacts?.flatMap((contact) => [
          contact.label,
          contact.email,
          contact.url,
        ]) ?? []),
      ]) ?? []),
      ...(system?.mandateRegistry.map((registry) => registry.name) ?? []),
      ...(system?.resources.map((resource) => resource.name) ?? []),
      ...entity.designations.flatMap((designation) => [
        designation.subUnit,
        designation.functionalMailbox,
        ...designation.contacts.flatMap((contact) => [
          contact.name,
          contact.title,
          contact.email,
          contact.telephone,
          contact.telephoneExtension,
          ...(contact.workingLanguages ?? []),
        ]),
        ...designation.coverage.map(coverageClaimLabel),
      ]),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })
  // Keep the actual parent row when a Secretariat child matches a search.
  const visible = new Set(
    matches.flatMap((entity) => [entity.code, entity.parentCode])
  )
  return entities.filter((entity) => visible.has(entity.code))
}

/** Initially this means the blue registry links already published on /system. */
export function documentRegistryLinks(entity: SystemDirectoryEntity) {
  return [
    ...(entity.system?.mandateRegistry ?? []),
    ...(entity.system?.resources.filter((resource) => resource.prominent) ??
      []),
  ]
}
