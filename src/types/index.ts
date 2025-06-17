
export interface Mandate {
  id: string;
  title: string;
  unEntity: string;
  year: number;
  documentUrl?: string;
  summary: string;
  keywords: string[];
  operativeParagraphs: string[];
  programmePlanSection: string; // Added new field
}
