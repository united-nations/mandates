'use client'

import { useMemo, useState } from 'react'

import { useFilters } from '@/contexts/FilterContext'
import { useCrossPageFilters } from '@/hooks/use-cross-page-filters'
import { sequentialColor, tint } from '@/lib/heatmap/color-scale'
import {
  CURATED_ENTITIES,
  SECTION_META,
  SECTION_ORDER,
  type Section,
} from '@/lib/heatmap/entity-sections'
import { organEntityKey, type OrganEntityMatrix } from '@/lib/heatmap/matrix'
import { ORGAN_CATEGORIES } from '@/lib/organ-groups'

const CELL = 18
const COLHEAD_H = 62 // top label gutter height (vertical entity labels)
const ROW_LABEL_W = 96 // left gutter width — organ short codes can be long
const GAMMA = 0.5 // sqrt transfer; matches the co-citation heatmap's saturation

interface Column {
  code: string
  label: string
  section: Section
}

interface OrganRow {
  code: string
  label: string
}

/**
 * Organ × Entity citation-pattern heatmap for the /secretariat "Citation
 * patterns between entities and organs" card. Each cell counts the documents
 * adopted by an organ (row) that an entity (column) cites, in the selected
 * budget version.
 *
 * Because the counts are heavily skewed (the General Assembly dwarfs every
 * other organ), intensity is normalised PER ROW — each organ against its own
 * busiest entity — so every organ's citing profile is legible instead of being
 * washed out by the GA row. Cross-row magnitude is therefore not comparable;
 * the raw count is always in the tooltip.
 *
 * Clicking a cell sets the organ + entity filters and scrolls to the mandate
 * list, which then shows exactly that organ's documents cited by that entity.
 * Columns reuse the curated entity figure; rows reuse the /organs categories.
 */
export function OrganEntityHeatmap({ matrix }: { matrix: OrganEntityMatrix }) {
  const { filters } = useFilters()
  const applyFilters = useCrossPageFilters()
  const [hover, setHover] = useState<{
    organ: OrganRow
    entity: Column
    value: number
  } | null>(null)

  const value = (organ: string, entity: string) =>
    matrix.cells[organEntityKey(organ, entity)] ?? 0

  // Columns: the curated entity figure, restricted to entities present in this
  // version, kept in curated (section-grouped) order.
  const columns = useMemo<Column[]>(() => {
    const present = new Set(matrix.entities)
    return CURATED_ENTITIES.filter((e) => present.has(e.code)).map((e) => ({
      code: e.code,
      label: e.label,
      section: e.section,
    }))
  }, [matrix])

  // Contiguous section runs for the column band header.
  const bands = useMemo(() => {
    const runs: { section: Section; count: number }[] = []
    for (const c of columns) {
      const last = runs[runs.length - 1]
      if (last && last.section === c.section) last.count++
      else runs.push({ section: c.section, count: 1 })
    }
    return runs
  }, [columns])

  // Rows grouped by /organs category, folding any uncategorised organ into the
  // category flagged as the catch-all — mirrors getOrganHierarchy. Organs and
  // whole groups with no citations among the shown columns are dropped so no
  // empty rows appear.
  const rowGroups = useMemo(() => {
    const present = new Set(matrix.organs)
    const listed = new Set(ORGAN_CATEGORIES.flatMap((c) => c.organs))
    const hasData = (organ: string) =>
      columns.some((c) => value(organ, c.code) > 0)

    return ORGAN_CATEGORIES.map((cat) => {
      const members = cat.organs.filter((s) => present.has(s))
      if (cat.isCatchAll) {
        for (const s of matrix.organs) if (!listed.has(s)) members.push(s)
      }
      return {
        id: cat.id,
        label: cat.label,
        organs: members.filter(hasData).map<OrganRow>((code) => ({
          code,
          label: matrix.organLabels[code] ?? code,
        })),
      }
    }).filter((g) => g.organs.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, columns])

  // Per-organ-row maximum over the shown columns, for row-relative intensity.
  const rowMax = useMemo(() => {
    const m: Record<string, number> = {}
    for (const g of rowGroups) {
      for (const o of g.organs) {
        let mx = 0
        for (const c of columns) mx = Math.max(mx, value(o.code, c.code))
        m[o.code] = mx
      }
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowGroups, columns])

  const sectionColor = (s: Section) => SECTION_META[s].baseColor
  const tintFor = (s: Section) => tint(sectionColor(s))

  // Order-independent selection derived from the active filters, so the clicked
  // cell stays highlighted after the URL updates.
  const selectedOrgan = filters.organ ?? null
  const selectedEntity = filters.entity ?? null

  function selectCell(organ: string, entity: string) {
    applyFilters({
      organ,
      entity,
      // Drop the entity co-citation partner so the two facets don't stack.
      crossCitingEntity: undefined,
      // Reset pagination; setMultipleFilters does not do this on its own.
      page: undefined,
    })
    document
      .getElementById('mandates')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const legendItems = [
    ...SECTION_ORDER.filter((s) => bands.some((b) => b.section === s)).map(
      (s) => ({ color: sectionColor(s), label: SECTION_META[s].label })
    ),
  ]

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-gray-500">
        Each square counts the documents adopted by an organ (row) that an
        entity (column) cites. Click a square to filter the mandates below to
        that organ and entity. Colour intensity is scaled within each row, so an
        organ&rsquo;s busiest entity is always fully saturated.
      </p>

      {/* Hover status bar */}
      <div className="mb-2 h-5 text-xs text-gray-600">
        {hover ? (
          <span>
            <span className="font-medium text-gray-900">
              {hover.entity.label}
            </span>
            {' cites '}
            <span className="font-medium text-gray-900">
              {hover.organ.label}
            </span>
            {' — '}
            {`${hover.value} document${hover.value === 1 ? '' : 's'}`}
          </span>
        ) : (
          <span className="text-gray-400">Hover a cell for details</span>
        )}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-block select-none">
          {/* Column section bands */}
          <div
            className="relative flex items-end"
            style={{ marginLeft: ROW_LABEL_W, height: 30 }}
          >
            {bands.map((b, i) => {
              const bc = sectionColor(b.section)
              return (
                <div
                  key={i}
                  className="relative h-full"
                  style={{ width: b.count * CELL }}
                >
                  <span
                    className="absolute bottom-1 left-0 w-full text-center text-[11px] leading-[1.05] font-semibold"
                    style={{ color: bc, hyphens: 'manual' }}
                  >
                    {SECTION_META[b.section].label}
                  </span>
                  <div
                    className="absolute bottom-0 left-0 w-full border-b-2"
                    style={{ borderColor: bc }}
                  />
                </div>
              )
            })}
          </div>

          {/* Column labels */}
          <div className="flex items-end">
            <div
              className="flex items-end justify-start pr-1 text-[10px] font-semibold text-gray-500"
              style={{ width: ROW_LABEL_W, height: COLHEAD_H }}
            >
              Organ&nbsp;↓ / Entity&nbsp;→
            </div>
            {columns.map((c) => (
              <div
                key={c.code}
                className="flex items-end justify-center"
                style={{
                  width: CELL,
                  height: COLHEAD_H,
                  backgroundColor: tintFor(c.section),
                  borderRight: '1px solid rgba(255,255,255,0.7)',
                }}
              >
                <span
                  className="py-1 text-[10px] text-gray-700"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  {c.label}
                </span>
              </div>
            ))}
          </div>

          {/* Row groups */}
          {rowGroups.map((g) => (
            <div key={g.id}>
              <div
                className="border-b border-gray-100 pt-2 pb-0.5 pl-0.5 text-[11px] font-semibold text-gray-400"
                style={{ width: ROW_LABEL_W + columns.length * CELL }}
              >
                {g.label}
              </div>
              {g.organs.map((organ) => (
                <div key={organ.code} className="flex items-center">
                  <div
                    className="truncate px-1 text-right text-[10px] text-gray-700"
                    style={{ width: ROW_LABEL_W, height: CELL }}
                    title={organ.label}
                  >
                    {organ.code}
                  </div>
                  {columns.map((c) => {
                    const v = value(organ.code, c.code)
                    const bg = sequentialColor(
                      v,
                      rowMax[organ.code] ?? 0,
                      sectionColor(c.section),
                      GAMMA
                    )
                    const isSelected =
                      selectedOrgan === organ.code && selectedEntity === c.code
                    return (
                      <div
                        key={c.code}
                        onMouseEnter={() =>
                          setHover({ organ, entity: c, value: v })
                        }
                        onMouseLeave={() => setHover(null)}
                        onClick={() => selectCell(organ.code, c.code)}
                        title={`${c.label} cites ${organ.label}: ${v}`}
                        style={{
                          width: CELL,
                          height: CELL,
                          backgroundColor: bg ?? '#fff',
                          outline: isSelected
                            ? '2px solid #111827'
                            : '0.5px solid rgba(0,0,0,0.04)',
                          outlineOffset: isSelected ? '-1px' : undefined,
                          cursor: 'pointer',
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-gray-600">
        {legendItems.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: it.color }}
            />
            {it.label}
          </span>
        ))}
        <span className="text-gray-400">
          Intensity = citations, relative within each organ row
        </span>
      </div>
    </div>
  )
}
