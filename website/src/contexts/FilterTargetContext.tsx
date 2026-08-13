'use client'

import { createContext, useContext } from 'react'

/**
 * When set to a path (e.g. "/secretariat"), filter selections made by charts
 * and directories navigate to that path with the chosen facets as a fresh
 * query — instead of mutating the current route's URL through
 * {@link FilterContext}. Used on the analytics page so a chart click lands on
 * the main mandate table, filtered. Null (the default) → normal in-page
 * behaviour, so nothing changes on /secretariat itself.
 */
export const FilterTargetContext = createContext<string | null>(null)

export function useFilterTarget() {
  return useContext(FilterTargetContext)
}
