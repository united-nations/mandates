import { NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

interface EntityWithCount {
  name: string;
  count: number;
}

interface BodyWithCount {
  name: string;
  count: number;
}

let uniqueEntities: EntityWithCount[] = [];
let uniqueBodiesWithCount: BodyWithCount[] = [];
let uniquePriorityAreas: string[] = [];
let uniqueSubjects: string[] = [];
let totalDocuments = 0;
let totalEntities = 0;
let totalCitations = 0;
let uniqueBodiesCount = 0;
let uniqueBodies: string[] = [];
let uniqueProgrammesCount = 0;
let uniquePillars: string[] = [];
let yearRange: { min: number; max: number } | null = null;
let yearDistribution: { [year: string]: number } = {};
let uniqueProgrammes: string[] = [];

async function getMetadata() {
  if (uniqueEntities.length > 0) {
    return { 
      uniqueEntities, 
      uniqueBodies: uniqueBodiesWithCount.map(b => b.name),
      uniqueBodiesWithCount,
      uniquePriorityAreas,
      uniqueSubjects,
      totalDocuments,
      totalEntities,
      totalCitations,
      uniqueBodiesCount: uniqueBodiesWithCount.length,
      uniqueProgrammesCount,
      uniqueProgrammes,
      uniquePillars,
      yearRange,
      yearDistribution,
    };
  }

  const jsonDirectory = path.join(process.cwd(), 'data');
  const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 'utf8');
  const rawData = JSON.parse(fileContents) as Mandate[];

  const entityCounts: { [key: string]: number } = {};
  const bodyCounts: { [key: string]: number } = {};
  const priorityAreas = new Set<string>();
  const bodies = new Set<string>();
  const programmes = new Set<string>();
  const pillars = new Set<string>();
  const subjects = new Set<string>();
  let citationsSum = 0;
  const localYearDistribution: { [year: string]: number } = {};

  for (const item of rawData) {
    // Count documents per entity based on citation_info
    if (item.citation_info && Array.isArray(item.citation_info)) {
      const entitiesInThisDocument = new Set<string>();
      item.citation_info.forEach((citation: any) => {
        if (citation.entity) {
          entitiesInThisDocument.add(citation.entity);
        }
      });
      // Count this document once per entity that cites it
      entitiesInThisDocument.forEach(entity => {
        entityCounts[entity] = (entityCounts[entity] || 0) + 1;
      });
    }
    if (item.priority_area) {
        priorityAreas.add(item.priority_area);
    }
    if (item.body && item.body !== 'UNCLOS' && item.body !== 'Charter' && item.body !== 'Other' && item.body !== "Conference of the Parties to the United Nations Convention against Transnational Organized Crime") {
        bodyCounts[item.body] = (bodyCounts[item.body] || 0) + 1;
    }
    if (item.pillar) {
        pillars.add(item.pillar);
    }
    if (item.subject_headings && Array.isArray(item.subject_headings)) {
      item.subject_headings.forEach((subject: string) => {
        if (subject && subject.trim()) {
          subjects.add(subject.trim());
        }
      });
    }
    if (item.citation_info && Array.isArray(item.citation_info)) {
      for (const citation of item.citation_info) {
        if (citation.programme_title) {
          programmes.add(citation.programme_title);
        }
      }
    }
    citationsSum += item.num_citations || 0;
    if (item.year) {
        const year = parseInt(item.year, 10);
        if (!isNaN(year)) {
            localYearDistribution[year] = (localYearDistribution[year] || 0) + 1;
        }
    }
  }

  uniqueEntities = Object.entries(entityCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
    
  uniqueBodiesWithCount = Object.entries(bodyCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => {
      // Priority order for main organs
      const priority = ["General Assembly", "Security Council", "ECOSOC"];
      const aIndex = priority.indexOf(a.name);
      const bIndex = priority.indexOf(b.name);
      
      // If both are in priority list, sort by priority order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only a is in priority list, a comes first
      if (aIndex !== -1) return -1;
      
      // If only b is in priority list, b comes first
      if (bIndex !== -1) return 1;
      
      // If neither is in priority list, sort alphabetically
      return a.name.localeCompare(b.name);
    });

  uniquePriorityAreas = Array.from(priorityAreas).sort();
  uniqueSubjects = Array.from(subjects).sort();
  totalDocuments = rawData.length;
  totalEntities = Object.keys(entityCounts).length;
  totalCitations = citationsSum;
  uniqueBodiesCount = uniqueBodiesWithCount.length;
  uniqueBodies = uniqueBodiesWithCount.map(b => b.name);
  uniqueProgrammesCount = programmes.size;
  uniqueProgrammes = Array.from(programmes).sort();
  uniquePillars = Array.from(pillars).sort();
  yearDistribution = localYearDistribution;
  const years = Object.keys(yearDistribution).map(Number);
  if (years.length > 0) {
    yearRange = {
        min: Math.min(...years),
        max: Math.max(...years),
    };
  }

  return { 
    uniqueEntities,
    uniqueBodies: uniqueBodiesWithCount.map(b => b.name),
    uniqueBodiesWithCount,
    uniquePriorityAreas,
    uniqueSubjects,
    totalDocuments,
    totalEntities,
    totalCitations,
    uniqueBodiesCount: uniqueBodiesWithCount.length,
    uniqueProgrammesCount,
    uniqueProgrammes,
    uniquePillars,
    yearRange,
    yearDistribution,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const organ = searchParams.get('organ');
    
    // If organ filter is provided, calculate organ-specific metadata
    if (organ) {
      const jsonDirectory = path.join(process.cwd(), 'data');
      const fileContents = await fs.readFile(path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 'utf8');
      const rawData = JSON.parse(fileContents) as Mandate[];
      
      // Filter mandates for the specific organ
      const organMandates = rawData.filter(mandate => mandate.body === organ);
      
      // Calculate entity counts from organ-specific mandates (count documents, not citations)
      const entityCounts: { [key: string]: number } = {};
      
      for (const item of organMandates) {
        if (item.citation_info && Array.isArray(item.citation_info)) {
          const entitiesInThisDocument = new Set<string>();
          item.citation_info.forEach((citation: any) => {
            if (citation.entity) {
              entitiesInThisDocument.add(citation.entity);
            }
          });
          // Count this document once per entity that cites it
          entitiesInThisDocument.forEach(entity => {
            entityCounts[entity] = (entityCounts[entity] || 0) + 1;
          });
        }
      }
      
      const organSpecificEntities = Object.entries(entityCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count); // Sort by count descending
      
      return NextResponse.json({
        uniqueEntities: organSpecificEntities,
        totalDocuments: organMandates.length,
        totalEntities: Object.keys(entityCounts).length,
        totalCitations: organMandates.reduce((sum, m) => sum + (m.num_citations || 0), 0),
      });
    }
    
    // Return cached metadata for general requests
    const metadata = await getMetadata();
    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Failed to load metadata:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 