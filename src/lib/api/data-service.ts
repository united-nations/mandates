import path from 'path';
import { promises as fs } from 'fs';
import type { Mandate } from '@/types';

// Global cache for mandates data
let mandatesCache: Mandate[] | null = null;
let entitiesCache: any[] | null = null;
let organsCache: any[] | null = null;

/**
 * Central data service for loading and caching all data
 */
export class DataService {
  /**
   * Load mandates data with caching
   */
  static async getMandates(): Promise<Mandate[]> {
    if (mandatesCache !== null) {
      return mandatesCache;
    }

    const jsonDirectory = path.join(process.cwd(), 'data');
    const fileContents = await fs.readFile(
      path.join(jsonDirectory, 'ppb2026_unique_mandates_with_metadata.json'), 
      'utf8'
    );
    
    const rawData = JSON.parse(fileContents);
    mandatesCache = rawData.sort((a: any, b: any) => b.num_entities - a.num_entities);
    return mandatesCache;
  }

  /**
   * Load entities data with caching
   */
  static async getEntities(): Promise<any[]> {
    if (entitiesCache !== null) {
      return entitiesCache;
    }

    // Dynamically import csv-parse
    const { parse } = await import('csv-parse/sync');

    const csvPath = path.resolve(process.cwd(), 'data/entity_details.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const entities = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    entitiesCache = entities;
    return entities;
  }

  /**
   * Load organs data with caching
   */
  static async getOrgans(): Promise<any[]> {
    if (organsCache !== null) {
      return organsCache;
    }

    const filePath = path.join(process.cwd(), 'data', 'organs.json');
    const fileContents = await fs.readFile(filePath, 'utf8');
    const organs = JSON.parse(fileContents);
    
    organsCache = organs;
    return organs;
  }

  /**
   * Get entity details map
   */
  static async getEntityDetailsMap(): Promise<Record<string, any>> {
    const entities = await this.getEntities();
    return Object.fromEntries(
      entities.map((row: any) => [row['Entity'], row])
    );
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  static clearCache(): void {
    mandatesCache = null;
    entitiesCache = null;
    organsCache = null;
  }
}
