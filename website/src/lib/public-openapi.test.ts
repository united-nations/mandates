import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildPublicOpenApi, FILTER_DESCRIPTIONS } from '#lib/public-openapi'
import { FILTER_PARAMS } from '#lib/filter-constants'
import { agentGuide } from '#lib/agent-reference'
import {
  documentResponseSchema,
  listResponseSchema,
  publicDocumentSchema,
} from '#lib/public-schemas'
import {
  API_REQUEST_RULES,
  DOCUMENT_PAGES_PER_DAY,
  DOCUMENT_PAGES_PER_HOUR,
  EXPORT_CONCURRENCY_MAX,
  EXPORTS_PER_DAY,
  RATE_LIMIT_PER_DAY,
  RATE_LIMIT_PER_MINUTE,
  ROW_BUDGET_PER_DAY,
  VOLUME_LIMITS,
} from '#lib/api-limits'

/** Text that would state a volume limit's figure, e.g. "200 requests". */
function statesVolumeFigure(text: string): string | undefined {
  const figures = [
    RATE_LIMIT_PER_MINUTE,
    RATE_LIMIT_PER_DAY,
    ROW_BUDGET_PER_DAY,
    EXPORTS_PER_DAY,
    EXPORT_CONCURRENCY_MAX,
    DOCUMENT_PAGES_PER_HOUR,
    DOCUMENT_PAGES_PER_DAY,
  ].flatMap((n) => [String(n), n.toLocaleString('en-US')])
  for (const figure of figures) {
    const pattern = new RegExp(
      `\\b${figure}\\s+(requests|rows|exports|downloads|document pages|pages)\\b`
    )
    const match = pattern.exec(text)
    if (match) return match[0]
  }
  return /per (minute|hour|day|UTC calendar day)\b/.exec(text)?.[0]
}

test('published OpenAPI matches its schema source', () => {
  const published = JSON.parse(
    readFileSync(new URL('../../public/openapi.json', import.meta.url), 'utf8')
  )
  assert.deepEqual(published, buildPublicOpenApi())
  for (const parameter of FILTER_PARAMS)
    assert.ok(FILTER_DESCRIPTIONS[parameter], parameter)
})

test('OpenAPI states the request rules exactly and volume limits generally', () => {
  const spec = buildPublicOpenApi()
  for (const rule of API_REQUEST_RULES)
    assert.ok(spec.info.description.includes(rule), rule)
  assert.ok(spec.info.description.includes(VOLUME_LIMITS))
  const tooMany = spec.paths['/api/v1/documents'].get.responses['429']
  assert.ok(tooMany.description.includes('Retry-After'))
  assert.equal(statesVolumeFigure(JSON.stringify(spec)), undefined)
})

const SUMMARY_FIELDS = [
  'symbol',
  'title',
  'issuingBody',
  'year',
  'documentType',
  'subjects',
  'agendaItems',
  'sourceUrl',
  'pageUrl',
  'canonicalUrl',
  'jsonUrl',
  'budgetVersion',
  'matchingCitationCount',
  'matchingEntityCount',
  'matchingEntities',
  'matchingFoundationalEntities',
  'matchingProgrammes',
  'matchingBudgetLocations',
  'series',
  'group',
]

test('a document record has exactly the summary fields, in lists and alone', () => {
  assert.deepEqual(Object.keys(publicDocumentSchema.shape), SUMMARY_FIELDS)
  assert.equal(documentResponseSchema.shape.document, publicDocumentSchema)
  assert.equal(listResponseSchema.shape.items.element, publicDocumentSchema)
  const spec = JSON.stringify(buildPublicOpenApi())
  for (const removed of [
    '"include"',
    'DocumentDetails',
    'BudgetCitation',
    'VersionHistory',
    'version history',
    'Version relationships',
    'reports',
    'details',
  ])
    assert.ok(!spec.includes(removed), removed)
  const source = readFileSync(
    new URL('./data/public-documents.ts', import.meta.url),
    'utf8'
  )
  for (const reader of [
    './paragraphs',
    './mandated-sg-reports',
    'getMandateCitationsMany',
    'getResolutionSeriesMany',
    'getPublicDetails',
  ])
    assert.ok(!source.includes(reader), reader)
})

test('Excel downloads have no versions sheet', () => {
  const source = readFileSync(
    new URL('./data/document-export.ts', import.meta.url),
    'utf8'
  )
  assert.ok(!source.includes('Version relationships'))
  assert.ok(!source.includes('getExcelVersionBatches'))
  assert.ok(source.includes("'Budget citations'"))
})

test('agent guide covers reading, finding, structured data and use, in that order', () => {
  const guide = agentGuide()
  assert.deepEqual(guide.match(/^## .+$/gm), [
    '## Reading a document',
    '## Finding a document',
    '## Structured data',
    '## Use and limits',
  ])
  for (const text of [
    'https://mandates.un.org/mandate/A/RES/79/1',
    'https://mandates.un.org/secretariat?keyword=climate',
    'https://mandates.un.org/api/v1/documents/{symbol}',
    'https://mandates.un.org/api/v1/documents?keyword=climate',
    'This service is for reading the registry and for occasional lookups.',
    '429 with a Retry-After header',
    'https://digitallibrary.un.org',
    VOLUME_LIMITS,
  ])
    assert.ok(guide.includes(text), text)
  for (const absent of [
    'No account',
    'include=details',
    '/exports',
    '/reference',
    '/agendas',
    '/programmes',
    'openapi',
    '.json',
    'page=',
  ])
    assert.ok(!guide.includes(absent), absent)
  // "key" as a word; "keyword" is the search parameter.
  assert.ok(!/\bkey\b/i.test(guide))
  assert.equal(statesVolumeFigure(guide), undefined)
})

/** Whether robots.txt allows a path for an agent, by longest matching rule. */
function robotsAllows(robots: string, agent: string, path: string): boolean {
  const groups: { agents: string[]; rules: [boolean, string][] }[] = []
  let current: (typeof groups)[number] | undefined
  for (const line of robots.split('\n').map((l) => l.trim())) {
    const [field, ...rest] = line.split(':')
    const value = rest.join(':').trim()
    if (/^user-agent$/i.test(field)) {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
    } else if (current && /^(allow|disallow)$/i.test(field))
      current.rules.push([/^allow$/i.test(field), value])
  }
  const group =
    groups.find((g) => g.agents.includes(agent.toLowerCase())) ??
    groups.find((g) => g.agents.includes('*'))!
  let best: [boolean, number] = [true, -1]
  for (const [allow, pattern] of group.rules) {
    const source = pattern
      .replace(/[.+?^{}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
    if (!new RegExp('^' + source).test(path)) continue
    if (pattern.length > best[1] || (pattern.length === best[1] && allow))
      best = [allow, pattern.length]
  }
  return best[0]
}

test('robots.txt allows document lookups and keeps the rest of the API closed', () => {
  const robots = readFileSync(
    new URL('../../public/robots.txt', import.meta.url),
    'utf8'
  )
  const general = robots
    .split(/\n\s*\n/)
    .find((g) => g.includes('User-agent: *'))!
  const lines = general.split('\n').map((line) => line.trim())
  assert.ok(
    lines.indexOf('Allow: /api/v1/documents') >= 0 &&
      lines.indexOf('Allow: /api/v1/documents') <
        lines.indexOf('Disallow: /api/')
  )
  for (const path of [
    '/mandate/A/RES/79/1',
    '/api/v1/documents/A/RES/79/1',
    '/api/v1/documents?keyword=climate',
    '/llms.txt',
  ])
    assert.ok(robotsAllows(robots, 'Claude-User', path), path)
  for (const path of [
    '/api/v1/exports?format=csv',
    '/api/v1/reference',
    '/api/v1/agendas?body=GA',
    '/api/v1/programmes',
    '/mandate/A/RES/79/1.json',
  ])
    assert.ok(!robotsAllows(robots, 'Claude-User', path), path)
  for (const path of ['/mandate/A/RES/79/1', '/api/v1/documents/A/RES/79/1'])
    assert.ok(!robotsAllows(robots, 'GPTBot', path), path)
})
