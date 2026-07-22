import type { AssigneeGradientRow } from '@/lib/data/language-strength'

/** Plain-language labels for `assignee_class`. */
const CLASS_LABELS: Record<string, string> = {
  'secretary-general': 'Secretary-General',
  un_body: 'UN intergovernmental bodies',
  member_states: 'Member States',
  special_procedure: 'Special procedures & experts',
  un_system: 'UN system organizations',
  secretariat_entity: 'Secretariat entities',
  ngo_other: 'NGOs & other actors',
}

// Truncated force axis — the class averages all sit between ~2.4 and ~3.0 on
// the 0–5 scale, so a zero-based axis would collapse them onto one pixel.
// Dot position encodes position, not length, so truncation is legitimate; the
// tick labels make the window explicit.
const AXIS_MIN = 2.2
const AXIS_MAX = 3.1
const TICKS = [2.4, 2.6, 2.8, 3.0]

/**
 * "Command gradient" dot plot — average verb force (0–5) per addressee class,
 * dot area proportional to how many operative paragraphs address that actor.
 * Server component: purely static markup, tooltips via `title`.
 */
export function LanguageStrengthGradient({
  data,
}: {
  data: AssigneeGradientRow[]
}) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No classified paragraphs available.
      </p>
    )
  }

  const rows = [...data].sort((a, b) => b.avgForce - a.avgForce)
  const maxParagraphs = Math.max(...rows.map((r) => r.paragraphs))
  const pos = (force: number) =>
    ((Math.min(Math.max(force, AXIS_MIN), AXIS_MAX) - AXIS_MIN) /
      (AXIS_MAX - AXIS_MIN)) *
    100
  // Dot AREA encodes the paragraph count: diameter ∝ √count, 10–30 px.
  const diameter = (n: number) => 10 + 20 * Math.sqrt(n / maxParagraphs)

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-gray-500">
        Average force of the verb used when a resolution addresses each kind of
        actor, on the corpus&rsquo; 0–5 verb-force scale (<em>encourages</em> =
        1, <em>requests</em> = 3, <em>urges</em> = 4, <em>decides</em> = 5). Dot
        size shows how many operative paragraphs address that actor. The
        Secretary-General is at the top of the gradient: bodies the UN controls
        get told, everyone else gets asked.
      </p>

      <div className="max-w-2xl">
        {rows.map((r) => {
          const label = CLASS_LABELS[r.assigneeClass] ?? r.assigneeClass
          const d = diameter(r.paragraphs)
          return (
            <div
              key={r.assigneeClass}
              className="flex items-center gap-3 border-b border-gray-100 py-1 last:border-b-0"
              title={`${label}: average force ${r.avgForce.toFixed(2)} across ${r.paragraphs.toLocaleString()} paragraphs · ${r.pctDirective.toFixed(1)}% directive`}
            >
              <div className="w-36 shrink-0 text-xs leading-tight text-gray-700 sm:w-48">
                {label}
              </div>
              <div className="relative h-10 min-w-0 flex-1">
                {/* Track gridlines */}
                {TICKS.map((t) => (
                  <div
                    key={t}
                    className="absolute inset-y-0 w-px bg-gray-100"
                    style={{ left: `${pos(t)}%` }}
                  />
                ))}
                <div
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-un-blue/70"
                  style={{ width: d, height: d, left: `${pos(r.avgForce)}%` }}
                />
                {/* Value label flips to the left of the dot near the right
                    edge so it never clips out of the track. */}
                {pos(r.avgForce) > 80 ? (
                  <span
                    className="absolute top-1/2 -translate-x-full -translate-y-1/2 text-[11px] font-medium text-gray-900 tabular-nums"
                    style={{
                      left: `calc(${pos(r.avgForce)}% - ${d / 2 + 6}px)`,
                    }}
                  >
                    {r.avgForce.toFixed(2)}
                  </span>
                ) : (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-gray-900 tabular-nums"
                    style={{
                      left: `calc(${pos(r.avgForce)}% + ${d / 2 + 6}px)`,
                    }}
                  >
                    {r.avgForce.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="hidden w-24 shrink-0 text-right text-[11px] text-gray-400 tabular-nums sm:block">
                {r.paragraphs.toLocaleString()} paras
              </div>
            </div>
          )
        })}

        {/* Axis */}
        <div className="mt-1 flex items-center gap-3">
          <div className="w-36 shrink-0 sm:w-48" />
          <div className="relative h-4 min-w-0 flex-1 text-[10px] text-gray-400">
            {TICKS.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${pos(t)}%` }}
              >
                {t.toFixed(1)}
              </span>
            ))}
          </div>
          <div className="hidden w-24 shrink-0 sm:block" />
        </div>
        <div className="mt-1 flex items-center gap-3">
          <div className="w-36 shrink-0 sm:w-48" />
          <div className="min-w-0 flex-1 text-[10px] text-gray-400">
            Average verb force (0–5 scale, axis window 2.2–3.1)
          </div>
          <div className="hidden w-24 shrink-0 sm:block" />
        </div>
      </div>
    </div>
  )
}
