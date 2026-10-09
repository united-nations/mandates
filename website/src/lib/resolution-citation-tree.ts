import type { DetailBudgetLocation, Entity, Mandate } from '../types/index'
import type { EntityProgrammeRow } from './entities-programmes-tree'
import { citationScope, citationScopeKey } from '#lib/citation-budget-location'
import { explainerTexts } from '#lib/en_text_contents'
import { BUDGET_STREAM_LABELS } from '#lib/filter-constants'

export interface ResolutionCitationRow {
  id: string
  label: string
  count: number | null
  location: DetailBudgetLocation
  financialId?: string
  financial: boolean
}
export interface ResolutionCitationEntity {
  id: string
  entity: string
  entityLong?: string
  programmeLabels: string[]
  count: number | null
  expandable: boolean
  children: ResolutionCitationRow[]
}

/** Two levels, conserving all distinct locations and the union of citing entities. */
export function buildResolutionCitationTree(
  mandate: Mandate,
  entities: Entity[]
) {
  const names = new Map(entities.map((e) => [e.entity, e.entity_long]))
  const sites =
    mandate.detail_budget_locations ?? mandate.budget_locations ?? []
  const codes = new Set(
    mandate.citation_info.map((c) => c.entity).filter(Boolean)
  )
  for (const site of sites) if (site.entity) codes.add(site.entity)
  const financialRows = new Map<string, EntityProgrammeRow>()
  const text = explainerTexts.mandateDetail.citationCounts
  const tree: ResolutionCitationEntity[] = [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((entity) => {
      const seen = new Map<string, DetailBudgetLocation>()
      for (const location of sites)
        if (location.entity === entity)
          seen.set(citationScopeKey(citationScope(location)), location)
      const locations = [...seen.values()]
      const sections = new Set(
        locations.map((l) => `${l.stream}/${l.part}/${l.section}`)
      )
      const children = locations.map((location) => {
        const scope = citationScope(location)
        const id = citationScopeKey(scope)
        const financial = !!scope.subprogramme || scope.stream === 'pko'
        let financialId: string | undefined
        if (scope.stream === 'ppb' && scope.part && scope.section) {
          const path = [
            'stream',
            'ppb',
            'part',
            scope.part,
            'section',
            scope.section,
            'entity',
            entity,
          ]
          const parentId = JSON.stringify(path)
          financialRows.set(parentId, {
            id: parentId,
            kind: 'entity',
            depth: 0,
            label: entity,
            count: 0,
            hasChildren: true,
          })
          if (scope.subprogramme) {
            financialId = JSON.stringify([
              ...path,
              'subprogramme',
              JSON.stringify([scope.number, scope.subprogramme]),
            ])
            financialRows.set(financialId, {
              id: financialId,
              parentId,
              kind: 'subprogramme',
              depth: 1,
              label: scope.subprogramme,
              count: 0,
              hasChildren: false,
            })
          }
        } else if (scope.stream === 'pko') {
          financialId = JSON.stringify([
            'stream',
            'pko',
            'group',
            scope.support ? 'support' : 'missions',
            'entity',
            entity,
          ])
          financialRows.set(financialId, {
            id: financialId,
            kind: 'entity',
            depth: 0,
            label: entity,
            count: 0,
            hasChildren: false,
          })
        }
        const section = scope.section
          ? `${explainerTexts.entitiesAndProgrammes.section} ${scope.section}`
          : ''
        const subprogramme = scope.subprogramme
          ? scope.number !== null &&
            !/^Sub-?programme\s/i.test(scope.subprogramme)
            ? `${explainerTexts.entitiesAndProgrammes.subprogramme} ${scope.number}: ${scope.subprogramme}`
            : scope.subprogramme
          : null
        const label = subprogramme
          ? [subprogramme, sections.size > 1 ? section : '']
              .filter(Boolean)
              .join(' · ')
          : scope.stream === 'ppb'
            ? [text.general, section, location.section_title]
                .filter(Boolean)
                .join(' · ')
            : [
                scope.stream
                  ? BUDGET_STREAM_LABELS[scope.stream]
                  : text.noLocation,
                section,
                location.section_title,
              ]
                .filter(Boolean)
                .join(' · ')
        return {
          id,
          label,
          count: location.total_citations_at_location ?? null,
          location,
          financialId,
          financial,
        }
      })
      return {
        id: JSON.stringify(['entity', entity]),
        entity,
        programmeLabels: [
          ...new Set(
            locations.flatMap((location) => {
              if (location.programme === null && !location.programme_title) {
                if (!location.section && !location.section_title) return []
                return [
                  [
                    [
                      explainerTexts.entitiesAndProgrammes.section,
                      location.section,
                    ]
                      .filter(Boolean)
                      .join(' '),
                    location.section_title,
                  ]
                    .filter(Boolean)
                    .join(': '),
                ]
              }
              return [
                [
                  location.programme === null
                    ? explainerTexts.entitiesAndProgrammes.programme
                    : `${explainerTexts.entitiesAndProgrammes.programme} ${location.programme}`,
                  location.programme_title,
                ]
                  .filter(Boolean)
                  .join(': '),
              ]
            })
          ),
        ],
        entityLong:
          names.get(entity) ??
          locations[0]?.entity_long ??
          mandate.citation_info.find((c) => c.entity === entity)?.entity_long,
        count: mandate.citation_entity_totals?.[entity] ?? null,
        expandable: children.some(
          (child) => citationScope(child.location).subprogramme !== null
        ),
        children,
      }
    })
  const expected = new Set(
    sites.filter((l) => l.entity).map((l) => citationScopeKey(citationScope(l)))
  )
  const actual = tree.flatMap((e) => e.children.map((c) => c.id))
  if (actual.length !== expected.size || actual.some((id) => !expected.has(id)))
    throw new Error('Resolution citation locations were lost or duplicated')
  return { tree, financialRows: [...financialRows.values()] }
}

export function resolutionCitationHref(id: string, version?: string) {
  const params = new URLSearchParams({ budget_location: id })
  if (version) params.set('ppb_version', version)
  return `/secretariat?${params}`
}
