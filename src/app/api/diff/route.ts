import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import * as Diff from "diff";
import * as levenshtein from "fast-levenshtein";
import { fetchDocument } from "@/lib/document-fetcher";

// Calculate similarity ratio (0-1) using standard Levenshtein ratio formula
function ratio(a: string, b: string): number {
  const totalLen = a.length + b.length;
  if (totalLen === 0) return 1.0;
  const distance = levenshtein.get(a, b);
  return (totalLen - distance) / totalLen;
}

// Generate highlights for differences using diff library directly
function getHighlights(
  a: string | null,
  b: string | null,
): [string | null, string | null] {
  a = a || "";
  b = b || "";

  const changes = Diff.diffChars(a, b);
  let leftHighlighted = "";
  let rightHighlighted = "";

  for (const change of changes) {
    if (change.added) {
      rightHighlighted += `**${change.value}**`;
    } else if (change.removed) {
      leftHighlighted += `~~${change.value}~~`;
    } else {
      leftHighlighted += change.value;
      rightHighlighted += change.value;
    }
  }

  return [leftHighlighted || null, rightHighlighted || null];
}

export async function POST(request: NextRequest) {
  try {
    const { symbolA, symbolB, aPath, bPath } = await request.json();

    let a: string[], b: string[];

    if (symbolA && symbolB) {
      // Fetch documents from UN API
      const [docA, docB] = await Promise.all([
        fetchDocument(symbolA),
        fetchDocument(symbolB),
      ]);

      a = docA.lines;
      b = docB.lines;
    } else if (aPath && bPath) {
      // Read from local files (backward compatibility)
      const aText = await readFile(join(process.cwd(), aPath), "utf-8");
      const bText = await readFile(join(process.cwd(), bPath), "utf-8");

      a = aText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
      b = bText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line);
    } else {
      return NextResponse.json(
        {
          error:
            "Either document symbols (symbolA, symbolB) or file paths (aPath, bPath) are required",
        },
        { status: 400 },
      );
    }

    const THRESHOLD = 0.8;
    let i = 0;
    let j = 0;
    const ab: Array<{
      left: string | null;
      left_best: string | null;
      left_highlighted: string | null;
      left_number: number | string;
      right: string | null;
      right_best: string | null;
      right_highlighted: string | null;
      right_number: number | string;
      score: number | null;
    }> = [];

    while (true) {
      const bb = b[j];
      let aa: string | null = null;

      // Look for matching line in remaining 'a' lines
      for (let _i = i + 1; _i < a.length; _i++) {
        const _aa = a[_i];
        if (ratio(_aa, bb) > THRESHOLD) {
          // Process intermediate lines that don't match
          for (let __i = i + 1; __i < _i; __i++) {
            const __aa = a[__i];
            const bestMatch = b.reduce(
              (best: { line: string | null; ratio: number }, _bb: string) => {
                const currentRatio = ratio(__aa, _bb);
                return currentRatio > best.ratio
                  ? { line: _bb, ratio: currentRatio }
                  : best;
              },
              { line: null, ratio: 0 },
            );

            const bestMatchLine =
              bestMatch.ratio > THRESHOLD ? bestMatch.line : null;
            const [leftHighlighted, rightHighlighted] = getHighlights(
              __aa,
              bestMatchLine,
            );

            ab.push({
              left: __aa,
              left_best: null,
              left_highlighted: leftHighlighted,
              left_number: __i,
              right: null,
              right_best: bestMatchLine,
              right_highlighted: rightHighlighted,
              right_number: "j",
              score: null,
            });
          }
          i = _i;
          aa = _aa;
          break;
        }
      }

      let bestMatch: string | null = null;
      if (!aa) {
        const bestMatchResult = a.reduce(
          (best: { line: string | null; ratio: number }, _aa: string) => {
            const currentRatio = ratio(_aa, bb);
            return currentRatio > best.ratio
              ? { line: _aa, ratio: currentRatio }
              : best;
          },
          { line: null, ratio: 0 },
        );

        bestMatch =
          bestMatchResult.ratio > THRESHOLD ? bestMatchResult.line : null;
      }

      const [leftHighlighted, rightHighlighted] = getHighlights(
        aa || bestMatch,
        bb,
      );

      ab.push({
        left: aa,
        left_best: bestMatch,
        left_highlighted: leftHighlighted,
        left_number: i,
        right: bb,
        right_best: null,
        right_highlighted: rightHighlighted,
        right_number: j,
        score: ratio(aa || bestMatch || "", bb),
      });

      j++;
      if (j === b.length) {
        break;
      }
    }

    // Calculate overall score
    const scores = ab
      .filter((item) => item.score !== null)
      .map((item) => item.score as number);
    const score =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;

    const data = { score, diff: ab };

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error processing diff:", error);
    return NextResponse.json(
      { error: "Failed to process diff" },
      { status: 500 },
    );
  }
}
