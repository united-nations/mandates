/**
 * Centralized explainer texts for the UN80 Mandate Registry
 * This file contains all help text, tooltips, and explanations used throughout the app
 */

export const explainerTexts = {
  // Main page and overview
  mainHeader: {
    title: 'UN Mandate Registry',
    headline: 'See what the UN is asked to do.',
    versionTag: 'Beta Version',
    shortDescription:
      'Developed as part of the UN80 Initiative, this registry serves as a transparency tool for understanding UN mandates and programmes.',
    shortDescriptionPlain:
      'Developed as part of the UN80 Initiative, this registry serves as a transparency tool for understanding UN mandates and programmes.',
    un80Link: 'https://www.un.org/un80-initiative/en',
    mandateImplementationLink:
      'https://www.un.org/un80-initiative/en/report-mandate-implementation-review',
    fullDescription: [
      'This version of the registry provides access to mandate source documents cited by UN Entities in support of resource requirements in the Proposed UN Programme Budget for 2026 and 2027 and the Peacekeeping Budget for 2025/2026 and 2026/2027. The Registry serves as a technical reference to assist Member States in assessing current mandate implementation arrangements across the UN System.',
    ],
    disclaimer:
      'As the list of UN Entities in this registry is derived from the budget submissions to the General Assembly, it includes Entities that are independent of the Secretariat and the Secretary-General. The inclusion of these Entities here is for reference only and is not intended to indicate that they are within the scope of the UN80 Initiative.',
  },

  // /system page hero
  systemHeader: {
    headline: 'Trace mandates across the UN System.',
  },

  // Page metadata (reuses mainHeader content)
  get pageMetadata() {
    return {
      title: this.mainHeader.title,
      description: this.mainHeader.shortDescriptionPlain,
    }
  },

  // Data Cards (Summary Statistics)
  dataCards: {
    sectionTitle: 'Mandate Source Documents',
    sourceDocuments: {
      title: 'Source Documents',
      description:
        'The total number of unique resolutions, decisions, presidential statements, and other formal documents containing mandates for UN Entities.',
    },
    unOrgans: {
      title: 'UN Organs & Bodies',
      description:
        'The competent principal organs (including the General Assembly, the Security Council, and the Economic and Social Council) and subsidiary organs of the United Nations and other bodies that have given mandates to UN Entities.',
    },
    unEntities: {
      title: 'UN Entities',
      description:
        'The UN Entities that cite, in their budget submissions, documents containing mandates.',
    },
    citations: {
      title: 'Citations',
      description:
        'The total number of times these source documents are cited by UN Entities in their budget documents.',
    },
    citationsByEntity: {
      title: 'Citations by Entity',
      description:
        'The total number of times these source documents are cited by the selected UN Entity in their budget documents.',
    },
  },

  // Filter Controls
  filters: {
    keywordSearch: {
      label: 'Keyword Search',
      betaTag: 'new',
      placeholder: 'Search titles, symbols, subjects...',
      tooltip:
        'Search for specific terms to find mandate source documents. Press Enter to search.',
    },
    unOrgan: {
      label: 'UN Organ & Body',
      placeholder: 'Filter by UN Organ or Body...',
      searchPlaceholder: 'Search organs...',
      emptyPlaceholder: 'No organs found.',
      tooltip:
        'Filter by the organs and other bodies that have given mandates to UN Entities. These include the six principal UN organs, their subsidiary organs, and other governing bodies that issue mandates through resolutions and other documents.',
    },
    unEntity: {
      label: 'UN Entity',
      placeholder: 'Filter by UN Entity citing a document...',
      searchPlaceholder: 'Search Entities...',
      emptyPlaceholder: 'No Entities found.',
      tooltip:
        'Filter by entity citing the documents in their budget submissions.',
    },
  },

  // Advanced Filters
  advancedFilters: {
    programme: {
      label: 'Programme',
      placeholder: 'Filter by Programme...',
      searchPlaceholder: 'Search Programmes...',
      emptyPlaceholder: 'No programmes found.',
      tooltip: 'Filter by programmes in the proposed UN programme budget.',
    },
    subjects: {
      label: 'UN Library Subjects',
      placeholder: 'Filter by Subject...',
      searchPlaceholder: 'Search subjects...',
      emptyPlaceholder: 'No subjects found.',
      tooltip:
        'Filter by subject headings from the UN Bibliographic Information System. These describe the main topics and themes of each document.',
    },
    budgetDocument: {
      label: 'Budget Document',
      placeholder: 'Select Budget Document Type...',
      tooltip:
        'Filter by the budget document where the entity cites the mandate.',
    },
    documentType: {
      label: 'Document Type',
      placeholder: 'Filter by Document Type...',
      searchPlaceholder: 'Search document types...',
      emptyPlaceholder: 'No document types found.',
      tooltip:
        'Filter by the type of document, such as Resolution or Decision.',
    },
    agendaItem: {
      label: 'Agenda Item',
      placeholder: 'Filter by Agenda Item...',
      searchPlaceholder: 'Search agenda items...',
      emptyPlaceholder: 'No agenda items found.',
      tooltip:
        'Filter by the UN agenda item under which the document was adopted.',
    },
    yearRange: {
      label: 'Year Range',
      tooltip:
        'Filter documents by the year they were issued. Use this to focus on recent mandate sources or track how mandate patterns have evolved over time.',
    },
  },

  // The query grammar every search field over prose shares — the documents
  // table search and the paragraph search on the detail page. Each field
  // documents it behind a "?"; one copy here so the two cannot describe
  // different rules.
  searchSyntax: {
    title: 'How search works',
    rules: [
      'Terms separated by spaces must all appear.',
      'Use "quotes" to match an exact phrase.',
      'Start a term with a minus to exclude it.',
      'Only a typed minus excludes. A dash pasted from a document is searched as text.',
    ],
  },

  // Sorting and UI Elements
  sorting: {
    placeholder: 'Sort by...',
  },

  // Common UI placeholders
  ui: {
    select: {
      default: 'Select an option...',
      search: 'Search...',
      empty: 'No options found.',
    },
  },

  // Mandate List
  mandateList: {
    sectionTitle: 'Document List',
    sectionTooltip:
      'Each document shown below contains formal mandates that instruct UN Entities to perform specific tasks. Click on any document to see detailed information about what the mandate is about and which Entities cite it in their budget submissions.',
    documentSymbol:
      'Document symbol - the official UN identifier for this source document',
    issuingOrgan: {
      title: 'Issuing Organ',
      description: 'The organ that issued this source document.',
    },
    year: 'Year this mandate document was issued',
    searchRelevance:
      'Search relevance score - how closely this document matches your search terms',
    citationCount:
      'Citation count shows how often this mandate document is cited by UN Entities in their budget submissions.',
  },

  // Version matching: concise toggle guidance and the detailed methodology disclaimer.
  versionMatching: {
    groupTooltip:
      'Show recurring resolutions as one row per series, displaying the most recent version matching your filters. Expand a row to see earlier versions. Versions are grouped automatically by title and mandating body.',
    disclaimer:
      'Versions are identified automatically by matching titles within the same mandating body (~97% accuracy on a manual audit).',
  },

  // Mandate Detail Page — the disclaimers behind the `i` beside each section
  // heading, off the page until asked for. They used to render as their own
  // always-visible line; the `i` keeps a caveat about how content was derived
  // distinguishable from the `?`, which says what a section does.
  mandateDetail: {
    paragraphs: {
      title: 'Paragraphs',
      betaDisclaimer:
        'Paragraph content is machine-extracted from UN documents. For authoritative content, please refer to the official UN document.',
    },
    citationCounts: {
      disclaimer: 'Extracted automatically from each entity’s budget submission.',
    },
    sgReports: {
      disclaimer:
        'Identified automatically from the metadata in each report’s UN Digital Library catalogue record. This can be an incomplete picture of which reports were submitted under this mandate.',
    },
    versionHistory: {
      collectionDisclaimer:
        'Grouped automatically by matching titles within the same mandating body.',
    },
    relatedMandates: {
      disclaimer:
        'Experimental. Suggested automatically from shared UN Library subject headings, weighted by how rare each shared heading is; no editorial review. Documents in this document’s own version history are excluded.',
    },
  },
} as const
