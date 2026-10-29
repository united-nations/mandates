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
  section: z.string(),
  section_title: z.string(),
  programme: z.number().nullable(),
  programme_title: z.string(),
  'sub-programme': nullableString,
  component: nullableString,
  description: z.string(),
  part_in_document: z.string(),
})
export const seriesSummarySchema = z.object({
  superseded_by: nullableString,
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
