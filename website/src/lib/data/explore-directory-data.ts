/**
 * @file Explore-directory data composition
 * @description Loads independent directory payloads concurrently.
 *
 * Key exports:
 * - loadExploreDirectoryData() - Names and combines four injected loaders.
 */

interface DirectoryLoaders<O, B, S, D> {
  loadOrgans: () => Promise<O>
  loadBudget: () => Promise<B>
  loadSubjects: () => Promise<S>
  loadTypes: () => Promise<D>
}

/** Loads the complete directory payload without serial waits. */
export const loadExploreDirectoryData = async <O, B, S, D>(
  loaders: DirectoryLoaders<O, B, S, D>
) => {
  const [organGroups, budgetStreams, subjectDomains, documentTypes] =
    await Promise.all([
      loaders.loadOrgans(),
      loaders.loadBudget(),
      loaders.loadSubjects(),
      loaders.loadTypes(),
    ])
  return { organGroups, budgetStreams, subjectDomains, documentTypes }
}
