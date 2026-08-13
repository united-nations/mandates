'use client'

import { geoNaturalEarth1, geoPath, type GeoPermissibleObjects } from 'd3-geo'
import { useMemo, useState } from 'react'
import { feature } from 'topojson-client'

import attentionData from '@/data/country-attention.json'
import worldTopo from '@/data/countries-110m.json'

// Minimal shape of the world-atlas topology we consume (avoids a dependency on
// the unpublished `topojson-specification` types).
interface WorldTopology {
  type: 'Topology'
  objects: { countries: Parameters<typeof feature>[1] }
  arcs: unknown
  transform?: unknown
}

// ---------------------------------------------------------------------------
// Types for the precomputed dataset (see data-processing/scripts/build_country_attention.py)
// ---------------------------------------------------------------------------
interface CountryRec {
  iso3: string
  name: string
  all: number
  mandate: number
  decades: Record<string, [number, number]>
  topSubjects: { subject: string; n: number }[]
}
interface AttentionData {
  meta: {
    totalDocs: number
    totalMandateDocs: number
    docsWithCountry: number
    distinctCountriesMentioned: number
    geoSubjectsMapped: number
    geoOccurrencesMapped: number
    geoOccurrencesTotal: number
  }
  countries: Record<string, CountryRec>
  neverMentioned: string[]
  leastMentioned: { name: string; all: number }[]
}

const DATA = attentionData as unknown as AttentionData

type Mode = 'all' | 'mandate'
type Era = 'alltime' | 'pre1990' | '1990s' | '2000s' | '2010s' | '2020s'

const ERAS: { id: Era; label: string; short: string; decades: number[] }[] = [
  { id: 'alltime', label: 'All years', short: 'All', decades: [] },
  {
    id: 'pre1990',
    label: 'Cold War (pre-1990)',
    short: '–1989',
    decades: [1940, 1950, 1960, 1970, 1980],
  },
  { id: '1990s', label: '1990s', short: "'90s", decades: [1990] },
  { id: '2000s', label: '2000s', short: "'00s", decades: [2000] },
  { id: '2010s', label: '2010s', short: "'10s", decades: [2010] },
  { id: '2020s', label: 'Since 2020', short: "'20s", decades: [2020] },
]

// Sequential un-blue ramp, light -> deep. Index 0 is the "zero mentions" shade
// (a neutral blue-grey, deliberately distinct from the palest data blue).
const ZERO_FILL = '#e9edf0'
const NODATA_FILL = '#f4f6f7'
const RAMP = [
  '#d5ebfa', // 1
  '#a9d8f4', // 2
  '#6dbfe9', // 3
  '#009edb', // 4  (UN blue)
  '#0082ba', // 5
  '#005f8a', // 6
  '#003f5e', // 7
]

// A "nice" ascending 1-2-5 ladder to draw log-friendly class bounds from
// (round numbers only, so the legend never shows an awkward singleton class).
const NICE = [2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000]

/** Pick 7 ascending upper-bounds <= max, roughly log-spaced, for the classes. */
function makeBounds(max: number): number[] {
  const usable = NICE.filter((n) => n < max)
  if (usable.length <= 7) return usable
  const step = usable.length / 7
  const out: number[] = []
  for (let i = 0; i < 7; i++) out.push(usable[Math.floor(i * step)])
  return Array.from(new Set(out))
}

/** Class index 0..len for a value given upper-bounds (value must be > 0). */
function classOf(value: number, bounds: number[]): number {
  for (let i = 0; i < bounds.length; i++) if (value <= bounds[i]) return i
  return bounds.length
}

export function CountryAttentionMap({
  initialMode = 'all',
  initialEra = 'alltime',
}: {
  initialMode?: Mode
  initialEra?: Era
} = {}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [era, setEra] = useState<Era>(initialEra)
  const [hover, setHover] = useState<{
    ccn3: string
    x: number
    y: number
  } | null>(null)

  // value(ccn3) for the active mode + era, reading from totals or decade buckets.
  const valueFor = useMemo(() => {
    const eraDef = ERAS.find((e) => e.id === era)!
    const idx = mode === 'all' ? 0 : 1
    return (rec: CountryRec | undefined): number => {
      if (!rec) return -1 // no record at all -> no data
      if (era === 'alltime') return mode === 'all' ? rec.all : rec.mandate
      let sum = 0
      for (const d of eraDef.decades) {
        const b = rec.decades[String(d)]
        if (b) sum += b[idx]
      }
      return sum
    }
  }, [mode, era])

  // Projected country paths (Antarctica dropped so the inhabited world fills the frame).
  const { paths } = useMemo(() => {
    const topo = worldTopo as unknown as WorldTopology
    const fc = feature(
      topo as Parameters<typeof feature>[0],
      topo.objects.countries
    ) as unknown as GeoJSON.FeatureCollection
    const feats = fc.features.filter(
      (f) => String(f.id) !== '010' /* Antarctica */
    )
    const projection = geoNaturalEarth1().fitExtent(
      [
        [4, 4],
        [976, 476],
      ],
      { type: 'FeatureCollection', features: feats } as GeoPermissibleObjects
    )
    const gen = geoPath(projection)
    return {
      paths: feats.map((f) => ({
        ccn3: String(f.id),
        d: gen(f as GeoPermissibleObjects) ?? '',
      })),
    }
  }, [])

  // Max over CURRENTLY-VISIBLE values -> class bounds.
  const bounds = useMemo(() => {
    let m = 0
    for (const ccn3 of Object.keys(DATA.countries)) {
      const v = valueFor(DATA.countries[ccn3])
      if (v > m) m = v
    }
    return makeBounds(m)
  }, [valueFor])

  function fillFor(ccn3: string): string {
    const rec = DATA.countries[ccn3]
    const v = valueFor(rec)
    if (v < 0) return NODATA_FILL
    if (v === 0) return ZERO_FILL
    return RAMP[classOf(v, bounds)]
  }

  // Ranked list for the active mode + era (the companion bar list).
  const ranked = useMemo(() => {
    return Object.values(DATA.countries)
      .map((rec) => ({ rec, v: valueFor(rec) }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v)
  }, [valueFor])

  const top20 = ranked.slice(0, 20)
  const rankedMax = top20.length ? top20[0].v : 1

  const hoveredRec = hover ? DATA.countries[hover.ccn3] : null
  const hoveredVal = hoveredRec ? valueFor(hoveredRec) : -1

  // Legend classes with human-readable ranges.
  const legendClasses = useMemo(() => {
    const items: { fill: string; label: string }[] = [
      { fill: ZERO_FILL, label: '0' },
    ]
    let lo = 1
    for (let i = 0; i < bounds.length; i++) {
      const hi = bounds[i]
      items.push({ fill: RAMP[i], label: lo === hi ? `${lo}` : `${lo}–${hi}` })
      lo = hi + 1
    }
    items.push({ fill: RAMP[bounds.length], label: `${lo}+` })
    return items
  }, [bounds])

  const modeNoun = mode === 'all' ? 'resolutions' : 'mandate resolutions'

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-gray-500">
        Every country is shaded by how many UN {modeNoun} name it as a subject.
        Attention is extremely uneven: a handful of conflict files dominate the
        agenda while dozens of member states are barely mentioned at all.
      </p>

      {/* Controls */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-xs">
          {(['all', 'mandate'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                mode === m
                  ? 'bg-un-blue/10 text-un-blue'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {m === 'all' ? 'All resolutions' : 'Mandate resolutions'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {ERAS.map((e) => (
            <button
              key={e.id}
              onClick={() => setEra(e.id)}
              title={e.label}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                era === e.id
                  ? 'bg-un-blue/10 text-un-blue'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {e.short}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="relative w-full overflow-hidden rounded-lg bg-[#f4f6f7]">
        <svg
          viewBox="0 0 980 480"
          className="block h-auto w-full"
          role="img"
          aria-label={`World map: number of UN ${modeNoun} about each country`}
        >
          {paths.map((p) => {
            const rec = DATA.countries[p.ccn3]
            const isHover = hover?.ccn3 === p.ccn3
            return (
              <path
                key={p.ccn3 + p.d.slice(0, 8)}
                data-ccn3={p.ccn3}
                d={p.d}
                fill={fillFor(p.ccn3)}
                stroke={isHover ? '#111827' : '#ffffff'}
                strokeWidth={isHover ? 1 : 0.4}
                onMouseEnter={(ev) =>
                  rec &&
                  setHover({
                    ccn3: p.ccn3,
                    x: ev.nativeEvent.offsetX,
                    y: ev.nativeEvent.offsetY,
                  })
                }
                onMouseMove={(ev) =>
                  rec &&
                  setHover((h) =>
                    h
                      ? {
                          ...h,
                          x: ev.nativeEvent.offsetX,
                          y: ev.nativeEvent.offsetY,
                        }
                      : h
                  )
                }
                onMouseLeave={() => setHover(null)}
                style={{ cursor: rec ? 'pointer' : 'default' }}
              />
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredRec && (
          <div
            className="pointer-events-none absolute z-10 max-w-[240px] rounded-md border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur"
            style={{
              left: Math.min(hover!.x + 12, 720),
              top: Math.max(hover!.y - 12, 4),
            }}
          >
            <div className="text-sm font-semibold text-gray-900">
              {hoveredRec.name}
            </div>
            <div className="mt-0.5 text-gray-600">
              {hoveredVal === 0 ? (
                <span className="text-gray-500">
                  Not named in any {modeNoun}
                  {era !== 'alltime' ? ' in this period' : ''}
                </span>
              ) : (
                <>
                  <span className="font-medium text-un-blue">
                    {hoveredVal.toLocaleString()}
                  </span>{' '}
                  {modeNoun}
                  {era !== 'alltime' ? ' in this period' : ''}
                </>
              )}
            </div>
            {era === 'alltime' && (
              <div className="mt-0.5 text-gray-500">
                {hoveredRec.all.toLocaleString()} all ·{' '}
                {hoveredRec.mandate.toLocaleString()} in registry
              </div>
            )}
            {hoveredRec.topSubjects.length > 0 && (
              <div className="mt-1.5 border-t border-gray-100 pt-1.5 text-[11px] leading-snug text-gray-500">
                <span className="text-gray-400">Often alongside: </span>
                {hoveredRec.topSubjects
                  .slice(0, 3)
                  .map((s) => s.subject.toLowerCase())
                  .join(', ')}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-600">
        <span className="text-gray-400">
          {mode === 'all' ? 'Resolutions' : 'Mandate resolutions'} naming the
          country
          {era !== 'alltime'
            ? `, ${ERAS.find((e) => e.id === era)!.label.toLowerCase()}`
            : ''}
          :
        </span>
        {legendClasses.map((c) => (
          <span key={c.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-3 w-4 rounded-[2px] ring-1 ring-black/5"
              style={{ backgroundColor: c.fill }}
            />
            {c.label}
          </span>
        ))}
      </div>

      {/* Companion: top-20 bar list (legible where small countries are not) +
          rarely-on-the-agenda list. */}
      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            Most attention — top 20
          </h4>
          <ol className="space-y-1.5">
            {top20.map((r, i) => (
              <li key={r.rec.iso3} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-right text-gray-400 tabular-nums">
                  {i + 1}
                </span>
                <span className="w-40 shrink-0 truncate text-gray-700">
                  {r.rec.name}
                </span>
                <span className="relative h-3.5 flex-1 rounded-sm bg-gray-100">
                  <span
                    className="absolute inset-y-0 left-0 rounded-sm bg-un-blue"
                    style={{
                      width: `${Math.max(3, (r.v / rankedMax) * 100)}%`,
                    }}
                  />
                </span>
                <span className="w-10 text-right text-gray-600 tabular-nums">
                  {r.v.toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-900">
            Rarely on the agenda
          </h4>
          <p className="mb-3 text-xs leading-relaxed text-gray-500">
            No UN member state is <em>entirely</em> absent from the resolution
            record, but many appear only a handful of times across eight
            decades. The least-named members (all resolutions, all years):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {DATA.leastMentioned.map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600"
              >
                {c.name}
                <span className="text-gray-400 tabular-nums">{c.all}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Source + methodology caveats */}
      <p className="mt-8 max-w-3xl border-t border-gray-100 pt-4 text-[11px] leading-relaxed text-gray-400">
        <span className="font-medium text-gray-500">Source:</span> UN Digital
        Library geographic subject headings (UNBIS thesaurus) on{' '}
        {DATA.meta.totalDocs.toLocaleString()} adopted resolutions, decisions
        and presidential statements (A/RES, A/DEC, S/RES, S/PRST, E/RES, E/DEC,
        A/HRC/RES, A/HRC/PRST). A resolution counts once for a country if any of
        its subjects resolves to that country;{' '}
        {DATA.meta.docsWithCountry.toLocaleString()} documents name at least
        one.{' '}
        <span className="font-medium text-gray-500">Method &amp; caveats:</span>{' '}
        subject terms are matched to ISO-3166 countries via a curated,
        hand-checked mapping. Historical states are attributed to their UN
        continuator (USSR → Russia, Yugoslavia → Serbia); occupied and
        administered areas to a sovereign display (Golan Heights → Syria, West
        Bank / Gaza → State of Palestine); sub-national places to their country
        (Darfur → Sudan, Abkhazia → Georgia). Regions and seas (Middle East,
        Africa, the Sahel), contested final-status places (Jerusalem, Nagorny
        Karabakh) and two-state questions (Korea) carry no single flag and are
        excluded from the map. Some small territories are absent from the
        low-resolution basemap and appear only in the ranked list.
      </p>
    </div>
  )
}
