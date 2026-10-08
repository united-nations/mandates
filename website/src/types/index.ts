import type { DocumentTextMetrics } from '@/lib/text-analytics'

// Core data types based on the DB schema (mandates.paragraphs)
export interface Paragraph {
  /** Source footnote boundaries measured in UTF-16 code units into text. */
  note_references?: { note_id: number; offset: number }[]
  note_ids?: number[]
  footnotes?: Paragraph[]
  /** Document-level quality flag; internal issue details stay on the server. */
  extraction_quality_warning?: boolean
  subtype?: string
  parser_version?: string
  source?: 'digitallibrary'
  source_symbol?: string
  part_letter?: string
  /** UUID from mandates.paragraphs */
  id?: string
  /** 0-based position within the document */
  position?: number
  text: string
  type: string // "title", "paragraph", "heading", etc.
  heading_level: number | null
  paragraph_type: string | null // "preambular", "operative", etc.
  paragraph_level: number | null
  prefix: string | null // "1.", "(a)", "(i)", etc.
  /** Links from mandates.paragraph_links: [linked_symbol, linked_url] pairs */
  links: [string, string][] | []
  mandates?: {
    action_verb: string
    action_verb_normalized?: string
    action_verb_type: string
    assignees: {
      assignee: string
      assignee_normalized: string
      assignee_type: string
    }[]
    mentioned_entities: {
      mentioned_entity: string
      mentioned_entity_normalized: string
      mentioned_entity_type: string
    }[]
    deliverables: {
      deliverable: string
      deliverable_normalized: string
      deliverable_type: string
    }[]
  }[]
  /** NLP highlight annotations (from text_with_highlights column) */
  textWithHighlights?: string
  /** Uncertainty annotations from the extraction pipeline */
  uncertainties?: string
  /**
   * Structural metadata from the Digital Library semantic fulltext layer
   * (digitallibrary.document_paragraphs). Undefined for mandates.paragraphs rows.
   * Not consumed by the UI yet — reserved for future annex/omnibus rendering.
   */
  section?: string
  annex_index?: number
  text_index?: number
}

export interface Mandate {
  text_metrics?: DocumentTextMetrics
  full_document_symbol: string
  num_citations: number
  num_entities: number
  entities: string[]
  /**
   * The subset of `entities` that cite this document in their "Mandates and
   * background" narrative — see lib/foundational.ts. Pair-level: a document can
   * be foundational for UNEP and routine for DESA.
   */
  foundational_entities?: string[]
  link: string | null
  //   priority_area: string
  year: string
  body: string
  //   pillar: string
  //   entity_long: string
  description: string | null
  /**
   * Digital Library-derived display title (from unified_documents.display_title):
   * the clean, catalogue-quality title covering resolutions/decisions/PRSTs incl.
   * DL-only docs. Preferred by getMandateDisplayTitle; falls back to the raw
   * description when absent.
   */
  display_title: string | null
  type: string
  citation_info: {
    origin_document: string
    budget_part: string
    section: string
    section_title: string
    entity_long: string
    entity: string
    programme: number | null
    programme_title: string
    'sub-programme': string | null
    component: string | number | null
    description: string
    part_in_document: string
  }[]
  // Enriched fields (added by API)
  body_long?: string
  displayTitle?: string
  document_symbol: string | null
  uniform_title: string[] | null
  proper_title: string | null
  title: string | null
  subtitle: string | null
  subject_headings: string[]
  issuing_body?: string | null
  agenda_document_symbols?: string[]
  agenda_item_numbers?: string[]
  agenda_item_titles?: string[]
  paragraphs?: Paragraph[] | null
  /**
   * Every place in the budget this document is cited, for the active budget
   * version. Populated by the list query and by the detail page; empty for
   * documents whose only citations are PKM or Plan Outline ones, which sit
   * outside the part structure.
   */
  budget_locations?: BudgetLocation[]
  /** Detail-only citation sites, including unclassified and non-PPB citations. */
  detail_budget_locations?: DetailBudgetLocation[]
  /** Distinct mandate documents per citing entity, independently counted. */
  citation_entity_totals?: Record<string, number>
  text?: string

  // Resolution series facts (migration 021; null/absent when not in a series)
  series?: MandateSeriesInfo | null
  // Grouped mode only: this row represents a series and carries its matching co-members
  group?: MandateGroupInfo | null

  // Search-related fields
  searchScore?: number
  highlightedTitle?: string
  highlightedFields?: { [key: string]: string }
  match_details?: Array<{ field: string; value: string }>
}

// Budget hierarchy types
//
// The regular-budget containment is
// Part ⊃ Programme ⊃ Section ⊃ Entity ⊃ Subprogramme, but programme is not a
// level of its own here: every section belongs to exactly one programme, so the
// programme number and title ride along on the section without losing anything.
// (Only two programmes group more than one section — 10 over sections 12–13 and
// 25 over 29A–29F — which just shows the same programme label on sibling
// sections.) PKM and Plan Outline citations sit outside this structure and
// carry no part.

/**
 * One citation's place in the budget, as shown in the Budget location column.
 * The stream is always present; part/section only exist for the ppb stream
 * (pko carries an entity but no part/section, plan_outline neither).
 */
export interface BudgetLocation {
  stream: BudgetStreamType
  part: string | null
  part_title: string | null
  section: string | null
  section_title: string | null
  programme: number | null
  programme_title: string | null
  entity: string | null
  entity_long: string | null
  /** Composed label, e.g. "Subprogramme 2. Inclusive social development" */
  subprogramme: string | null
  subprogramme_number: number | null
  /** pko only: an individual mission (false) vs. the shared support account (true). */
  is_support?: boolean
  /**
   * Distinct mandate documents at this exact citation scope, including this
   * document. General citations count their own subset, not the whole section.
   * Absent/null when totals have not been fetched (e.g. list-query locations).
   */
  total_citations_at_location?: number | null
}

export type DetailBudgetLocation = Omit<BudgetLocation, 'stream'> & {
  stream: BudgetStreamType | null
}

export interface BudgetSubprogrammeNode {
  subprogramme: string
  number: number | null
  count: number
}

export interface BudgetEntityNode {
  entity: string
  entity_long: string | null
  count: number
  subprogrammes: BudgetSubprogrammeNode[]
}

export interface BudgetSectionNode {
  section: string
  section_title: string
  programme: number | null
  programme_title: string | null
  count: number
  entities: BudgetEntityNode[]
}

export interface BudgetPartNode {
  part: string
  part_title: string
  count: number
  sections: BudgetSectionNode[]
}

// Budget streams (top level of the hierarchy) — the budget-document type a
// citation comes from. Every citing entity lives in exactly one stream:
//   ppb          — Proposed Programme Budget: Part → Section → Entity → Subprogramme.
//   pko          — Peacekeeping Operations financing: Missions + Support account.
//   plan_outline — the strategic Plan Outline: no sub-structure (a leaf).
// Which concrete document backs each stream depends on the active budget
// version; the type is stable across versions (see ppb2026.budget_documents.doc_type).
export type BudgetStreamType = 'ppb' | 'pko' | 'plan_outline'

/** One group inside the Peacekeeping Operations stream. */
export interface BudgetPkoGroupNode {
  group: 'missions' | 'support'
  label: string
  count: number
  entities: BudgetEntityNode[]
}

export type BudgetStream =
  | { type: 'ppb'; label: string; count: number; parts: BudgetPartNode[] }
  | { type: 'pko'; label: string; count: number; groups: BudgetPkoGroupNode[] }
  | { type: 'plan_outline'; label: string; count: number }

/**
 * Catalogue-wide document types (see getDocumentTypeCatalogue).
 *
 * `untypedCount` is deliberately part of the payload: `ppb_type` is unpopulated
 * for a large share of the catalogue, so `types` is NOT a complete partition and
 * the UI has to be able to say so.
 */
export interface DocumentTypeCatalogue {
  /** Recorded types, highest count first. */
  types: { value: string; count: number }[]
  /** Documents whose type is not recorded (NULL/empty ppb_type). */
  untypedCount: number
  /** Every document in scope — `types` counts + `untypedCount`. */
  totalCount: number
}

// Subject hierarchy (top level of the /subjects page) — the UNBIS thesaurus
// imposed on the flat subject headings carried on unified_documents.subjects.
// Three levels: domain (01-18) -> sub-domain -> leaf subject. `count` is
// documents at that level; counts overlap across domains because a subject may
// map to more than one domain (see getSubjectHierarchy).

/** A leaf subject heading; links to /secretariat?subject=<subject>. */
export interface SubjectLeaf {
  /** Title-cased display heading, also used verbatim as the filter value. */
  subject: string
  count: number
}

/** A UNBIS sub-domain grouping leaf subjects within a domain. */
export interface SubjectSubdomain {
  label: string
  uri: string | null
  count: number
  subjects: SubjectLeaf[]
}

/** A top-level UNBIS subject domain (01-18). */
export interface SubjectDomain {
  code: string
  label: string
  uri: string
  count: number
  /** Subjects that map to the domain but to no sub-domain (rendered first). */
  directSubjects: SubjectLeaf[]
  subdomains: SubjectSubdomain[]
}

// Entity types
export interface Entity {
  entity: string
  entity_long: string
}

export interface EntityWithCount {
  entity: string
  entity_long: string
  count: number
}

// Organ types
export interface Organ {
  short: string
  long: string
  website?: string
}

export interface OrganWithCount {
  short: string
  long: string
  count: number
  website?: string
}

/**
 * The filter keys a /secretariat explore directory can set.
 */
export type DirectoryFilterKey =
  'organ' | 'entity' | 'subprogramme' | 'subject' | 'document_type'

/**
 * How a directory (organs / entities / documents) talks to the filter state.
 *
 * Injected by DirectoryExplorer rather than read from useSectionFilter inside
 * each directory, because the correct write depends on WHICH card the directory
 * sits under: the card's counts are computed against a particular scope and with
 * a particular dimension dropped, and the write has to match that exactly or the
 * number on a node stops predicting the number of rows clicking it returns.
 */
export interface DirectorySelection {
  /** The active value for `key`, so a node can render itself as selected. */
  active: (key: DirectoryFilterKey) => string | undefined
  /** Apply (or, if already active, clear) `key = value`. */
  select: (key: DirectoryFilterKey, value: string) => void
}

// Organs grouped by editorial category (see lib/organ-groups.ts), for the
// /organs directory and the grouped Organ column filter.
export interface OrganGroup {
  id: string
  label: string
  organs: OrganWithCount[]
}

// Filter types
export interface MandateSeriesInfo {
  superseded_by: string | null
  is_collection: boolean
  has_newer: boolean
  is_latest: boolean
  series_count: number
}

export interface MandateGroupInfo {
  /** number of documents in this group matching the current filters */
  size: number
  min_year: number | null
  max_year: number | null
  /** matching co-members (representative excluded), newest first, capped at 100 */
  members: {
    symbol: string
    year: number | null
    title: string | null
    text_metrics?: DocumentTextMetrics
  }[]
}

export interface FilterOptions {
  entity?: string
  organ?: string
  crossCitingEntity?: string
  keyword?: string
  /** Budget part, as a roman numeral ("IV"). */
  budget_part?: string
  /** Budget section, as printed ("9", "29A"). */
  section?: string
  /** Composed subprogramme label ("Subprogramme 2. Inclusive social development"). */
  subprogramme?: string
  /** "true" to keep only foundational citations (see lib/foundational.ts). */
  foundational?: string
  /**
   * Superseded by `section` — every section has exactly one programme. Kept so
   * that existing ?programme= links keep working.
   */
  programme?: string
  subject?: string
  /** UNBIS thesaurus subject domain, as a two-digit code ("01".."18"). */
  subject_domain?: string
  start_year?: string
  end_year?: string
  budget_document?: string
  /** Exact peacekeeping citation group, independent of financial scopes. */
  budget_group?: string
  /** Full path encoded as one visible/removable budget-location filter. */
  budget_location?: string
  document_type?: string
  agenda_item?: string
  /** Body, referenced agenda session and official item/subitem rollup. */
  agenda_scope?: string
  full_document_symbol?: string
  min_citations?: string
  max_citations?: string
  /**
   * '1' narrows the catalogue to the documents the selected budget version
   * cites as mandates. Replaces the former `mode` scope switch, which also
   * decided (invisibly) whether citation data was version-scoped at all.
   */
  cited?: string
  /**
   * The budget version the page is read through: which PPB supplies the
   * citation counts, entities and budget locations shown against every
   * document. Absent = the DB default (ppb2026.budget_versions.is_default).
   */
  ppb_version?: string
  /** '1' collapses the list to one row per resolution series (group versions) */
  group?: string
  sort_by?: string
  page?: string
  limit?: string
}

// Cross-citation types
export interface CrossCitation {
  entity: string
  entity_long: string
  count: number
}

// Citation distribution types
export interface CitationBin {
  bin: string
  count: number
  minCitations: number
  maxCitations: number
}

// API Response types
export interface ApiResponse {
  // Paginated mandate results
  mandates: Mandate[]
  pagination: {
    page: number
    limit: number
    totalPages: number
    totalItems: number
  }

  // Data for cards
  counts: {
    totalDocuments: number
    totalEntities: number
    totalOrgans: number
    totalCitations: number
  }

  // Sidebar data (already filtered)
  sidebar: {
    entities: EntityWithCount[]
    organs: OrganWithCount[]
    crossCitations: CrossCitation[]
    citationDistribution: CitationBin[]
  }

  // Filter options for dropdowns
  filterOptions: {
    budgetHierarchy: BudgetStream[]
    programmes: { value: string; count: number }[]
    subjects: { value: string; count: number }[]
    documentTypes: { value: string; count: number }[]
    agendaItems: { value: string; count: number }[]
    yearRange: { min: number; max: number }
    yearDistribution: Record<string, number>
    yearDistributionUnfiltered: Record<string, number>
    budgetVersions: {
      slug: string
      display_name: string
      ppb_year: number
      is_default: boolean
      sort_order: number
    }[]
  }

  // Reference data for display
  reference: {
    entities: Entity[]
    organs: Organ[]
  }
}

// UN system directory (src/data/un-system.json)
/**
 * The six CEB-derived categories. See `docs/un-system-scope.md` for the
 * inclusion rule and how each entity is assigned.
 */
export type UnSystemGrouping =
  | 'secretariat'
  | 'fund-programme'
  | 'specialized-agency'
  | 'related-organization'
  | 'regional-commission'
  | 'joint-hosted'

export interface UnSystemPage {
  label: string | null
  url: string
}

export interface UnSystemContact {
  label: string | null
  url?: string
  email?: string
}

export interface UnSystemBody {
  name: string
  url?: string
  /** True when `url` is a shared governing-bodies overview page rather than a page about this specific body. */
  overview?: boolean
  contacts?: UnSystemContact[]
  note?: string
}

/** A governing-body entry: either a reference into the shared bodies registry or an inline body. */
export type UnSystemBodyEntry = { ref: string } | UnSystemBody

export type UnSystemRegistryPoint =
  'documents' | 'mandates' | 'budget' | 'implementation' | 'results'

/** true = point earned; 'partial' = half a point (linked but weak form). */
export type UnSystemPointValue = boolean | 'partial'

/** One point's state plus the org-specific evidence note from the research dossier. */
export interface UnSystemPointEntry {
  value: UnSystemPointValue
  note: string | null
}

/**
 * An organization's mandate-registry-like system, scored on the 5-point
 * scheme in docs/un-system-registries.md (documents · active mandates ·
 * budget-linked · implementation-linked · results-linked). Points 3–5 count
 * only when tied to specific governing-body decisions, not to strategic
 * plans or org-wide totals. `interoperability` (point 6) is reserved.
 */
export interface UnSystemRegistry {
  /**
   * Set on this site's own registry, to distinguish it from the registry the
   * organization itself runs. An entity can have both: its own system, plus
   * our coverage of the mandates it is cited for in the UN programme budget.
   */
  scope?: 'this-site'
  /** Short proper name of the system, used as the link text, e.g. "Resolutions Portal". */
  name: string
  /** Taxonomy category, shown in the link tooltip, e.g. "Resolutions Database". */
  category: string
  url: string
  points: Record<UnSystemRegistryPoint, UnSystemPointEntry>
  interoperability: null
}

/**
 * Anything else the organization publishes that helps trace its work: document
 * and session indexes, governance and statute pages, budget/results/transparency
 * portals. Rendered smaller than the scored registries, in the same column.
 */
export interface UnSystemResource {
  name: string
  url: string
  /** Render at registry weight without being scored — presentation, not evidence. */
  prominent?: true
}

export interface UnSystemEntity {
  code: string
  name: string
  /** The organization's own front page; the code in the first column links here. */
  homepage: string
  grouping: UnSystemGrouping
  /** Secretariat is part of the UN Secretariat, though the entity is governed separately (the UN80 chart's asterisk). */
  secretariatAdministered?: true
  /** Contacts live on the body they service — see `UnSystemBody.contacts`. */
  governingBodies: UnSystemBodyEntry[]
  note: string | null
  /**
   * Every registry covering this organization's mandates, the organization's
   * own first and this site's (`scope: 'this-site'`) last. Empty when none
   * exists — see registryNote.
   */
  mandateRegistry: UnSystemRegistry[]
  /** Shown when the organization runs no registry itself: why there is none (or where it lives instead). */
  registryNote: string | null
  resources: UnSystemResource[]
}

export interface UnSystemData {
  bodies: Record<string, UnSystemBody>
  organizations: UnSystemEntity[]
}
