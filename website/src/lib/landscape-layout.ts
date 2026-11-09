import { calendarYearWindow } from '#lib/year-window'

export const LANDSCAPE_CITATIONS = [
  'peacekeeping',
  'foundational',
  'legislative',
  'planOutline',
  'uncited',
] as const
export type LandscapeCitation = (typeof LANDSCAPE_CITATIONS)[number]

export interface LandscapeGroup {
  year: number | null
  earlierVersion: boolean
  securityCouncil: boolean
  citation: LandscapeCitation
  count: number
}

export type LandscapeAge = 'recent' | 'earlier' | 'undated' | 'later'

export const LANDSCAPE_COLUMNS = [8, 135, 340, 555, 790] as const

export interface LandscapeNode {
  key: string
  depth: number
  count: number
  blue: boolean
  x: number
  y: number
  height: number
  earlierVersion?: boolean
  securityCouncil?: boolean
  citation?: LandscapeCitation
  age?: LandscapeAge
}
export interface LandscapeLink {
  source: string
  target: string
  count: number
  blue: boolean
  path: string
}

/** Colour each whole branch according to the decisions reached so far. */
function branchIsBlue(
  depth: number,
  earlierVersion?: boolean,
  securityCouncil?: boolean,
  age?: LandscapeAge
) {
  return (
    depth > 0 &&
    earlierVersion === false &&
    (depth === 1 ||
      (securityCouncil === false && (depth < 4 || age === 'recent')))
  )
}

/** A branching tree: only uncited nodes split again by recency.
 * One count-to-height scale applies throughout. Zero-count outcomes have
 * table entries but no plot space; cited flows terminate at the citation layer.
 */
export function buildLandscapeSankey(
  groups: LandscapeGroup[],
  currentYear: number,
  windowYears = 5
) {
  const window = calendarYearWindow(
    groups.map((group) => group.year),
    currentYear,
    windowYears
  )
  const total = groups.reduce((sum, group) => sum + group.count, 0)
  const scale = total > 0 ? 240 / total : 0
  const nodes: LandscapeNode[] = []
  const links: LandscapeLink[] = []
  let cursor = 40
  function leaf(
    key: string,
    depth: number,
    x: number,
    count: number,
    earlierVersion: boolean,
    securityCouncil: boolean,
    citation: LandscapeCitation,
    age?: LandscapeAge
  ) {
    const height = count * scale
    const slot = count > 0 ? Math.max(20, height) : 0
    const node = {
      key,
      depth,
      count,
      blue: branchIsBlue(depth, earlierVersion, securityCouncil, age),
      x,
      y: cursor + (slot - height) / 2,
      height,
      earlierVersion,
      securityCouncil,
      citation,
      age,
    }
    nodes.push(node)
    if (count > 0) cursor += slot + 4
    return node
  }
  for (const earlierVersion of [true, false]) {
    for (const securityCouncil of [true, false]) {
      const groupStart = cursor
      for (const citation of LANDSCAPE_CITATIONS) {
        const matching = groups.filter(
          (group) =>
            group.earlierVersion === earlierVersion &&
            group.securityCouncil === securityCouncil &&
            group.citation === citation
        )
        const key = `series:${earlierVersion}/sc:${securityCouncil}/${citation}`
        if (citation === 'uncited') {
          const ages: LandscapeAge[] = ['recent', 'earlier', 'undated']
          // Do not mislabel future-dated records as earlier or undated.
          if (
            matching.some(
              (group) =>
                group.year !== null &&
                group.year > window.endYear &&
                group.count > 0
            )
          )
            ages.push('later')
          const children = ages.map((age) => {
            const count = matching
              .filter((group) => {
                const category =
                  group.year === null
                    ? 'undated'
                    : group.year < window.startYear
                      ? 'earlier'
                      : group.year > window.endYear
                        ? 'later'
                        : 'recent'
                return category === age
              })
              .reduce((sum, group) => sum + group.count, 0)
            return leaf(
              `${key}/${age}`,
              4,
              LANDSCAPE_COLUMNS[4],
              count,
              earlierVersion,
              securityCouncil,
              citation,
              age
            )
          })
          parent(
            key,
            3,
            LANDSCAPE_COLUMNS[3],
            children,
            earlierVersion,
            securityCouncil,
            citation
          )
        } else {
          leaf(
            key,
            3,
            LANDSCAPE_COLUMNS[3],
            matching.reduce((sum, group) => sum + group.count, 0),
            earlierVersion,
            securityCouncil,
            citation
          )
        }
      }
      if (cursor > groupStart) cursor += 10
    }
  }
  function parent(
    key: string,
    depth: number,
    x: number,
    children: LandscapeNode[],
    earlierVersion?: boolean,
    securityCouncil?: boolean,
    citation?: LandscapeCitation
  ) {
    const count = children.reduce((sum, child) => sum + child.count, 0)
    const height = count * scale
    const first = children[0]
    const last = children[children.length - 1]
    const y = (first.y + last.y + last.height - height) / 2
    const node = {
      key,
      depth,
      count,
      blue: branchIsBlue(depth, earlierVersion, securityCouncil),
      x,
      y,
      height,
      earlierVersion,
      securityCouncil,
      citation,
    }
    nodes.push(node)
    let offset = 0
    for (const child of children) {
      const band = child.count * scale
      if (band > 0) {
        const start = y + offset
        const end = child.y
        const from = x + 10
        const to = child.x
        const mid = (from + to) / 2
        links.push({
          source: key,
          target: child.key,
          count: child.count,
          blue: child.blue,
          path: `M ${from} ${start} C ${mid} ${start} ${mid} ${end} ${to} ${end} L ${to} ${end + band} C ${mid} ${end + band} ${mid} ${start + band} ${from} ${start + band} Z`,
        })
      }
      offset += band
    }
    return node
  }
  const seriesNodes = []
  for (const earlierVersion of [true, false]) {
    const councilNodes = []
    for (const securityCouncil of [true, false]) {
      councilNodes.push(
        parent(
          `series:${earlierVersion}/sc:${securityCouncil}`,
          2,
          LANDSCAPE_COLUMNS[2],
          nodes.filter(
            (node) =>
              node.depth === 3 &&
              node.earlierVersion === earlierVersion &&
              node.securityCouncil === securityCouncil
          ),
          earlierVersion,
          securityCouncil
        )
      )
    }
    seriesNodes.push(
      parent(
        `series:${earlierVersion}`,
        1,
        LANDSCAPE_COLUMNS[1],
        councilNodes,
        earlierVersion
      )
    )
  }
  parent('all', 0, LANDSCAPE_COLUMNS[0], seriesNodes)
  return {
    nodes,
    links,
    total,
    height: cursor + 10,
    width: 1035,
    scale,
    ...window,
  }
}
