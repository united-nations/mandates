'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FILTER_PARAMS } from '@/lib/filter-constants'

interface BackButtonProps {
  label?: string
  className?: string
}

export function BackButton({
  label = 'Go Back',
  className = '',
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (typeof window !== 'undefined') {
      const hasHistory = window.history.length > 1
      const hasOpener = !!window.opener
      const currentPath = window.location.pathname

      // Check if we're on a specific page type that should navigate up hierarchically
      const isMandate = currentPath.startsWith('/mandate/')
      const isOrgan = currentPath.startsWith('/organ/')
      const isEntity = currentPath.startsWith('/entity/')
      const isMethodology = currentPath === '/methodology'
      const isResources = currentPath === '/resources'

      if (isOrgan || isEntity || isMethodology || isResources) {
        // For organ/entity/methodology/resources pages, go to main page but preserve relevant search params
        const currentUrl = new URL(window.location.href)
        const searchParams = currentUrl.searchParams

        // Preserve relevant search parameters that make sense on the main page
        const preservedParams = new URLSearchParams()

        // Use filter constants to determine which parameters to preserve
        // Add 'q' for search query which isn't in the filter constants but is used
        const paramsToPreserve = ['q', ...FILTER_PARAMS]

        paramsToPreserve.forEach((param) => {
          const value = searchParams.get(param)
          if (value) {
            preservedParams.set(param, value)
          }
        })

        // Navigate to main page with preserved parameters
        const mainPageUrl = preservedParams.toString()
          ? `/?${preservedParams.toString()}`
          : '/'
        router.push(mainPageUrl as never)
      } else if (isMandate && hasOpener && !window.opener.closed) {
        // For mandate pages opened from another page, use stored return URL
        const returnUrl = sessionStorage.getItem('mandateReturnUrl')

        if (returnUrl) {
          window.location.href = returnUrl
          sessionStorage.removeItem('mandateReturnUrl')
        } else {
          router.push('/')
        }
      } else if (hasHistory) {
        window.history.back()
      } else {
        router.push('/')
      }
    } else {
      router.push('/')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className={`mb-4 inline-flex h-auto shrink-0 items-center gap-1 bg-trout! px-2 py-1 text-xs text-white! transition-colors hover:bg-trout/90! sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-sm ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      {label}
    </Button>
  )
}
