'use client'

import { createContext, useContext } from 'react'

/**
 * Lets a directory (organs / entities / subjects) rendered inside a modal tell
 * that modal to close the moment the user picks a facet. Provided by the
 * dialogs in {@link DirectoryExplorer} and consumed by
 * {@link useSectionFilter}, so the directory components themselves need no
 * extra wiring. Empty default → no-op outside a modal.
 */
export const DirectorySelectContext = createContext<{ onSelect?: () => void }>(
  {}
)

export function useDirectorySelect() {
  return useContext(DirectorySelectContext)
}
