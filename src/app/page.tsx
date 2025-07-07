'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Clarity from '@microsoft/clarity'

import { MandateExplorer } from '@/components/mandate-explorer'
import { PageLayout } from '@/components/ui/page-layout'
import { explainerTexts } from '@/lib/explainer-texts'
import Link from 'next/link'

interface ParentContext {
  scrollY: number
  viewportHeight: number
  iframeTop: number
}

function MandateNavigator () {
  const router = useRouter()
  const [parentContext, setParentContext] = useState<ParentContext | null>(null)

  // Initialize Microsoft Clarity
  useEffect(() => {
    Clarity.init('s4kksugeb9')
  }, [])

  useEffect(() => {
    const FRAME_ORG = 'https://un80analytics.azurewebsites.net'

    if (window.parent === window) {
      return
    }

    const post = (type: string, data = {}) => {
      // Allow posting to any parent origin, as per the example script.
      // The parent is responsible for verifying the origin.
      window.parent.postMessage({ type, ...data }, '*')
    }

    const reportHeight = () => {
      post('setHeight', { height: document.documentElement.scrollHeight })
    }

    const reportParams = () => {
      post('syncParams', { params: window.location.search })
    }

    // Initial report
    reportHeight()
    reportParams()

    // Report height on resize
    const resizeObserver = new ResizeObserver(reportHeight)
    resizeObserver.observe(document.documentElement)

    // Report params on URL changes
    window.addEventListener('popstate', reportParams)
    window.addEventListener('hashchange', reportParams)

    // Report params on internal navigation (clicks on links)
    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href]')
      if (
        anchor &&
        (anchor as HTMLAnchorElement).origin === window.location.origin
      ) {
        setTimeout(reportParams, 50)
      }
    }
    document.addEventListener('click', handleDocClick)

    // Listen for messages from parent
    const handleMessage = (e: MessageEvent) => {
      // The sample child script does not check origin, assuming it's embedded by a trusted parent.
      // if (e.origin !== FRAME_ORG) return;

      const { type, params, ...context } = e.data || {}

      if (
        type === 'init' &&
        typeof params === 'string' &&
        params !== window.location.search
      ) {
        const url = new URL(window.location.href)
        url.search = params
        window.history.replaceState(null, '', url.toString())
        // The Next.js router might not pick up history.replaceState,
        // but popstate should fire and update URL, which should trigger data-fetching useEffects
        // Let's manually trigger a re-render by using the router.
        router.replace(url.toString(), { scroll: false })
        reportParams()
        reportHeight()
      }

      if (type === 'pingHeight') {
        reportHeight()
      }

      if (type === 'parentContext') {
        const { scrollY, viewportHeight, iframeTop } = context
        if (
          typeof scrollY === 'number' &&
          typeof viewportHeight === 'number' &&
          typeof iframeTop === 'number'
        ) {
          setParentContext({ scrollY, viewportHeight, iframeTop })
        }
      }
    }
    window.addEventListener('message', handleMessage)

    // When in an iframe, ask the parent for context.
    // The parent should listen for this message and respond with a 'parentContext' message.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'requestParentContext' }, '*')
    }

    // Cleanup
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('popstate', reportParams)
      window.removeEventListener('hashchange', reportParams)
      document.removeEventListener('click', handleDocClick)
      window.removeEventListener('message', handleMessage)
    }
  }, [router])

  return (
    <PageLayout>
      <div className='space-y-6 pb-48'>
        {/* Header with context info */}
        <div className='text-muted-foreground mt-2 sm:text-justify max-w-[792px] text-left'>
          <p className='leading-tight mb-0'>
            {explainerTexts.mainHeader.shortDescription}{' '}<br />
            <Link
              href='/methodology'
              className='font-bold text-un-blue hover:text-shuttle-gray text-sm inline transition-colors'
              style={{ textDecoration: 'none' }}
            >
              Read More
            </Link>
          </p>
        </div>

        {/* Mandate Explorer - now renders sidebars internally */}
        <MandateExplorer pageType="main" />
      </div>
    </PageLayout>
  )
}

export default function Page () {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MandateNavigator />
    </Suspense>
  )
}
