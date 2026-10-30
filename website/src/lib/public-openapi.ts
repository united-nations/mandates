import { z } from 'zod'
import { FILTER_PARAMS } from '#lib/filter-constants'
import { API_VERSION, COVERAGE_NOTES } from '#lib/public-api'
import {
  budgetVersionSchema,
  publicDocumentSchema,
  documentResponseSchema,
  listResponseSchema,
  detailsSchema,
  paragraphSchema,
  citationSchema,
  seriesSchema,
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
    'Set to `1` to group matching versions in list responses. Exports always expand all matching documents.',
  sort_by:
    '`citing_entities_desc` (default), `citing_entities_asc`, `citations_desc`, `citations_asc`, `year_desc`, `year_asc`, `similarity_desc`, `similarity_asc`, `word_count_desc` or `word_count_asc`. Keyword matches rank first; symbol breaks ties.',
  page: '1-based page. No overall traversal limit.',
  limit:
    'Page size, default 15, maximum 100; larger values are normalized to 100. Exports ignore `page` and `limit`.',
}
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` })
const json = (schema: object) => ({
  content: { 'application/json': { schema } },
})
const errors = {
  '400': {
    description:
      'Malformed or repeated known query parameter, unsupported selector/include/format, or unknown body, session or budget cycle.',
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
      ? { type: 'integer', minimum: ['page', 'limit'].includes(name) ? 1 : 0 }
      : { type: 'string' },
  }))
  const include = {
    name: 'include',
    in: 'query',
    required: false,
    description:
      'Expand the complete selected-cycle sidebar data, independently of search citation filters.',
    schema: { type: 'string', enum: ['details'] },
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'UN Mandate Registry API',
      version: API_VERSION,
      description: `Public, read-only access to documents, extracted paragraphs, budget citations and resolution relationships. No authentication required. ${COVERAGE_NOTES.join(' ')}\nUse returned pageUrl/jsonUrl links verbatim. This API does not determine legal in-force status.`,
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
          parameters: [...parameters, include],
          responses: {
            '200': {
              description:
                'One page of matching documents. Follow pagination.hasMore; page size does not cap total traversal. An out-of-range page retains total and has no items.',
              ...json(ref('DocumentList')),
            },
            ...errors,
          },
        },
      },
      '/api/v1/documents/{symbol}': {
        get: {
          operationId: 'getDocument',
          summary: 'Get a document and its complete details',
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
                'The document, available extracted English paragraphs and selected-cycle sidebar details.',
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
            'The hierarchy shown in the Intergovernmental Agendas tab, including allocations, available meeting counts, subtree resolution counts and related agenda clusters. Defaults to GA and the website’s preferred available session. SC uses a year as its session. Null counts and unavailable status mean missing data, not zero. No pagination or result cap. Serialize a node’s scope as agenda_scope in document search to retrieve its documents.',
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
            'The complete Entities and Programmes tab data: a flat tree keyed by id/parentId, document counts, expenditure matches keyed by row ID, and programme clusters. Includes official locations without citations. Serves only the latest available budget cycle, matching this tab; the response identifies that cycle. Historical cycles are not supported and ppb_version selectors return 400. No pagination or result cap. Expenditure amounts are budget-location figures, not allocations to documents.',
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
          summary: 'Download every matching document',
          description:
            'Streamed download with no total result cap. CSV has a standard column header without repeated file-level metadata; metadata is included in Excel/JSON. JSON downloads use indented regular JSON. Ignores page/limit and expands grouped versions. JSON supports include=details. Excel contains Documents, Budget citations, Version relationships and About this export sheets. Live batches are not a frozen database snapshot. A failed stream is an incomplete download and must be retried.',
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
            include,
          ],
          responses: {
            '200': {
              description:
                'Attachment containing all matching documents. Full details are available for JSON only.',
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
        DocumentDetails: z.toJSONSchema(detailsSchema),
        Paragraph: z.toJSONSchema(paragraphSchema),
        BudgetCitation: z.toJSONSchema(citationSchema),
        VersionHistory: z.toJSONSchema(seriesSchema),
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
                'Generation time, resolved filters/cycle, expected count, grouping, coverage, detail inclusion and live-read consistency note.',
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
