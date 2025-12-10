import WordExtractor from "word-extractor";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export interface DocumentData {
  symbol: string;
  text: string;
  lines: string[];
  lineCount: number;
}

export async function fetchDocument(symbol: string): Promise<DocumentData> {
  // Construct UN documents API URL
  const docUrl = `https://documents.un.org/api/symbol/access?s=${symbol}&l=en&t=docx`;

  console.log(`Fetching document: ${docUrl}`);

  // Fetch the document
  const response = await fetch(docUrl);

  if (!response.ok) {
    // Try with .doc format if .docx fails
    const docUrlFallback = `https://documents.un.org/api/symbol/access?s=${symbol}&l=en&t=doc`;
    const fallbackResponse = await fetch(docUrlFallback);

    if (!fallbackResponse.ok) {
      throw new Error(
        `Failed to fetch document ${symbol}: ${response.status} ${response.statusText}`,
      );
    }

    return await extractDocument(fallbackResponse, symbol);
  }

  return await extractDocument(response, symbol);
}

async function extractDocument(
  response: Response,
  symbol: string,
): Promise<DocumentData> {
  const buffer = await response.arrayBuffer();
  const tempFilePath = join(
    tmpdir(),
    `${symbol.replace(/\//g, "_")}_${Date.now()}.docx`,
  );

  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, Buffer.from(buffer));

    // Extract text using word-extractor
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(tempFilePath);
    const text = extracted.getBody();

    // Clean up temporary file
    await unlink(tempFilePath);

    // Process text into lines (similar to Python processing)
    const lines = text
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line);

    return {
      symbol,
      text,
      lines,
      lineCount: lines.length,
    };
  } catch (extractError) {
    // Clean up temp file even if extraction fails
    try {
      await unlink(tempFilePath);
    } catch {}

    throw extractError;
  }
}
