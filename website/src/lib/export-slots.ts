/**
 * A fixed number of concurrent export slots. The release function may be
 * called more than once; only the first call frees the slot.
 */
export function createExportSlots(max: number) {
  let active = 0
  return {
    /** A release function, or null when every slot is taken. */
    tryAcquire(): (() => void) | null {
      if (active >= max) return null
      active++
      let released = false
      return () => {
        if (released) return
        released = true
        active--
      }
    },
    active: () => active,
  }
}
