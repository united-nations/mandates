/**
 * Centralized explainer texts for the UN80 Mandate Registry
 * This file contains all help text, tooltips, and explanations used throughout the app
 */

export const explainerTexts = {
  // Main page and overview
  mainHeader: {
    title: 'UN Mandate Source Registry',
    versionTag: "(beta version)",
    shortDescription: 'Developed as part of the UN80 Initiative, this registry serves as a transparency tool for understanding UN mandates and programmes. It compiles the source documents that UN entities cite when explaining why their programmes exist and why they require resources, enabling better dialogue on mandate implementation.',
    fullDescription: [
      "This beta version of the registry provides access to mandate source documents cited by UN Entities in support of resource requirements in the UN's Proposed Programme Budget for 2026 and the Peacekeeping Budget for 2025/2026. The Registry will be iteratively expanded in the coming weeks to integrate mandates related to other UN System Entities and to include the operative paragraphs from relevant documents. The Registry serves as a technical reference to assist Member States in assessing current mandate implementation arrangements across the UN System."
    ],
    disclaimer: 'As the list of UN Entities in this registry is derived from the budget submissions to the General Assembly, it includes Entities that are independent of the Secretariat and the Secretary-General.  The inclusion of these Entities here is for reference only and is not intended to indicate that they are within the scope of the UN80 Initiative.'
  },

  // Page metadata (reuses mainHeader content)
  get pageMetadata () {
    return {
      title: this.mainHeader.title,
      description: this.mainHeader.shortDescription
    }
    },

  // Data Cards (Summary Statistics)
  dataCards: {
    sectionTitle: "Mandate Source Documents",
    sourceDocuments: {
      title: 'Source Documents',
      description:
        "The total number of unique resolutions, decisions, presidential statements, and other formal documents containing mandates for UN Entities."
    },
    unOrgans: {
      title: 'UN Organs & Other Bodies',
      description:
        'The competent principal organs (including the General Assembly, the Security Council, and the Economic and Social Council) and subsidiary organs of the United Nations and other bodies that have given mandates to UN Entities.'
    },
    unEntities: {
      title: 'UN Entities',
      description:
        'The UN Entities that cite, in their budget submissions, documents containing mandates.'
    },
    citations: {
      title: 'Citations',
      description:
        'The total number of times these source documents are cited by UN Entities in their budget documents.'
    }
  },

  // Filter Controls
  filters: {
    keywordSearch: {
      label: 'Keyword Search (beta)',
      placeholder: 'Search for document titles...',
      tooltip:
        'Search for specific terms to find mandate source documents. Press Enter or click the search button to search.'
    },
    unOrgan: {
      label: 'UN Organ & Other Body',
      placeholder: 'Filter by UN Organ or Other Body...',
      searchPlaceholder: 'Search organs...',
      emptyPlaceholder: 'No organs found.',
      tooltip:
        'Filter by the organs and other bodies that have given mandates to UN Entities. These include the six principal UN organs, their subsidiary organs, and other governing bodies that issue mandates through resolutions and other documents.'
    },
    unEntity: {
      label: 'UN Entity',
      placeholder: 'Filter by UN Entity citing a document...',
      searchPlaceholder: 'Search Entities...',
      emptyPlaceholder: 'No Entities found.',
      tooltip: 'Filter by entity citing the documents in their budget submissions.'
    },
  },

  // Advanced Filters
  advancedFilters: {
    programme: {
      label: 'Programme',
      placeholder: 'Filter by Programme...',
      searchPlaceholder: 'Search Programmes...',
      emptyPlaceholder: 'No Programmes found.',
      tooltip: 'Filter by specific Programmes in the budget structure of UN Entities.'
    },
    budgetDocument: {
      label: 'Budget Document',
      placeholder: 'Select budget document type...',
      tooltip: 'Filter by the specific budget document type.'
    },
    yearRange: {
      label: 'Year Range',
      tooltip:
        'Filter documents by the year they were issued. Use this to focus on recent mandate sources or track how mandate patterns have evolved over time.'
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
    sectionTitle: 'Document List',
    sectionTooltip:
      'Each document shown below contains formal mandates that instruct UN Entities to perform specific tasks. Click on any document to see detailed information about what the mandate is about and which Entities cite it in their budget submissions.',
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
      'Citation count shows how often this mandate document is cited by UN Entities in their budget submissions.'
  }
} as const
