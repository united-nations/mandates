import type {
  DemandDecadePoint,
  VerbLeagueRow,
} from '@/lib/data/language-strength'

/** "call upon" → "Calls upon": conjugate the first word, capitalize. */
function operativeForm(verb: string): string {
  const [first, ...rest] = verb.split(' ')
  const conjugated = /(s|x|z|ch|sh)$/.test(first) ? `${first}es` : `${first}s`
  const capitalized = conjugated[0].toUpperCase() + conjugated.slice(1)
  return [capitalized, ...rest].join(' ')
}

/**
 * The verb league — the twelve most common operative lead verbs, with their
 * force score (0–5) and tone (directive vs. requesting), ranked by how many
 * paragraphs open with them. Server component, static markup.
 */
export function LanguageStrengthVerbs({ verbs }: { verbs: VerbLeagueRow[] }) {
  if (verbs.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No classified paragraphs available.
      </p>
    )
  }
  const max = Math.max(...verbs.map((v) => v.paragraphs))

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-gray-500">
        The verbs that open operative paragraphs, ranked by frequency. The UN
        asks far more than it orders: <em>requests</em> alone outnumbers every
        directive verb, and clearly directive wording (<em>decides</em>,
        <em> authorizes</em>, <em>approves</em>) is concentrated in matters the
        organs control themselves — budgets, agendas, mandates of their own
        bodies.
      </p>

      <div className="max-w-2xl overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-left text-[10px] font-medium tracking-wide text-gray-400 uppercase">
              <th className="py-1.5 pr-3 font-medium">Verb</th>
              <th className="py-1.5 pr-3 font-medium">Paragraphs</th>
              <th className="py-1.5 pr-3 font-medium">Force</th>
              <th className="py-1.5 font-medium">Tone</th>
            </tr>
          </thead>
          <tbody>
            {verbs.map((v) => (
              <tr key={v.verb} className="border-b border-gray-100">
                <td className="py-1.5 pr-3 font-medium whitespace-nowrap text-gray-900 italic">
                  {operativeForm(v.verb)}
                </td>
                <td className="w-2/5 min-w-28 py-1.5 pr-3">
                  <div className="flex items-center gap-1.5">
                    {/* Bar scales within the cell minus the label's reserved
                        width, so the longest bar never pushes its label out. */}
                    <div
                      className="h-2.5 shrink-0 rounded-[1px] bg-gray-300"
                      style={{
                        width: `calc((100% - 3.5rem) * ${Math.max(0.01, v.paragraphs / max)})`,
                        minWidth: '2px',
                      }}
                    />
                    <span className="text-[11px] text-gray-500 tabular-nums">
                      {v.paragraphs.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td className="py-1.5 pr-3" title={`Force ${v.force} of 5`}>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span
                        key={i}
                        className={`inline-block h-2 w-2 rounded-full ${
                          i <= v.force ? 'bg-un-blue' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                    <span className="sr-only">{`${v.force} of 5`}</span>
                  </div>
                </td>
                <td className="py-1.5">
                  {v.tone === 'binding' ? (
                    <span className="rounded-full bg-un-blue/10 px-2 py-0.5 text-[10px] font-medium text-un-blue">
                      directive
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
                      requesting
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Compact callout: the Security Council's use of "Demands" — its sharpest
 * non-Chapter-VII word — per decade. Peaks with the 1990s activism and stays
 * high after.
 */
export function LanguageStrengthDemands({
  data,
}: {
  data: DemandDecadePoint[]
}) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.demands))

  return (
    <div className="max-w-2xl rounded-md border border-gray-200 bg-card-gray p-4">
      <h4 className="text-xs font-semibold text-gray-900">
        The Council&rsquo;s sharpest word: &ldquo;Demands&rdquo;
      </h4>
      <p className="mt-1 mb-3 text-xs leading-relaxed text-gray-500">
        Security Council paragraphs opening with <em>Demands</em> — six in the
        whole of the 1960s,{' '}
        {data.find((d) => d.decade === 1990)?.demands ?? '—'} in the 1990s after
        the Cold War unblocked the Council, and it has never dropped back since.
      </p>
      <div className="flex items-end gap-1.5">
        {data.map((d) => (
          <div key={d.decade} className="flex-1">
            <div className="flex h-16 items-end">
              <div
                className="w-full rounded-t-[2px] bg-un-blue/70"
                style={{ height: `${Math.max(2, (100 * d.demands) / max)}%` }}
                title={`${d.decade}s: ${d.demands} paragraphs`}
              />
            </div>
            <div className="mt-1 text-center text-[10px] text-gray-400 tabular-nums">
              {`${d.decade}s`}
            </div>
            <div className="text-center text-[10px] font-medium text-gray-700 tabular-nums">
              {d.demands}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
