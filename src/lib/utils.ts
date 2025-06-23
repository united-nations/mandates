import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  const smallWords = new Set([
    "a",
    "an",
    "and",
    "as",
    "at",
    "but",
    "by",
    "for",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "vs",
  ]);

  // Updated regex to handle both straight (') and smart/curly (\u2019) apostrophes
  return str.replace(
    /\b\w+(?:[''\u2019][a-z]*)*\b/g,
    (word, index) => {
      // Handle possessives and contractions properly (both straight and curly apostrophes)
      if (word.includes("'") || word.includes("'") || word.includes("\u2019")) {
        // Split on any type of apostrophe
        const parts = word.split(/[''\u2019]/);
        const firstPart = parts[0].toLowerCase();
        const restPart = parts.slice(1).join("'").toLowerCase(); // Use straight apostrophe in output

        // Check if the first part (before apostrophe) is a small word
        if (index > 0 && smallWords.has(firstPart)) {
          return firstPart + "'" + restPart;
        }
        return (
          firstPart.charAt(0).toUpperCase() +
          firstPart.slice(1) +
          "'" +
          restPart
        );
      }

      const lowerWord = word.toLowerCase();
      if (index > 0 && smallWords.has(lowerWord)) {
        return lowerWord;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
  );
}
