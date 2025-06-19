/**
 * Centralized explainer texts for the UN80 Mandate Registry
 * This file contains all help text, tooltips, and explanations used throughout the app
 */

export const explainerTexts = {
  // Page metadata
  pageMetadata: {
    title: "UN80 Mandate Registry",
    description: "Explore UN mandate source documents as part of the UN80 mandate-implementation review. Currently covering the UN Secretariat, this registry will be expanded to other UN entities. Search, filter, and analyze distinct mandates to identify duplications, redundancies, and implementation patterns."
  },

  // Main page and overview
  mainHeader: {
    title: "UN80 Mandate Registry",
    description: "Explore the collection of UN mandate source documents as part of the UN80 mandate-implementation review. Currently covering the UN Secretariat with plans to expand to other UN entities, this registry helps identify duplications, redundancies, and opportunities for greater synergy in mandate implementation. This dashboard will be continuously updated, expanded, and enhanced."
  },

  // About UN80 Dialog
  aboutDialog: {
    title: "Understanding the UN80 Mandate-Implementation Review",
    whatIsUn80: {
      title: "What is UN80?",
      description: "As the UN marks its 80th anniversary, the Secretary-General launched the UN80 initiative with three parallel work-streams:",
      workStreams: [
        "Rapidly identifying efficiencies and improvements under current arrangements",
        "Reviewing the implementation of all mandates given to the UN by Member States",
        "Undertaking consideration of the need for structural changes and programme realignment"
      ]
    },
    keyTerms: {
      title: "Key Terms",
      unOrgans: {
        title: "UN Organs",
        description: "The six principal Charter bodies (General Assembly, Security Council, ECOSOC, Trusteeship Council, International Court of Justice, and the Secretariat) plus their subsidiary organs. These bodies create mandates through resolutions and decisions."
      },
      unEntities: {
        title: "UN Entities", 
        description: "The various organizational units within the UN. This registry currently covers the UN Secretariat (departments, offices, and regional commissions) and will be expanded to include other UN entities that implement mandates."
      },
      mandates: {
        title: "Mandates",
        description: "Formal instructions contained in resolutions, decisions or treaties that direct UN entities to perform specific tasks. The review examines how these mandates are implemented, not the mandates themselves."
      },
      sourceDocuments: {
        title: "Source Documents",
        description: "The specific resolution, decision, treaty article or Charter paragraph that created the mandate (e.g., A/RES/79/257 or S/RES/2720). Each mandate is traceable to its authorizing source."
      }
    },
    howItHelps: {
      title: "How This Registry Helps",
      description: "This tool catalogues distinct mandates from the UN Secretariat to identify duplications, redundancies, and opportunities for greater synergy in implementation. The goal is to examine how mandates are carried out and optimize implementation, with findings feeding into budget proposals and potential structural changes."
    }
  },

  // Data Cards (Summary Statistics)
  dataCards: {
    sourceDocuments: {
      title: "Source Documents",
      description: "The total number of unique resolutions, decisions, treaties, and other formal documents containing mandates for the UN Secretariat. These are the authoritative sources that instruct Secretariat entities what to do."
    },
    unOrgans: {
      title: "UN Organs", 
      description: "The distinct UN organs that have issued mandate documents to the Secretariat. These include the six principal Charter bodies and their subsidiary organs that create mandates through resolutions and decisions."
    },
    unEntities: {
      title: "UN Entities",
      description: "The distinct Secretariat entities mentioned in the documents. These are the departments, offices, and regional commissions within the UN Secretariat that implement the mandated work."
    },
    programmes: {
      title: "Programmes",
      description: "The distinct thematic programmes in the UN Secretariat budget structure where mandated work is organized and funded. Each programme groups related activities and objectives."
    },
    citations: {
      title: "Citations",
      description: "The total number of times these source documents are cited in budget documents. High citation counts may indicate important mandates, but can also suggest duplicated or overlapping implementation that the UN80 review aims to identify and streamline."
    }
  },

  // Filter Controls
  filters: {
    keywordSearch: {
      label: "Keyword Search",
      placeholder: "Search for topics, activities, or terms...",
      tooltip: "Search within document titles, summaries, and content for specific terms. Use this to find mandates related to particular topics or activities within the UN Secretariat."
    },
    unOrgan: {
      label: "UN Organ",
      placeholder: "Filter by issuing organ...",
      tooltip: "Filter by which UN organ issued the mandate to the Secretariat. These are the decision-making bodies like the General Assembly, Security Council, or ECOSOC that create mandates through resolutions."
    },
    unEntity: {
      label: "UN Entity",
      placeholder: "Filter by implementing entity...",
      tooltip: "Filter by which Secretariat entity implements the mandate. These are the departments, offices, and regional commissions within the UN Secretariat that carry out the mandated work."
    },
    yearRange: {
      label: "Filter by Year Range",
      tooltip: "Filter documents by the year they were issued. Use this to focus on recent mandates or track how mandate patterns have evolved over time within the Secretariat."
    }
  },

  // Advanced Filters
  advancedFilters: {
    section: {
      label: "Section",
      placeholder: "Filter by budget section...",
      tooltip: "Filter by specific sections within Secretariat budget documents. Sections group related programmes and activities within the UN Secretariat's organizational structure."
    },
    programme: {
      label: "Programme",
      placeholder: "Filter by thematic programme...",
      tooltip: "Filter by thematic programmes in the UN Secretariat budget where mandated work is organized. Each programme has specific objectives and resource allocations within the Secretariat."
    },
    budgetDocument: {
      label: "Budget Document",
      placeholder: "Select budget document type...",
      tooltip: "Filter by the specific budget document type. Different UN budget documents cover different aspects of Secretariat operations - regular programmes vs. peacekeeping operations."
    },
    priorityArea: {
      label: "Priority Area", 
      placeholder: "Select priority area...",
      tooltip: "Filter by UN priority areas - the major thematic categories that organize Secretariat work such as peace and security, human rights, or sustainable development."
    }
  },

  // Mandate List
  mandateList: {
    sectionTitle: "Mandate Source Documents",
    sectionTooltip: "Each document shown below contains formal mandates that instruct UN Secretariat entities to perform specific tasks. Click on any document to see detailed information about its mandates and implementation within the Secretariat.",
    documentSymbol: "Document symbol - the official UN identifier for this source document",
    issuingOrgan: {
      title: "Issuing Organ",
      description: "The UN organ that created this mandate through a resolution or decision"
    },
    year: "Year this mandate document was issued",
    searchRelevance: "Search relevance score - how closely this document matches your search terms",
    citationCount: "Citation count shows how often this mandate appears in Secretariat budget documents. While this may indicate importance, high citation counts can also suggest duplicated or overlapping implementation that the UN80 review aims to identify and streamline."
  },

  // Search Results
  searchResults: {
    tooltip: "These are UN resolutions, decisions, and other official documents that contain mandates for the UN Secretariat being reviewed as part of the UN80 initiative. Each result represents a source document that may contain multiple mandates for Secretariat implementation.",
    foundText: "mandate source document"
  }
} as const; 