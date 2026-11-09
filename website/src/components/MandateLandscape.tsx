'use client'

import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { explainerTexts } from '@/lib/en_text_contents'
import {
  buildLandscapeSankey,
  LANDSCAPE_COLUMNS,
  type LandscapeGroup,
  type LandscapeNode,
} from '@/lib/landscape-layout'

const text = explainerTexts.mandateLandscape
const format = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    String(values[key] ?? match)
  )

function nodeLabel(node: LandscapeNode, windowYears: number, endYear: number) {
  if (node.depth === 0) return text.all
  if (node.depth === 1) return node.earlierVersion ? text.earlier : text.latest
  if (node.depth === 2)
    return node.securityCouncil ? text.council : text.otherBodies
  if (node.depth === 4) {
    if (node.age === 'recent')
      return format(text.recent, { years: windowYears })
    if (node.age === 'later') return format(text.later, { year: endYear })
    return node.age === 'undated' ? text.undated : text.older
  }
  return node.citation === 'uncited'
    ? text.uncited
    : node.citation
      ? explainerTexts.citationTrend[node.citation]
      : ''
}

export function MandateLandscape({
  groups,
  versionLabel,
  currentYear,
}: {
  groups: LandscapeGroup[]
  versionLabel: string
  currentYear: number
}) {
  const id = useId()
  const [windowYears, setWindowYears] = useState(5)
  const chart = buildLandscapeSankey(groups, currentYear, windowYears)
  const label = (node: LandscapeNode) =>
    nodeLabel(node, windowYears, chart.endYear)
  const terminals = chart.nodes.filter(
    (node) =>
      node.depth === 4 || (node.depth === 3 && node.citation !== 'uncited')
  )
  const share = (count: number) =>
    `${((count / chart.total) * 100).toFixed(1)}%`
  const pathLabel = (node: LandscapeNode) =>
    [
      node.earlierVersion ? text.earlier : text.latest,
      node.securityCouncil ? text.council : text.otherBodies,
      node.depth === 4 ? text.uncited : label(node),
      ...(node.depth === 4 ? [label(node)] : []),
    ].join(' → ')
  if (chart.total === 0)
    return <p className="text-sm text-muted-foreground">{text.empty}</p>
  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-sm text-muted-foreground">{text.intro}</p>
      <p className="text-sm">
        {format(text.scope, {
          count: chart.total.toLocaleString(),
          version: versionLabel,
        })}
      </p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label htmlFor={id}>{text.windowLabel}</label>
        <Input
          id={id}
          type="number"
          min={1}
          max={chart.maxWindow}
          step={1}
          value={windowYears}
          className="h-8 w-20"
          onChange={(event) => {
            const value = event.target.valueAsNumber
            if (
              Number.isInteger(value) &&
              value >= 1 &&
              value <= chart.maxWindow
            )
              setWindowYears(value)
          }}
        />
        <span className="text-muted-foreground" aria-live="polite">
          {format(text.windowRange, {
            start: chart.startYear,
            end: chart.endYear,
          })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {format(text.blueNote, { years: windowYears })}
      </p>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="block w-full min-w-[1035px]"
          role="img"
          aria-label={text.heading}
        >
          <desc>{text.description}</desc>
          {[
            text.all,
            text.series,
            text.issuingBody,
            text.citations,
            text.age,
          ].map((heading, index) => (
            <text
              key={heading}
              x={LANDSCAPE_COLUMNS[index]}
              y={22}
              className="fill-foreground text-sm font-semibold"
            >
              {heading}
            </text>
          ))}
          <g>
            {chart.links.map((link) => (
              <path
                key={link.target}
                d={link.path}
                className={link.blue ? 'fill-un-blue' : 'fill-gray-400'}
                fillOpacity={link.blue ? 0.55 : 0.35}
              >
                <title>{`${link.count.toLocaleString()} · ${share(link.count)}`}</title>
              </path>
            ))}
          </g>
          {chart.nodes
            .filter((node) => node.count > 0)
            .map((node) => (
              <g key={node.key}>
                {node.count > 0 && (
                  <rect
                    x={node.x}
                    y={node.y}
                    width={10}
                    height={node.height}
                    className={node.blue ? 'fill-un-blue' : 'fill-gray-400'}
                  >
                    <title>{`${node.depth >= 3 ? pathLabel(node) : label(node)}: ${node.count.toLocaleString()} · ${share(node.count)}`}</title>
                  </rect>
                )}
                <text
                  x={node.x + 17}
                  y={node.y + node.height / 2 + (node.depth >= 3 ? 4 : -3)}
                  className="fill-foreground stroke-background text-xs"
                  strokeWidth={4}
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  <tspan x={node.x + 17}>{label(node)}</tspan>
                  <tspan
                    x={node.depth >= 3 ? undefined : node.x + 17}
                    dy={node.depth >= 3 ? 0 : 16}
                    className="font-medium"
                  >
                    {node.depth >= 3 ? ' · ' : ''}
                    {node.count.toLocaleString()}
                  </tspan>
                </text>
              </g>
            ))}
        </svg>
      </div>
      <p className="max-w-3xl text-xs text-muted-foreground">
        {text.definitions}
      </p>
      <details>
        <summary className="cursor-pointer text-sm font-medium">
          {format(text.table, { count: terminals.length })}
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {[
                  text.series,
                  text.issuingBody,
                  text.citations,
                  text.age,
                  text.count,
                  text.share,
                ].map((heading) => (
                  <th key={heading} scope="col" className="p-2 font-medium">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {terminals.map((node) => (
                <tr key={node.key} className="border-b border-border">
                  <th scope="row" className="p-2 font-normal">
                    {node.earlierVersion ? text.earlier : text.latest}
                  </th>
                  <td className="p-2">
                    {node.securityCouncil ? text.council : text.otherBodies}
                  </td>
                  <td className="p-2">
                    {node.depth === 4 ? text.uncited : label(node)}
                  </td>
                  <td className="p-2">
                    {node.depth === 4 ? label(node) : '—'}
                  </td>
                  <td className="p-2 tabular-nums">
                    {node.count.toLocaleString()}
                  </td>
                  <td className="p-2 tabular-nums">{share(node.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
