'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * Returns a callback that navigates back in history, but falls back to the
 * homepage when there is no in-app history to return to (e.g. the user
 * landed directly on a detail page, opened it in a new tab, or pasted the
 * URL). This guarantees a "back" affordance always lands somewhere sensible.
 */
export function useSafeBack(fallback = '/') {
  const router = useRouter()

  return useCallback(() => {
    // window.history.length counts pre-app pages too (e.g. the user went
    // google.com -> this URL in the same tab), so it wrongly reports "has
    // history" and router.back() escapes the app. Next's App Router instead
    // tracks an in-app navigation index on history.state.idx: it is 0 on a
    // fresh document load (direct link, new tab, pasted URL) and only
    // increments on client-side navigations within the app. idx > 0 ⇒ there
    // is an in-app page to return to (e.g. the filtered homepage).
    const idx =
      typeof window !== 'undefined' &&
      window.history.state &&
      typeof window.history.state.idx === 'number'
        ? window.history.state.idx
        : 0

    if (idx > 0) {
      router.back()
    } else {
      router.push(fallback)
    }
  }, [router, fallback])
}
