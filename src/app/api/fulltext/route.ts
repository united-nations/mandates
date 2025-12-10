import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";

interface XMLSubfield {
  "@_code": string;
  "#text": string;
}

interface XMLField {
  "@_tag": string;
  "@_ind1"?: string;
  "@_ind2"?: string;
  subfield?: XMLSubfield | XMLSubfield[];
}

interface XMLControlField {
  "@_tag": string;
  "#text": string;
}

interface XMLRecord {
  datafield?: XMLField | XMLField[];
  controlfield?: XMLControlField | XMLControlField[];
}

export async function GET() {
  try {
    // Fetch XML data from UN Digital Library with 500 results
    const response = await fetch(
      "https://digitallibrary.un.org/search?cc=Resolutions+and+Decisions&ln=en&p=&f=&rm=&sf=year&so=d&rg=500&c=Resolutions+and+Decisions&c=&of=xm&fti=0&fti=0",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; UN-Diff-Viewer/1.0)",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlData = await response.text();

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    const jsonData = parser.parse(xmlData);

    // Extract resolutions with titles, symbols, and dates
    const resolutions: Array<{
      title: string;
      symbol: string;
      publicationDate?: string;
      year?: string;
    }> = [];

    // Navigate through the XML structure to find records
    const records = jsonData?.collection?.record || [];
    const recordArray = Array.isArray(records) ? records : [records];

    recordArray.forEach((record: XMLRecord) => {
      if (!record) return;

      let title = "";
      let symbol = "";
      let publicationDate = "";
      let year = "";

      // Extract from datafields
      if (record.datafield) {
        const datafields = Array.isArray(record.datafield)
          ? record.datafield
          : [record.datafield];

        datafields.forEach((field: XMLField) => {
          // Extract title from tag 245 (title statement) - primary source
          if (!title && field["@_tag"] === "245" && field.subfield) {
            const subfields = Array.isArray(field.subfield)
              ? field.subfield
              : [field.subfield];
            const titleParts: string[] = [];

            // Combine subfields a, b, c for complete title
            ["a", "b", "c"].forEach((code) => {
              const subfield = subfields.find(
                (sf: XMLSubfield) => sf["@_code"] === code,
              );
              if (subfield && subfield["#text"]) {
                titleParts.push(subfield["#text"].trim());
              }
            });

            if (titleParts.length > 0) {
              title = titleParts.join(" ").trim();
            }
          }

          // Fallback: Extract title from tag 239 if 245 not available
          if (
            !title &&
            field["@_tag"] === "239" &&
            field["@_ind1"] === "1" &&
            field["@_ind2"] === "0"
          ) {
            if (field.subfield) {
              const subfields = Array.isArray(field.subfield)
                ? field.subfield
                : [field.subfield];
              const titleSubfield = subfields.find(
                (sf: XMLSubfield) => sf["@_code"] === "a",
              );
              if (titleSubfield && titleSubfield["#text"]) {
                title = titleSubfield["#text"];
              }
            }
          }

          // Extract symbol from tag 191 (document symbol field)
          if (field["@_tag"] === "191" && field.subfield) {
            const subfields = Array.isArray(field.subfield)
              ? field.subfield
              : [field.subfield];
            const symbolSubfield = subfields.find(
              (sf: XMLSubfield) => sf["@_code"] === "a",
            );
            if (symbolSubfield && symbolSubfield["#text"]) {
              symbol = symbolSubfield["#text"];
            }
          }

          // Extract publication date from tag 260 subfield c
          if (field["@_tag"] === "260" && field.subfield) {
            const subfields = Array.isArray(field.subfield)
              ? field.subfield
              : [field.subfield];
            const dateSubfield = subfields.find(
              (sf: XMLSubfield) => sf["@_code"] === "c",
            );
            if (dateSubfield && dateSubfield["#text"]) {
              publicationDate = String(dateSubfield["#text"]).trim();
            }
          }

          // Extract ISO date from tag 269 subfield a (for year extraction)
          if (field["@_tag"] === "269" && field.subfield) {
            const subfields = Array.isArray(field.subfield)
              ? field.subfield
              : [field.subfield];
            const isoDateSubfield = subfields.find(
              (sf: XMLSubfield) => sf["@_code"] === "a",
            );
            if (isoDateSubfield && isoDateSubfield["#text"]) {
              const isoDate = String(isoDateSubfield["#text"]).trim();
              // Extract year from ISO date (YYYY-MM-DD format)
              const yearMatch = isoDate.match(/^(\d{4})/);
              if (yearMatch) {
                year = yearMatch[1];
              }
            }
          }
        });
      }

      // Extract from controlfields
      if (record.controlfield && !symbol) {
        const controlfields = Array.isArray(record.controlfield)
          ? record.controlfield
          : [record.controlfield];
        controlfields.forEach((cf: XMLControlField) => {
          if (cf["@_tag"] === "001" && cf["#text"]) {
            // Check if this looks like a document symbol
            const cfText = cf["#text"].toString();
            const symbolMatch = cfText.match(
              /([A-Z]+\/[A-Z]*\/?[\d]+(?:\s*\([^)]+\))?)/,
            );
            if (symbolMatch) {
              symbol = symbolMatch[1];
            }
          }
        });
      }

      // Extract symbol from title if still not found
      if (title && !symbol) {
        const symbolMatch = title.match(
          /([A-Z]+\/[A-Z]*\/?[\d]+(?:\s*\([^)]+\))?)/,
        );
        if (symbolMatch) {
          symbol = symbolMatch[1];
        }
      }

      // Add if we have title and symbol, or use fallbacks
      if (title || symbol) {
        resolutions.push({
          title: title.trim() || symbol.trim(),
          symbol: symbol.trim() || title.trim(),
          publicationDate: publicationDate || undefined,
          year: year || undefined,
        });
      }
    });

    // Remove duplicates and filter out empty entries
    const uniqueResolutions = resolutions
      .filter((r) => r.title && r.symbol)
      .filter(
        (r, index, self) =>
          index === self.findIndex((item) => item.symbol === r.symbol),
      );

    return NextResponse.json(uniqueResolutions);
  } catch (error) {
    console.error("Error fetching UN resolutions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch resolutions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
