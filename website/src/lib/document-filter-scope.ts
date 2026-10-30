import type { FilterOptions } from '@/types'

const controls = new Set(['page', 'limit', 'sort_by', 'ppb_version', 'group'])

export function hasDocumentScope(filters: FilterOptions) {
  return Object.entries(filters).some(
    ([key, value]) =>
      !controls.has(key) &&
      typeof value === 'string' &&
      value.trim() !== '' &&
      value !== 'all'
  )
}
