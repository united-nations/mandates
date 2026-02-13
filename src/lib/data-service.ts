import { readFile } from 'fs/promises'
import path from 'path'
import type { Entity, Organ } from '@/types'
import { getAllEntities, getEntityMap, getEntityByCode } from '@/lib/db/entities'

/**
 * Data Service
 *
 * Provides access to reference data (entities, organs).
 * Mandate data is now fetched from the database via @/lib/db/mandates.
 */
class DataService {
  private static organsCache: Organ[] | null = null
  private static organDetailsMap: Map<string, Organ> | null = null

  /**
   * Load entities from the database
   */
  static async getEntities(): Promise<Entity[]> {
    return getAllEntities()
  }

  /**
   * Get entity details map for quick lookups (from database)
   */
  static async getEntityDetailsMap(): Promise<Map<string, Entity>> {
    return getEntityMap()
  }

  /**
   * Get entity by short name (from database)
   */
  static async getEntityByShortName(shortName: string): Promise<Entity | null> {
    return getEntityByCode(shortName)
  }

  /**
   * Load all organ data from JSON file (kept in JSON as configured)
   */
  static async getOrgans(): Promise<Organ[]> {
    if (this.organsCache !== null) {
      return this.organsCache
    }

    try {
      const filePath = path.join(process.cwd(), 'data', 'organs.json')
      const fileContent = await readFile(filePath, 'utf-8')
      const rawData = JSON.parse(fileContent)

      this.organsCache = rawData.map((item: { short?: string; long?: string; website?: string }) => ({
        short: item.short || '',
        long: item.long || '',
        website: item.website || undefined,
      }))

      return this.organsCache!
    } catch (error) {
      console.error('Error loading organs data:', error)
      return []
    }
  }

  /**
   * Get organ details map for quick lookups
   */
  static async getOrganDetailsMap(): Promise<Map<string, Organ>> {
    if (this.organDetailsMap) {
      return this.organDetailsMap
    }

    const organs = await this.getOrgans()
    this.organDetailsMap = new Map()

    organs.forEach((organ) => {
      this.organDetailsMap!.set(organ.short, organ)
    })

    return this.organDetailsMap
  }

  /**
   * Get organ by short name
   */
  static async getOrganByShortName(shortName: string): Promise<Organ | null> {
    const organMap = await this.getOrganDetailsMap()
    return organMap.get(shortName) || null
  }

  /**
   * Clear all caches (useful for testing or data updates)
   */
  static clearCache(): void {
    this.organsCache = null
    this.organDetailsMap = null
  }

  /**
   * Get reference data for lookups (entities and organs)
   * Used by API routes for enriching mandate data
   */
  static async getReferenceData(): Promise<{
    entities: Entity[]
    organs: Organ[]
    entityMap: Map<string, Entity>
    organMap: Map<string, Organ>
  }> {
    const [entities, organs, entityMap, organMap] = await Promise.all([
      this.getEntities(),
      this.getOrgans(),
      this.getEntityDetailsMap(),
      this.getOrganDetailsMap(),
    ])

    return {
      entities,
      organs,
      entityMap,
      organMap,
    }
  }
}

export default DataService
