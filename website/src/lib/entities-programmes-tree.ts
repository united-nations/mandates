import type { BudgetEntityNode, BudgetStream } from '../types/index'
import { explainerTexts } from '#lib/en_text_contents'

type Kind = 'stream' | 'part' | 'section' | 'group' | 'entity' | 'subprogramme'
export interface EntityProgrammeRow {
  id: string
  parentId?: string
  depth: number
  kind: Kind
  label: string
  detail?: string
  count: number
  entityCode?: string
  hasChildren: boolean
}

/** Lossless preorder projection: identity includes every ancestor and node kind. */
export function buildEntitiesProgrammesRows(
  streams: BudgetStream[]
): EntityProgrammeRow[] {
  const rows: EntityProgrammeRow[] = []
  const text = explainerTexts.entitiesAndProgrammes
  const add = (
    path: string[],
    kind: Kind,
    key: string,
    label: string,
    count: number,
    hasChildren: boolean,
    detail?: string,
    entityCode?: string
  ) => {
    const next = [...path, kind, key]
    rows.push({
      id: JSON.stringify(next),
      parentId: path.length ? JSON.stringify(path) : undefined,
      depth: path.length / 2,
      kind,
      label,
      count,
      hasChildren,
      detail,
      entityCode,
    })
    return next
  }
  const entity = (path: string[], node: BudgetEntityNode) => {
    const next = add(
      path,
      'entity',
      node.entity,
      node.entity,
      node.count,
      node.subprogrammes.length > 0,
      node.entity_long ?? undefined,
      node.entity
    )
    for (const sp of node.subprogrammes) {
      add(
        next,
        'subprogramme',
        JSON.stringify([sp.number, sp.subprogramme]),
        sp.number === null
          ? sp.subprogramme
          : `${text.subprogramme} ${sp.number}${sp.subprogramme.replace(/^Sub-?programme\s+[\dA-Z]+\.?\s*/i, '') ? `: ${sp.subprogramme.replace(/^Sub-?programme\s+[\dA-Z]+\.?\s*/i, '')}` : ''}`,
        sp.count,
        false
      )
    }
  }
  let expected = 0
  for (const stream of streams) {
    expected++
    const children =
      stream.type === 'ppb'
        ? stream.parts
        : stream.type === 'pko'
          ? stream.groups
          : []
    const root = add(
      [],
      'stream',
      stream.type,
      stream.label,
      stream.count,
      children.length > 0
    )
    if (stream.type === 'ppb')
      for (const part of stream.parts) {
        expected +=
          1 +
          part.sections.reduce(
            (n, section) =>
              n +
              1 +
              section.entities.reduce(
                (m, e) => m + 1 + e.subprogrammes.length,
                0
              ),
            0
          )
        const p = add(
          root,
          'part',
          part.part,
          `${text.part} ${part.part}: ${part.part_title}`,
          part.count,
          part.sections.length > 0
        )
        for (const section of part.sections) {
          const s = add(
            p,
            'section',
            section.section,
            `${text.section} ${section.section}: ${section.section_title}`,
            section.count,
            section.entities.length > 0,
            section.programme === null
              ? (section.programme_title ?? undefined)
              : `${text.programme} ${section.programme}${section.programme_title ? `: ${section.programme_title}` : ''}`
          )
          for (const e of section.entities) entity(s, e)
        }
      }
    if (stream.type === 'pko')
      for (const group of stream.groups) {
        expected +=
          1 + group.entities.reduce((n, e) => n + 1 + e.subprogrammes.length, 0)
        const g = add(
          root,
          'group',
          group.group,
          group.label,
          group.count,
          group.entities.length > 0
        )
        for (const e of group.entities) entity(g, e)
      }
  }
  const ids = new Set(rows.map((row) => row.id))
  if (
    rows.length !== expected ||
    ids.size !== expected ||
    rows.some(
      (row) =>
        (row.parentId !== undefined && !ids.has(row.parentId)) ||
        (row.entityCode !== undefined && row.kind !== 'entity')
    )
  ) {
    throw new Error(
      'Budget hierarchy projection lost nodes or produced invalid identities/attribution'
    )
  }
  return rows
}
