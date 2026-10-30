import { z } from 'zod'
const nullableString = z.string().nullable()
export const budgetVersionSchema = z.object({
  slug: z.string(),
  display_name: z.string(),
  ppb_year: z.number(),
  is_default: z.boolean(),
  sort_order: z.number(),
})
export const locationSchema = z
  .object({
    stream: nullableString,
    part: nullableString,
    part_title: nullableString,
    section: nullableString,
    section_title: nullableString,
    programme: z.number().nullable(),
    programme_title: nullableString,
    entity: nullableString,
    subprogramme: nullableString,
    subprogramme_number: z.number().nullable(),
  })
  .passthrough()
export const paragraphSchema = z
  .object({
    id: z.string(),
    position: z.number(),
    text: z.string(),
    type: z.string(),
    source: z.literal('digitallibrary'),
    heading_level: z.number().nullable(),
    paragraph_type: nullableString,
    paragraph_level: z.number().nullable(),
    prefix: nullableString,
    links: z.array(z.tuple([z.string(), z.string()])),
  })
  .passthrough()
export const citationSchema = z.object({
  origin_document: z.string(),
  entity: z.string(),
  entity_long: z.string(),
  budget_part: z.string(),
  budget_part_number: nullableString,
  budget_part_title: nullableString,
  section: z.string(),
  section_title: z.string(),
  programme: z.number().nullable(),
  programme_title: z.string(),
  'sub-programme': nullableString,
  sub_programme_number: z.number().nullable(),
  sub_programme_title: nullableString.describe(
    'Title or an unnumbered source label, such as All Subprogrammes. The original combined label is retained in sub-programme.'
  ),
  component: nullableString,
  description: z.string(),
  part_in_document: z.string(),
})
export const seriesSummarySchema = z.object({
  latest_version: nullableString.describe(
    'Latest version symbol when a unique ordered version is known; null for collections or ambiguous series.'
  ),
  is_collection: z.boolean(),
  has_newer: z.boolean(),
  is_latest: z.boolean(),
  series_count: z.number(),
})
export const seriesSchema = seriesSummarySchema.extend({
  first_year: z.number().nullable(),
  last_year: z.number().nullable(),
  members: z.array(
    z.object({
      document_symbol: z.string(),
      title: nullableString,
      year: z.number().nullable(),
      is_latest: z.boolean(),
      text_metrics: z.record(z.string(), z.unknown()).optional(),
    })
  ),
})
const groupSchema = z
  .object({
    size: z.number(),
    min_year: z.number().nullable(),
    max_year: z.number().nullable(),
    members: z.array(
      z.object({
        symbol: z.string(),
        year: z.number().nullable(),
        title: nullableString,
      })
    ),
  })
  .nullable()
export const expenditureSchema = z.union([
  z.object({
    status: z.literal('matched'),
    amount: z
      .number()
      .describe(
        'USD expenditure for the entity/location, not allocation to this resolution.'
      ),
    period: z.string(),
    funding: z.object({
      regular_budget: z.number().optional(),
      other_assessed: z.number().optional(),
      extrabudgetary: z.number().optional(),
    }),
    nodeIds: z.array(z.string()),
    sources: z.array(
      z.object({ symbol: z.string().optional(), url: z.string().optional() })
    ),
    datasetUrl: z.string(),
    openUrl: z.string(),
  }),
  z.object({
    status: z.literal('unavailable'),
    reason: z.enum([
      'dco_scope',
      'unsoh_period',
      'not_matched',
      'ambiguous',
      'source_unavailable',
    ]),
  }),
])

const agendaBodySchema = z.enum(['GA', 'SC', 'ECOSOC', 'HRC'])
const relatedAgendaItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  href: z.string().optional(),
  members: z.array(
    z.object({
      id: z.string(),
      body: agendaBodySchema,
      title: z.string(),
      current: z.boolean(),
      occurrences: z.array(
        z.object({
          id: z.string(),
          session: z.string(),
          item: z.string(),
          resolutionCount: z.number().int().nonnegative().optional(),
          status: z.enum(['verified', 'unsupported']),
          reason: z.string().optional(),
          href: z.string().optional(),
          referenceNote: z.string().optional(),
        })
      ),
    })
  ),
})
export const agendaResponseSchema = z.object({
  apiVersion: z.string(),
  status: z.enum(['ready', 'empty']),
  body: agendaBodySchema,
  sessions: z.array(z.string()),
  session: z.string().optional(),
  coverage: z.enum(['complete', 'partial']).optional(),
  dataCutoff: z.string().optional(),
  resolutionCountsStatus: z.enum(['ready', 'unavailable']).optional(),
  relatedCountsStatus: z.enum(['ready', 'unavailable']).optional(),
  nodes: z.array(
    z.object({
      id: z.string(),
      item: z.string(),
      titles: z.array(z.string()),
      allocations: z.array(z.string()),
      heading: z.string(),
      parentId: z.string().optional(),
      depth: z.number().int().nonnegative(),
      scope: z
        .object({
          body: agendaBodySchema,
          session: z.string(),
          item: z.string(),
          items: z.array(z.string()),
        })
        .describe(
          'Serialize this object as the agenda_scope document-search parameter.'
        ),
      meetingCount: z.number().int().nonnegative().optional(),
      resolutionCount: z
        .number()
        .int()
        .nonnegative()
        .nullable()
        .describe(
          'Null means the count is unavailable; zero is a known empty result. Counts include the item subtree.'
        ),
      titleDifferences: z.array(z.string()),
      relatedItems: z.array(relatedAgendaItemSchema),
    })
  ),
})

export const programmeResponseSchema = z.object({
  apiVersion: z.string(),
  budgetVersion: budgetVersionSchema,
  rows: z.array(
    z.object({
      id: z.string(),
      parentId: z.string().optional(),
      depth: z.number().int().nonnegative(),
      kind: z.enum([
        'stream',
        'part',
        'section',
        'group',
        'entity',
        'subprogramme',
        'programme',
        'component',
      ]),
      label: z.string(),
      detail: z.string().optional(),
      count: z
        .number()
        .int()
        .nonnegative()
        .describe('Document count for this location, including its subtree.'),
      entityCode: z.string().optional(),
      hasChildren: z.boolean(),
      citationAvailable: z
        .boolean()
        .optional()
        .describe(
          'False for official locations without a citation-backed document scope.'
        ),
    })
  ),
  expenditures: z
    .record(z.string(), expenditureSchema)
    .describe(
      'Expenditure matches keyed by row ID. Amounts describe budget locations, not individual documents. Preserve period, status and provenance.'
    ),
  clusters: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      nodeIds: z.array(z.string()),
      unsupportedCount: z.number().int().nonnegative().optional(),
      reason: z.string().optional(),
    })
  ),
})
const reportBase = z.object({
  report_recid: z.number(),
  title: nullableString,
  date_published: nullableString,
})
const catalogueReportSchema = reportBase.extend({
  report_symbol: z.string(),
  annex_position_only: z.boolean(),
  resolution_symbols: z.array(z.string()).optional(),
  annex_resolution_symbols: z.array(z.string()).optional(),
})
const pageOneReportSchema = reportBase.extend({
  report_symbols: z.array(z.string()),
  resolution_symbols: z.array(z.string()).optional(),
})
const provenanceSchema = z.enum(['page_one', 'catalogue_notes', 'both'])
export const unionReportSchema = reportBase.extend({
  symbols: z.array(z.string()),
  provenance: provenanceSchema,
  catalogueAnnexOnly: z.boolean().nullable(),
  resolutionLinks: z
    .array(
      z.object({
        symbol: z.string(),
        provenance: provenanceSchema,
        catalogueAnnexOnly: z.boolean().nullable(),
      })
    )
    .optional(),
})
const reportsSchema = z.union([
  z.object({
    source: z.literal('catalogue_notes'),
    reports: z.array(catalogueReportSchema),
  }),
  z.object({
    source: z.literal('page_one'),
    data: z.union([
      z.object({ acceptedRunId: z.null() }),
      z.object({
        acceptedRunId: z.string(),
        reports: z.array(pageOneReportSchema),
      }),
    ]),
  }),
  z.object({
    source: z.literal('union'),
    data: z.object({
      pageOneAccepted: z.boolean(),
      reports: z.array(unionReportSchema),
    }),
  }),
])
export const detailsSchema = z.object({
  status: z.literal('included'),
  citations: z.array(citationSchema),
  budgetLocations: z.array(locationSchema),
  foundationalEntities: z.array(z.string()),
  entityCitationTotals: z.record(z.string(), z.number()),
  entityExpenditures: z.record(z.string(), expenditureSchema),
  budgetLocationExpenditures: z.array(
    z.object({ location: locationSchema, expenditure: expenditureSchema })
  ),
  paragraphs: z.object({
    status: z.enum(['available', 'unavailable']),
    language: z.literal('en'),
    items: z.array(paragraphSchema),
  }),
  versionHistory: seriesSchema.nullable(),
  reports: z.union([
    z.object({ status: z.literal('not_included') }),
    z.object({
      status: z.literal('included'),
      data: reportsSchema,
    }),
  ]),
  relatedDocuments: z.union([
    z.object({ status: z.literal('not_included') }),
    z.object({
      status: z.literal('included'),
      items: z.array(z.record(z.string(), z.unknown())),
    }),
  ]),
})
export const publicDocumentSchema = z.object({
  symbol: z.string(),
  title: z.string(),
  issuingBody: nullableString,
  year: z.number().nullable(),
  documentType: z.string(),
  subjects: z.array(z.string()),
  agendaItems: z.object({
    numbers: z.array(z.string()),
    titles: z.array(z.string()),
  }),
  sourceUrl: nullableString,
  pageUrl: z.string(),
  canonicalUrl: z.string(),
  jsonUrl: z.string(),
  budgetVersion: z.string(),
  matchingCitationCount: z.number(),
  matchingEntityCount: z.number(),
  matchingEntities: z.array(z.string()),
  matchingFoundationalEntities: z.array(z.string()),
  matchingProgrammes: z.array(z.string()),
  matchingBudgetLocations: z.array(locationSchema),
  series: seriesSummarySchema.nullable(),
  group: groupSchema,
  details: z.union([
    z.object({ status: z.literal('not_included') }),
    detailsSchema,
  ]),
})
export const documentResponseSchema = z.object({
  apiVersion: z.string(),
  budgetVersion: budgetVersionSchema,
  coverage: z.array(z.string()),
  document: publicDocumentSchema,
})
export const listResponseSchema = z.object({
  apiVersion: z.string(),
  budgetVersion: budgetVersionSchema,
  coverage: z.array(z.string()),
  items: z.array(publicDocumentSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
})
