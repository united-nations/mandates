'use client'

import { useMemo, useState } from 'react'

import { useFilters } from '@/contexts/FilterContext'
import { useCrossPageFilters } from '@/hooks/use-cross-page-filters'
import { sequentialColor, tint } from '@/lib/heatmap/color-scale'
import {
  CURATED_ENTITIES,
  SECTION_META,
  SECTION_ORDER,
  CROSS_SECTION_COLOR,
  type Section,
} from '@/lib/heatmap/entity-sections'
import { pairKey, type CoCitationMatrix } from '@/lib/heatmap/matrix'

const CELL = 24
const COLHEAD_H = 84 // top label gutter height
const LABEL_W = COLHEAD_H // left label gutter width — kept equal to the header height
const GAMMA = 0.5 // sqrt transfer; matches the reference figure's saturation

interface OrderedEntity {
  code: string
  label: string
  section: Section
}

/**
 * Entity × Entity co-citation heatmap for the /secretariat "Co-citations
 * between entities" card. Each cell(A, B) is the number of mandate documents
 * cited by BOTH Secretariat entities A and B in the selected budget version.
 *
 * Clicking a cell sets the two-entity AND filter (`entity` + `crossCitingEntity`)
 * and scrolls to the mandate list below, which then shows exactly the mandates
 * the two entities share. The clicked cell stays outlined because selection is
 * derived from the active URL filters.
 *
 * This is the pared-down, single-version (ppb2027) port of the housekeeping
 * platform's analysis heatmap: no layer switcher, entity picker, appearance
 * controls, or comparison/decision layers — just the figure.
 */
export function CoCitationHeatmap({ matrix }: { matrix: CoCitationMatrix }) {
  const { filters } = useFilters()
  const applyFilters = useCrossPageFilters()
  const [hover, setHover] = useState<{
    a: OrderedEntity
    b: OrderedEntity
    value: number
  } | null>(null)

  // The curated figure entities that actually have data in this version,
  // grouped and ordered by section then curated order. Entities with no
  // citations are dropped so no fully-empty rows appear.
  const entities = useMemo<OrderedEntity[]>(() => {
    const present = new Set(matrix.entities)
    return CURATED_ENTITIES.filter((e) => present.has(e.code)).map((e) => ({
      code: e.code,
      label: e.label,
      section: e.section,
    }))
  }, [matrix])

  // Sequential scale reference, normalised PER colour group — each section
  // block against its own max, cross-section cells against theirs — so smaller
  // clusters stay vivid instead of being washed out by Development's large
  // counts (matches the reference figure's per-block saturation).
  const scaleRef = useMemo(() => {
    const perSection: Record<string, number> = {}
    let cross = 0
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i]
        const b = entities[j]
        const v = matrix.pairs[pairKey(a.code, b.code)] ?? 0
        if (a.section === b.section) {
          perSection[a.section] = Math.max(perSection[a.section] ?? 0, v)
        } else {
          cross = Math.max(cross, v)
        }
      }
    }
    return { perSection, cross }
  }, [entities, matrix])

  // Contiguous section runs for the band header.
  const bands = useMemo(() => {
    const runs: { section: Section; count: number }[] = []
    for (const e of entities) {
      const last = runs[runs.length - 1]
      if (last && last.section === e.section) last.count++
      else runs.push({ section: e.section, count: 1 })
    }
    return runs
  }, [entities])

  const sectionColor = (s: Section) =>
    s === 'other' ? CROSS_SECTION_COLOR : SECTION_META[s].baseColor
  const tintFor = (s: Section) => tint(sectionColor(s))

  function cellColor(a: OrderedEntity, b: OrderedEntity, value: number) {
    const sameSection = a.section === b.section
    const base = sameSection ? sectionColor(a.section) : CROSS_SECTION_COLOR
    const max = sameSection
      ? (scaleRef.perSection[a.section] ?? 0)
      : scaleRef.cross
    return sequentialColor(value, max, base, GAMMA)
  }

  // Order-independent selection derived from the active filters, so the clicked
  // pair stays highlighted after the URL updates.
  const selectedKey =
    filters.entity && filters.crossCitingEntity
      ? pairKey(filters.entity, filters.crossCitingEntity)
      : null

  function selectPair(a: OrderedEntity, b: OrderedEntity) {
    applyFilters({
      entity: a.code,
      crossCitingEntity: b.code,
      // Reset pagination; setMultipleFilters does not do this on its own.
      page: undefined,
    })
    // Router pushes with scroll:false, so scroll to the mandate list ourselves.
    document
      .getElementById('mandates')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const legendItems = [
    ...SECTION_ORDER.filter((s) => bands.some((b) => b.section === s)).map(
      (s) => ({ color: sectionColor(s), label: SECTION_META[s].label })
    ),
    { color: CROSS_SECTION_COLOR, label: 'Cross-section' },
  ]

  return (
    <div>
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Each square counts the mandate documents cited by both entities. Click a
        square to filter the mandates below to the ones the two entities share.
      </p>

      {/* Hover status bar */}
      <div className="mb-2 h-5 text-xs text-muted-foreground">
        {hover ? (
          <span>
            <span className="font-medium text-foreground">{hover.a.label}</span>
            {' ↔ '}
            <span className="font-medium text-foreground">{hover.b.label}</span>
            {' — '}
            {`${hover.value} shared mandate${hover.value === 1 ? '' : 's'}`}
          </span>
        ) : (
          <span className="text-muted-foreground">Hover a cell for details</span>
        )}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto pb-4">
        <div className="inline-block select-none">
          {/* Section bands — coloured underline spans the section's columns; the
              centred label may overflow (never truncated) into empty space. */}
          <div
            className="relative flex items-end"
            style={{ marginLeft: LABEL_W, height: 40 }}
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
                    className="absolute bottom-1 left-0 w-full text-center text-xs leading-[1.05] font-semibold"
                    style={{ color: 'var(--foreground)', hyphens: 'manual' }}
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
              className="flex items-end justify-start pr-1 text-xs font-semibold text-muted-foreground"
              style={{ width: LABEL_W, height: COLHEAD_H }}
            >
              Cross-citation
            </div>
            {entities.map((e) => (
              <div
                key={e.code}
                className="flex items-end justify-center"
                style={{
                  width: CELL,
                  height: COLHEAD_H,
                  backgroundColor: tintFor(e.section),
                  borderRight: '1px solid color-mix(in srgb, var(--color-un-white) 70%, transparent)',
                }}
              >
                <span
                  className="py-1 text-xs text-foreground"
                  style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}
                >
                  {e.label}
                </span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {entities.map((rowE) => (
            <div key={rowE.code} className="flex items-center">
              <div
                className="truncate px-1 text-right text-xs leading-6 text-foreground"
                style={{
                  width: LABEL_W,
                  height: CELL,
                  backgroundColor: tintFor(rowE.section),
                  borderBottom: '1px solid color-mix(in srgb, var(--color-un-white) 70%, transparent)',
                }}
                title={rowE.code}
              >
                {rowE.label}
              </div>
              {entities.map((colE) => {
                const isDiagonal = rowE.code === colE.code
                const value = isDiagonal
                  ? 0
                  : (matrix.pairs[pairKey(rowE.code, colE.code)] ?? 0)
                const bg = isDiagonal ? null : cellColor(rowE, colE, value)
                const isSelected =
                  !isDiagonal && selectedKey === pairKey(rowE.code, colE.code)
                return (
                  <div
                    key={colE.code}
                    onMouseEnter={() =>
                      !isDiagonal && setHover({ a: rowE, b: colE, value })
                    }
                    onMouseLeave={() => setHover(null)}
                    onClick={() => !isDiagonal && selectPair(rowE, colE)}
                    title={
                      isDiagonal
                        ? rowE.label
                        : `${rowE.label} ↔ ${colE.label}: ${value}`
                    }
                    style={{
                      width: CELL,
                      height: CELL,
                      backgroundColor: bg ?? (isDiagonal ? 'var(--muted)' : 'var(--background)'),
                      outline: isSelected
                        ? '2px solid var(--foreground)'
                        : '0.5px solid color-mix(in srgb, var(--foreground) 4%, transparent)',
                      outlineOffset: isSelected ? '-1px' : undefined,
                      cursor: isDiagonal ? 'default' : 'pointer',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {legendItems.map((it) => (
          <span key={it.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: it.color }}
            />
            {it.label}
          </span>
        ))}
        <span className="text-muted-foreground">
          Intensity = number of shared mandates
        </span>
      </div>
    </div>
  )
}
