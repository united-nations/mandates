import { z } from 'zod'
import { FILTER_PARAMS } from '#lib/filter-constants'
import { API_VERSION, COVERAGE_NOTES } from '#lib/public-api'
import {
  API_FAIR_USE,
  DIGITAL_LIBRARY_POINTER,
  API_REQUEST_RULES,
  API_PAGE_MAX,
  API_PAGE_SIZE_MAX,
  EXPORT_ROW_CAP,
  VOLUME_LIMITS,
} from '#lib/api-limits'
import {
  budgetVersionSchema,
  publicDocumentSchema,
  documentResponseSchema,
  listResponseSchema,
  agendaResponseSchema,
  programmeResponseSchema,
} from '#lib/public-schemas'

export const FILTER_DESCRIPTIONS: Record<string, string> = {
  entity:
    'Citing entity code, for example `DESA`. `__none__` selects documents with no citing entity.',
  organ: 'Issuing body code from `/api/v1/reference`.',
  crossCitingEntity: 'Second citing entity; intersects entity scope.',
  keyword:
    'Search document titles, symbols and subjects using the website search grammar. Up to 500 characters and 32 whitespace-separated terms.',
  budget_part: 'Budget part number.',
  section: 'Budget section identifier.',
  subprogramme: 'Subprogramme label.',
  foundational:
    'Set to `true` to select foundational/mandates-and-background citations. Applies to the selected document/entity pair.',
  programme: 'Programme identifier.',
  subject: 'UNBIS subject heading.',
  subject_domain: 'Two-digit UNBIS domain code.',
  start_year: 'Inclusive earliest document year, 0–9999.',
  end_year: 'Inclusive latest document year, 0–9999.',
  budget_document: 'Budget stream: `ppb`, `pko` or `plan_outline`.',
  budget_group: 'Peacekeeping budget group: `missions` or `support`.',
  budget_location:
    'Structured budget-location scope serialized by website links. Copy this parameter from a filtered website URL.',
  document_type: 'Document type label as used in the website.',
  agenda_item: 'Agenda item filter.',
  agenda_scope:
    'Structured agenda scope serialized by website links; takes precedence over `agenda_item`.',
  related_scope:
    'Related agenda cluster scope; takes precedence over `agenda_scope` and `agenda_item`.',
  full_document_symbol: 'Exact document symbol.',
  min_citations: 'Minimum matching citation count, 0–1000000.',
  max_citations: 'Maximum matching citation count, 0–1000000.',
  cited:
    'Set to `1` to select only documents cited in the selected budget cycle.',
  ppb_version:
    'Budget-cycle slug from `/api/v1/reference`. Defaults to the database default; responses identify the resolved cycle.',
  group:
    'Set to `1` to group related documents in list responses. Exports always list every matching document individually.',
  sort_by:
    '`citing_entities_desc` (default), `citing_entities_asc`, `citations_desc`, `citations_asc`, `year_desc`, `year_asc`, `similarity_desc`, `similarity_asc`, `word_count_desc` or `word_count_asc`. Keyword matches rank first; symbol breaks ties.',
  page: `1-based page, at most ${API_PAGE_MAX}; larger values return 400.`,
  limit: `Page size, default 15, at most ${API_PAGE_SIZE_MAX}; larger values return 400. Exports ignore \`page\` and \`limit\`.`,
}
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema: object) => ({
  content: { 'application/json': { schema } },
})
const errors = {
  '400': {
    description:
      'Malformed, repeated or over-long known query parameter; unsupported selector, include or format; unknown body, session or budget cycle; or a request beyond a stated limit (page size, page depth, export size).',
    ...json(ref('Error')),
  },
  '429': {
    description: `A volume limit has been reached. ${VOLUME_LIMITS}`,
    headers: { 'Retry-After': { schema: { type: 'integer' } } },
    ...json(ref('Error')),
  },
  '503': {
    description: 'Data temporarily unavailable; retry after 30 seconds.',
    ...json(ref('Error')),
  },
}
export function buildPublicOpenApi() {
  const parameters = FILTER_PARAMS.map((name) => ({
    name,
    in: 'query',
    required: false,
    description: FILTER_DESCRIPTIONS[name],
    schema: [
      'page',
      'limit',
      'start_year',
      'end_year',
      'min_citations',
      'max_citations',
    ].includes(name)
      ? {
          type: 'integer',
          minimum: ['page', 'limit'].includes(name) ? 1 : 0,
          ...(name === 'page' ? { maximum: API_PAGE_MAX } : {}),
          ...(name === 'limit' ? { maximum: API_PAGE_SIZE_MAX } : {}),
        }
      : { type: 'string' },
  }))
  return {
    openapi: '3.1.0',
    info: {
      title: 'UN Mandate Registry API',
      version: API_VERSION,
      description: `Public, read-only access to summary records of registry documents, with the fields shown in the website's document table.\n\n${API_FAIR_USE} ${DIGITAL_LIBRARY_POINTER}\n\nRequest rules: ${API_REQUEST_RULES.join(' ')}\n\nVolume limits: ${VOLUME_LIMITS}\n\n${COVERAGE_NOTES.join(' ')} Use returned pageUrl/jsonUrl links verbatim. This API does not determine legal in-force status.`,
    },
    servers: [
      { url: '/', description: 'Current host' },
      { url: 'https://mandates.un.org', description: 'Production' },
    ],
    paths: {
      '/api/v1/documents': {
        get: {
          operationId: 'searchDocuments',
          summary: 'Search and browse mandate documents',
          parameters,
          responses: {
            '200': {
              description: `One page of matching documents. pagination.total counts every match; pages beyond ${API_PAGE_MAX} are refused, so narrow the filters rather than paging further. A page past the last match retains total and has no items.`,
              ...json(ref('DocumentList')),
            },
            ...errors,
          },
        },
      },
      '/api/v1/documents/{symbol}': {
        get: {
          operationId: 'getDocument',
          summary: 'Get the summary record of a document',
          description:
            'The symbol may contain slashes; URL-encode it as a path parameter. Returned jsonUrl points to the equivalent /mandate/{symbol}.json representation.',
          parameters: [
            {
              name: 'symbol',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              example: 'A/RES/79/1',
            },
            parameters.find((parameter) => parameter.name === 'ppb_version'),
          ],
          responses: {
            '200': {
              description:
                'The summary record of the document, with the same fields as a search result.',
              ...json(ref('DocumentResponse')),
            },
            '404': {
              description: 'Document not found.',
              ...json(ref('Error')),
            },
            ...errors,
          },
        },
      },
      '/api/v1/agendas': {
        get: {
          operationId: 'getAgendas',
          summary: 'Browse intergovernmental agendas',
          description:
            'The hierarchy shown in the Intergovernmental Agendas tab, including allocations, available meeting counts, subtree resolution counts and related agenda clusters. Defaults to GA and the website’s preferred available session. SC uses a year as its session. Null counts and unavailable status mean missing data, not zero. The whole tree is returned in one response. Serialize a node’s scope as agenda_scope in document search to retrieve its documents.',
          parameters: [
            {
              name: 'body',
              in: 'query',
              required: false,
              schema: {
                type: 'string',
                enum: ['GA', 'SC', 'ECOSOC', 'HRC'],
                default: 'GA',
              },
              description: 'Intergovernmental body.',
            },
            {
              name: 'session',
              in: 'query',
              required: false,
              schema: { type: 'string', pattern: '^\\d{1,4}$' },
              description:
                'Session from the returned sessions array; for SC this is a year. Omit to use the same default as the website. Unknown sessions return 400.',
            },
          ],
          responses: {
            '200': {
              description:
                'Complete agenda tree, sessions, counts and related items. An empty status means no agenda is available for the body.',
              ...json(ref('AgendaResponse')),
            },
            ...errors,
          },
        },
      },
      '/api/v1/programmes': {
        get: {
          operationId: 'getProgrammes',
          summary: 'Browse entities, programmes and budget locations',
          description:
            'The complete Entities and Programmes tab data: a flat tree keyed by id/parentId, document counts, expenditure matches keyed by row ID, and programme clusters. Includes official locations without citations. Serves only the latest available budget cycle, matching this tab; the response identifies that cycle. Historical cycles are not supported and ppb_version selectors return 400. The whole tree is returned in one response. Expenditure amounts are budget-location figures, not allocations to documents.',
          responses: {
            '200': {
              description:
                'Complete entity/programme tree, latest-cycle metadata, expenditure matches and cluster membership.',
              ...json(ref('ProgrammeResponse')),
            },
            ...errors,
          },
        },
      },
      '/api/v1/reference': {
        get: {
          operationId: 'getReference',
          summary:
            'Get entities, organs, programme hierarchy and budget cycles',
          parameters: [
            parameters.find((parameter) => parameter.name === 'ppb_version'),
          ],
          responses: {
            '200': {
              description:
                'Reference codes and programme hierarchy for the selected cycle.',
              ...json(ref('Reference')),
            },
            ...errors,
          },
        },
      },
      '/api/v1/exports': {
        get: {
          operationId: 'exportDocuments',
          summary: `Download up to ${EXPORT_ROW_CAP.toLocaleString('en-US')} matching documents`,
          description: `Document summaries for a filtered selection of at most ${EXPORT_ROW_CAP.toLocaleString('en-US')} documents; a larger selection returns 400 with the total, never a shortened file. The include parameter is not accepted (400). CSV has a standard column header without repeated file-level metadata; metadata is included in Excel/JSON. JSON downloads use indented regular JSON. Ignores page/limit and lists grouped documents individually. Excel contains Documents, Budget citations and About this export sheets. Live batches are not a frozen database snapshot. A failed stream is an incomplete download and must be retried.`,
          parameters: [
            ...parameters.filter(
              (parameter) => !['page', 'limit'].includes(parameter.name)
            ),
            {
              name: 'format',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['csv', 'xlsx', 'json'],
                default: 'csv',
              },
            },
          ],
          responses: {
            '200': {
              description:
                'Attachment containing every matching document, as summaries.',
              headers: {
                'Content-Disposition': { schema: { type: 'string' } },
              },
              content: {
                'text/csv': { schema: { type: 'string' } },
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                  { schema: { type: 'string', format: 'binary' } },
                'application/json': { schema: ref('Export') },
              },
            },
            ...errors,
          },
        },
      },
    },
    components: {
      schemas: {
        BudgetVersion: z.toJSONSchema(budgetVersionSchema),
        Document: z.toJSONSchema(publicDocumentSchema),
        DocumentResponse: z.toJSONSchema(documentResponseSchema),
        DocumentList: z.toJSONSchema(listResponseSchema),
        AgendaResponse: z.toJSONSchema(agendaResponseSchema),
        ProgrammeResponse: z.toJSONSchema(programmeResponseSchema),
        Reference: {
          type: 'object',
          required: [
            'apiVersion',
            'budgetVersion',
            'budgetVersions',
            'entities',
            'organs',
            'programmes',
          ],
          properties: {
            apiVersion: { type: 'string' },
            budgetVersion: ref('BudgetVersion'),
            budgetVersions: { type: 'array', items: ref('BudgetVersion') },
            entities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  entity: { type: 'string' },
                  entity_long: { type: 'string' },
                },
              },
            },
            organs: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
            programmes: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        },
        Export: {
          type: 'object',
          required: ['metadata', 'documents', 'exportedDocuments'],
          properties: {
            metadata: {
              type: 'object',
              description:
                'Generation time, resolved filters/cycle, expected count, grouping, coverage and live-read consistency note.',
              additionalProperties: true,
            },
            documents: { type: 'array', items: ref('Document') },
            exportedDocuments: {
              type: 'integer',
              description:
                'Actual number written; may differ from the initial count if live source data changes.',
            },
          },
        },
        Error: {
          type: 'object',
          required: ['error'],
          properties: { error: { type: 'string' } },
        },
      },
    },
  }
}
