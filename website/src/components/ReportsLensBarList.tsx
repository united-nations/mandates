export interface ReportsLensBarRow {
  label: string
  count: number
  /** Optional secondary text after the label, muted. */
  detail?: string
}

/**
 * Horizontal bar list for the /reports lens — a table-shaped chart with the
 * value printed on every row, so it needs no hover layer and renders on the
 * server. Bars share one scale (the max of the list).
 */
export function ReportsLensBarList({ rows }: { rows: ReportsLensBarRow[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <ul className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 text-sm">
          <span
            className="w-44 shrink-0 truncate text-gray-700"
            title={r.label}
          >
            {r.label}
            {r.detail ? (
              <span className="ml-1 text-xs text-gray-400">{r.detail}</span>
            ) : null}
          </span>
          <span className="relative h-4 flex-1">
            <span
              className="absolute inset-y-0 left-0 rounded-[2px] bg-un-blue/70"
              style={{ width: `${Math.max(0.5, (r.count / max) * 100)}%` }}
            />
          </span>
          <span className="w-14 shrink-0 text-right text-xs text-gray-600 tabular-nums">
            {r.count.toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  )
}
