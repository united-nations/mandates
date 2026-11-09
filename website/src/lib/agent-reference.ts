import { SITE_URL } from '#lib/seo'
import {
  API_FAIR_USE,
  DIGITAL_LIBRARY_POINTER,
  VOLUME_LIMITS,
} from '#lib/api-limits'

export function agentGuide() {
  return `# UN Mandate Registry

> A registry of UN mandates and the documents that create them: resolutions and other decisions, with their paragraphs, their citations in the UN programme budget, and their links to the reports and UN entities that implement them.

## Reading a document
Each document has its own page at ${SITE_URL}/mandate/{symbol}, where {symbol} is the official UN document symbol with its slashes kept and any other special characters URL-encoded. Examples:
- ${SITE_URL}/mandate/A/RES/79/1
- ${SITE_URL}/mandate/S/RES/2325%20(2016)

A document page shows:
- the title, issuing body, year, subjects and agenda items, with a link to the original document;
- the document's paragraphs, where they are available in English;
- which UN entities cite the document in the programme budget, and where in the budget;
- other versions of the same resolution, where the registry records them;
- reports submitted under the document.

Budget citations are recorded references in the programme budget, not a determination of legal in-force status. "Latest version" is a registry annotation, not legal status. When citing a document, give its page URL and, for the original text, the document's own link.

## Finding a document
Search the registry at ${SITE_URL}/secretariat, for example ${SITE_URL}/secretariat?keyword=climate. Results can be narrowed by citing entity (entity=DESA), issuing body (organ), year (start_year, end_year) and document type (document_type). Each result links to its document page.

## Structured data
Basic metadata for a single document is also available as JSON at ${SITE_URL}/api/v1/documents/{symbol}. A simple search, ${SITE_URL}/api/v1/documents?keyword=climate, returns short lists of matching documents.

## Use and limits
${API_FAIR_USE} ${VOLUME_LIMITS} ${DIGITAL_LIBRARY_POINTER}
`
}
