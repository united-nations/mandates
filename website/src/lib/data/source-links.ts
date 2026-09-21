/** Direct English PDF link through the Official Document System. */
export function getDocumentPdfUrl(symbol: string): string {
  return `https://documents.un.org/api/symbol/access?s=${encodeURIComponent(symbol)}&l=en&t=pdf`
}
