import rawMap from '@/data/mission-map.json'

/**
 * Geography + time for the /missions map. The world land outline is a
 * pre-projected SVG path (equirectangular, cropped to the mission band) produced
 * at build time by `data-processing/scripts/build_mission_map.py`, so the browser
 * needs no map library — markers are plotted with the same linear projection.
 */

export interface MapProjection {
  lon0: number
  lon1: number
  lat0: number
  lat1: number
  w: number
  h: number
}

export interface MapMission {
  acronym: string
  name: string
  location: string
  type: string
  open: boolean
  lat: number
  lon: number
  startYear: number | null
  endYear: number | null
  strengthByYear: Record<string, number>
  peakStrength: number
}

export interface MissionMapData {
  generated: string
  projection: MapProjection
  land: string
  minYear: number
  maxYear: number
  missions: MapMission[]
}

const data = rawMap as unknown as MissionMapData

export function getMissionMap(): MissionMapData {
  return data
}

/** Project lon/lat to the map's pixel space (same formula as the land path). */
export function projectPoint(
  lon: number,
  lat: number,
  p: MapProjection
): { x: number; y: number } {
  return {
    x: ((lon - p.lon0) / (p.lon1 - p.lon0)) * p.w,
    y: ((p.lat1 - lat) / (p.lat1 - p.lat0)) * p.h,
  }
}

/** Deployed strength for a mission in a given year (0 if none / not reported). */
export function strengthInYear(m: MapMission, year: number): number {
  return m.strengthByYear[String(year)] ?? 0
}

/** Was the mission active during the given calendar year? */
export function activeInYear(m: MapMission, year: number): boolean {
  if (m.startYear == null) return false
  const end = m.endYear ?? year
  return year >= m.startYear && year <= end
}
