import { readFile } from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type { Mandate, Entity, Organ } from '@/types';

interface EntityDetails {
  'entity': string;
  'entity_long': string;
}

class DataService {
  private static mandatesCache: Mandate[] | null = null;
  private static entitiesCache: Entity[] | null = null;
  private static organsCache: Organ[] | null = null;
  private static entityDetailsMap: Map<string, Entity> | null = null;
  private static organDetailsMap: Map<string, Organ> | null = null;

  /**
   * Load all mandate data from JSON file
   */
  static async getMandates(): Promise<Mandate[]> {
    if (this.mandatesCache !== null) {
      return this.mandatesCache;
    }

    try {
      const filePath = path.join(process.cwd(), 'data', 'ppb2026_unique_mandates_with_metadata.json');
      const fileContent = await readFile(filePath, 'utf-8');
      const rawData = JSON.parse(fileContent);
      
      // Transform raw data to match our types
      this.mandatesCache = rawData.map((item: any) => ({
        ...item,
        // Ensure consistent field names
        full_document_symbol: item.full_document_symbol || item.symbol,
        description: item.description || null,
        type: item.type || 'Unknown',
        citation_info: item.citation_info || [],
        subject_headings: item.subject_headings || [],
        entities: item.entities || [],
        paragraphs: item.paragraphs || [],
      }));
      
      return this.mandatesCache!;
    } catch (error) {
      console.error('Error loading mandates data:', error);
      return [];
    }
  }

  /**
   * Load all entity data from CSV file
   */
  static async getEntities(): Promise<Entity[]> {
    if (this.entitiesCache !== null) {
      return this.entitiesCache;
    }

    try {
      const filePath = path.join(process.cwd(), 'data', 'mandate_entities.csv');
      const fileContent = await readFile(filePath, 'utf-8');
      const rawData = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      }) as EntityDetails[];

      this.entitiesCache = rawData.map((item: EntityDetails) => ({
        entity: item['entity'] || '',
        entity_long: item['entity_long'] || '',
        entity_link: item['entity_link'] || undefined,
        transparency_portal_link: item['transparency_portal_link'] || undefined,
        entity_description: item['entity_description'] || undefined,
      }));

      return this.entitiesCache;
    } catch (error) {
      console.error('Error loading entities data:', error);
      return [];
    }
  }

  /**
   * Load all organ data from JSON file
   */
  static async getOrgans(): Promise<Organ[]> {
    if (this.organsCache !== null) {
      return this.organsCache;
    }

    try {
      const filePath = path.join(process.cwd(), 'data', 'organs.json');
      const fileContent = await readFile(filePath, 'utf-8');
      const rawData = JSON.parse(fileContent);
      
      this.organsCache = rawData.map((item: any) => ({
        short: item.short || '',
        long: item.long || '',
        website: item.website || undefined,
      }));

      return this.organsCache!;
    } catch (error) {
      console.error('Error loading organs data:', error);
      return [];
    }
  }

  /**
   * Get entity details map for quick lookups
   */
  static async getEntityDetailsMap(): Promise<Map<string, Entity>> {
    if (this.entityDetailsMap) {
      return this.entityDetailsMap;
    }

    const entities = await this.getEntities();
    this.entityDetailsMap = new Map();
    
    entities.forEach(entity => {
      this.entityDetailsMap!.set(entity.entity, entity);
    });

    return this.entityDetailsMap;
  }

  /**
   * Get organ details map for quick lookups
   */
  static async getOrganDetailsMap(): Promise<Map<string, Organ>> {
    if (this.organDetailsMap) {
      return this.organDetailsMap;
    }

    const organs = await this.getOrgans();
    this.organDetailsMap = new Map();
    
    organs.forEach(organ => {
      this.organDetailsMap!.set(organ.short, organ);
    });

    return this.organDetailsMap;
  }

  /**
   * Get entity by short name
   */
  static async getEntityByShortName(shortName: string): Promise<Entity | null> {
    const entityMap = await this.getEntityDetailsMap();
    return entityMap.get(shortName) || null;
  }

  /**
   * Get organ by short name
   */
  static async getOrganByShortName(shortName: string): Promise<Organ | null> {
    const organMap = await this.getOrganDetailsMap();
    return organMap.get(shortName) || null;
  }

  /**
   * Clear all caches (useful for testing or data updates)
   */
  static clearCache(): void {
    this.mandatesCache = null;
    this.entitiesCache = null;
    this.organsCache = null;
    this.entityDetailsMap = null;
    this.organDetailsMap = null;
  }

  /**
   * Get all data at once (for the unified API)
   */
  static async getAllData(): Promise<{
    mandates: Mandate[];
    entities: Entity[];
    organs: Organ[];
    entityMap: Map<string, Entity>;
    organMap: Map<string, Organ>;
  }> {
    const [mandates, entities, organs, entityMap, organMap] = await Promise.all([
      this.getMandates(),
      this.getEntities(),
      this.getOrgans(),
      this.getEntityDetailsMap(),
      this.getOrganDetailsMap(),
    ]);

    return {
      mandates,
      entities,
      organs,
      entityMap,
      organMap,
    };
  }
}

export default DataService; 