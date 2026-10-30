'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sharedSidebarTarget } from '@/lib/sidebar-link'

/** Restore a copied sidebar link through a soft navigation so interception works. */
export function OpenSharedMandate() {
  const router = useRouter()
  useEffect(() => {
    const open = () => {
      const { hash, search, pathname } = window.location
      if (pathname !== '/secretariat') return
      const target = sharedSidebarTarget(hash, search)
      if (!target) return
      // Remove the trigger from the underlying history entry so Close/Back
      // returns to the list without opening the sidebar again.
      window.history.replaceState(
        window.history.state,
        '',
        `${pathname}${search}`
      )
      router.push(target, { scroll: false })
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [router])
  return null
}
