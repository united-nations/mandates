/**
 * @file Eager/lazy card equivalence assembly
 * @description Reconstructs the original card payload from split loaders.
 *
 * Key exports:
 * - assembleExploreCardData() - Preserves the original serialized shape.
 */

interface AssemblyOptions<D, F> {
  directories: D
  figures: F
}

/** Combines directory and figure fields in their original property order. */
export const assembleExploreCardData = <D, F>(
  options: AssemblyOptions<D, F>
): D & F => ({ ...options.directories, ...options.figures })
