/**
 * @file Explore-directory data composition
 * @description Loads only the payload required by one open panel.
 *
 * Key exports:
 * - loadExplorePanelData() - Dispatches a panel to its minimal loaders.
 */

import type { DirectoryPanel } from '@/lib/directory-request'

interface DirectoryLoaders<O, B, S, D> {
  loadOrgans: () => Promise<O>
  loadBudget: () => Promise<B>
  loadSubjects: () => Promise<S>
  loadTypes: () => Promise<D>
}

const loadCatalogue = async <S, D>(
  loaders: Pick<DirectoryLoaders<never, never, S, D>, 'loadSubjects' | 'loadTypes'>
) => {
  const [subjectDomains, documentTypes] = await Promise.all([
    loaders.loadSubjects(),
    loaders.loadTypes(),
  ])
  return { subjectDomains, documentTypes }
}

/** Loads only the resource required by the requested panel. */
export const loadExplorePanelData = async <O, B, S, D>(
  panel: DirectoryPanel,
  loaders: DirectoryLoaders<O, B, S, D>
) => {
  if (panel === 'organs')
    return { organGroups: await loaders.loadOrgans() }
  if (panel === 'catalogue') return loadCatalogue(loaders)
  return { budgetStreams: await loaders.loadBudget() }
}
