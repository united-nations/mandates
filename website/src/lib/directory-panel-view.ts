/**
 * @file Directory panel display rule
 * @description Decides what a lazy panel shows while a selection resolves.
 *
 * Key exports:
 * - panelView() - Maps a panel's progress to what it puts on screen.
 */

/** How far behind the selection a panel's content is. */
export interface PanelProgress {
  /** Nothing has been loaded for this panel yet. Implies `pending`. */
  empty: boolean
  error: string | null
  /** What is on screen is not the answer to the filters now selected. */
  pending: boolean
}

export type PanelView =
  { show: 'error' } | { show: 'skeleton' } | { show: 'content'; stale: boolean }

/**
 * One rule carries the weight: once a panel has content, a new selection never
 * takes it off screen - it is marked stale and stays put until the answer that
 * replaces it arrives. A skeleton is for a panel with nothing to stand in for,
 * which a panel only is on its first open.
 *
 * This used to be three ordered conditions inside the component, and the order
 * was the bug: a refresh read as "not loaded", so the tree came out and a
 * skeleton went in, twice changing the height of a dialog that is sized by its
 * content and centred on the viewport.
 */
export const panelView = (progress: PanelProgress): PanelView =>
  progress.error
    ? { show: 'error' }
    : progress.empty
      ? { show: 'skeleton' }
      : { show: 'content', stale: progress.pending }
