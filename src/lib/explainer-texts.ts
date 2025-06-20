/**
 * Centralized explainer texts for the UN80 Mandate Registry
 * This file contains all help text, tooltips, and explanations used throughout the app
 */

export const explainerTexts = {
  // Main page and overview
  mainHeader: {
    title: 'UN Mandate Source Registry',
    description: [
      'The Mandate Source Registry has been developed under the UN80 initiative to enhance transparency and support informed dialogue on mandate coherence and implementation. It compiles official UN mandate source documents cited by the UN Secretariat in support of resource requirements presented in the Proposed Programme Budget for 2026.',
      'This initial version provides access to official mandate source documents cited by the UN Secretariat in support of resource requirements presented in the Proposed Programme Budget for 2026 and the Peacekeeping Budget for 2025/2026. The Registry will be iteratively expanded in the coming weeks to integrate mandates assigned to UN system entities and to include operative paragraphs from relevant documents.',
      'This Registry serves as a technical reference to assist Member States in assessing current mandate implementation arrangements across the UN system.'
    ]
  },

  // Page metadata (reuses mainHeader content)
  get pageMetadata () {
    return {
      title: this.mainHeader.title,
      description: this.mainHeader.description
    }
    },

  // Data Cards (Summary Statistics)
  dataCards: {
    sourceDocuments: {
      title: 'Source Documents',
      description:
        "The total number of unique resolutions, decisions, presidential statements, and other formal documents containing mandates for UN entities."
    },
    unOrgans: {
      title: 'Organs',
      description:
        'The distinct organs that have issued mandate documents to UN entities. These include the six principal UN organs, their subsidiary organs, and other governing bodies that issue mandates through resolutions and other documents.'
    },
    unEntities: {
      title: 'UN Entities',
      description:
        'The distinct UN entities that cite mandate source documents. These are the departments, offices, funds and programmes, regional commissions, peacekeeping operations, political missions, and other entities within the UN Secretariat that reference these mandate documents in their budget submissions.'
    },
    programmes: {
      title: 'Programmes',
      description:
        ''
    },
    citations: {
      title: 'Citations',
      description:
        'The total number of times these source documents are cited by UN entities in their budget documents.'
    }
  },

  // Filter Controls
  filters: {
    keywordSearch: {
      label: 'Keyword Search',
      placeholder: 'Search for titles and documents...',
      tooltip:
        'Search for specific terms. Use this to find mandate source documents related to particular topics or activities within the UN Secretariat.'
    },
    unOrgan: {
      label: 'Organ',
      placeholder: 'Filter by issuing organ...',
      searchPlaceholder: 'Search organs...',
      emptyPlaceholder: 'No organs found.',
      tooltip:
        'Filter by the distinct organs that have issued mandate documents to UN entities. These include the six principal UN organs, their subsidiary organs, and other governing bodies that issue mandates through resolutions and other documents.'
    },
    unEntity: {
      label: 'UN Entity',
      placeholder: 'Filter by implementing entity...',
      searchPlaceholder: 'Search entities...',
      emptyPlaceholder: 'No entities found.',
      tooltip: 'Filter by entity citing the documents. These are the departments, offices, funds and programmes, regional commissions, peacekeeping operations, political missions, and other entities within the UN Secretariat that reference these mandate documents in their budget submissions.'
    },
  },

  // Advanced Filters
  advancedFilters: {
    programme: {
      label: 'Programme',
      placeholder: 'Filter by programme...',
      searchPlaceholder: 'Search programmes...',
      emptyPlaceholder: 'No programmes found.',
      tooltip: 'Filter by specific programmes within Secretariat budget documents.'
    },
    budgetDocument: {
      label: 'Budget Document',
      placeholder: 'Select budget document type...',
      tooltip: 'Filter by the specific budget document type.'
    },
    yearRange: {
      label: 'Filter by Year Range',
      tooltip:
        'Filter documents by the year they were issued. Use this to focus on recent mandate sources or track how mandate patterns have evolved over time within the Secretariat.'
    }
  },

  // Sorting and UI Elements
  sorting: {
    placeholder: 'Sort by...'
  },

  // Common UI placeholders
  ui: {
    select: {
      default: 'Select an option...',
      search: 'Search...',
      empty: 'No options found.'
    }
  },

  // Mandate List
  mandateList: {
    sectionTitle: 'Mandate Source Documents',
    sectionTooltip:
      'Each document shown below contains formal mandates that instruct UN Secretariat entities to perform specific tasks. Click on any document to see detailed information about what the mandate is about and which entities cite it in their budget submissions.',
    documentSymbol:
      'Document symbol - the official UN identifier for this source document',
    issuingOrgan: {
      title: 'Issuing Organ',
      description: 'The organ that issued this source document.'
    },
    year: 'Year this mandate document was issued',
    searchRelevance:
      'Search relevance score - how closely this document matches your search terms',
    citationCount:
      'Citation count shows how often this mandate document is cited by Secretariat entities in their budget submissions. While this may indicate importance, high citation counts can also suggest duplicated or overlapping implementation that the UN80 review aims to identify and streamline.'
  }
} as const
