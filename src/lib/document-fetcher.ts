import WordExtractor from 'word-extractor'
import { extractText } from 'unpdf'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

export interface DocumentData {
  symbol: string
  text: string
  lines: string[]
  lineCount: number
  format: 'doc' | 'pdf'
}

export async function fetchDocument(symbol: string): Promise<DocumentData> {
  // Try doc format first (docx gives same results)
  const docUrl = `https://documents.un.org/api/symbol/access?s=${symbol}&l=en&t=doc`

  const docResponse = await fetch(docUrl)
  if (docResponse.ok) {
    try {
      const result = await extractWordDocument(docResponse, symbol)
      console.log(`[${symbol}] Loaded as DOC (${result.lineCount} lines)`)
      return result
    } catch {
      // DOC extraction failed, try PDF
    }
  }

  // Fall back to PDF if doc fails
  const pdfUrl = `https://documents.un.org/api/symbol/access?s=${symbol}&l=en&t=pdf`

  const pdfResponse = await fetch(pdfUrl, { redirect: 'follow' })
  if (pdfResponse.ok) {
    try {
      const result = await extractPdfDocument(pdfResponse, symbol)
      console.log(`[${symbol}] Loaded as PDF (${result.lineCount} lines)`)
      return result
    } catch (err) {
      console.error(`[${symbol}] PDF extraction failed:`, err)
    }
  }

  throw new Error(
    `Failed to fetch document ${symbol}: No available format (tried doc, pdf)`
  )
}

async function extractWordDocument(
  response: Response,
  symbol: string
): Promise<DocumentData> {
  const format = 'doc'
  const buffer = await response.arrayBuffer()
  const tempFilePath = join(
    tmpdir(),
    `${symbol.replace(/\//g, '_')}_${Date.now()}.${format}`
  )

  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, Buffer.from(buffer))

    // Extract text using word-extractor
    const extractor = new WordExtractor()
    const extracted = await extractor.extract(tempFilePath)
    const text = extracted.getBody()

    // Clean up temporary file
    await unlink(tempFilePath)

    // Process text into lines (similar to Python processing)
    const lines = text
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line)

    return {
      symbol,
      text,
      lines,
      lineCount: lines.length,
      format,
    }
  } catch (extractError) {
    // Clean up temp file even if extraction fails
    try {
      await unlink(tempFilePath)
    } catch {}

    throw extractError
  }
}

async function extractPdfDocument(
  response: Response,
  symbol: string
): Promise<DocumentData> {
  const buffer = await response.arrayBuffer()

  // Extract text from PDF using unpdf (server-side compatible)
  // mergePages: true returns a single string instead of array of pages
  const { text } = await extractText(new Uint8Array(buffer), {
    mergePages: true,
  })

  // Process text into lines
  // PDF extraction from scanned documents often returns text without proper line breaks
  // Use aggressive segmentation patterns for UN resolutions
  const processedText = text
    // Normalize whitespace first (OCR often has broken words)
    .replace(/\s+/g, ' ')
    // Add line breaks before numbered items (1. 2. etc) - must be followed by uppercase
    .replace(/ (\d+)\. ([A-Z])/g, '\n$1. $2')
    // Add line breaks before section markers (A, B, C, D, E as standalone)
    .replace(/ ([A-E]) (\d+)/g, '\n$1\n$2')
    // Add line breaks before "The General Assembly"
    .replace(/ (The General Assembly)/g, '\n$1')
    // Add line breaks after semicolons followed by numbered items
    .replace(/; (\d+)\./g, ';\n$1.')
    // Add line breaks before letter items (a) (b) etc
    .replace(/ (\([a-z]\) )/g, '\n$1')

  const lines = processedText
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line && line.length > 15) // Filter out very short segments

  return {
    symbol,
    text,
    lines,
    lineCount: lines.length,
    format: 'pdf',
  }
}
