'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Clarity from '@microsoft/clarity'

import { MandateExplorer } from '@/components/mandate-explorer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { explainerTexts } from '@/lib/explainer-texts'
import { Building, Search } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { EntityListSidebar } from '@/components/entity-list-sidebar'
import { OrganListSidebar } from '@/components/organ-list-sidebar'

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
    <TooltipProvider>
      <div className='min-h-screen bg-background text-foreground'>
        <main className='w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16'>
          {/* Header with context info */}
          <section className='pb-2'>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='mb-6 mt-2'>
                  <div className='flex items-center gap-x-2'>
                    <h1 className='text-4xl font-bold tracking-tight text-foreground'>
                      {explainerTexts.mainHeader.title}
                    </h1>
                    <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200'>
                      {explainerTexts.mainHeader.versionTag}
                    </span>
                  </div>
                </div>
                <div className='text-muted-foreground mt-2 sm:text-justify'>
                  <p className='leading-tight mb-3'>
                    {explainerTexts.mainHeader.shortDescription}{' '}
                    <Button
                      variant='link'
                      className='p-0 h-auto text-un-blue hover:text-shuttle-gray text-sm inline'
                      onClick={() => {
                        const element = document.getElementById('about-section')
                        element?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'start'
                        })
                      }}
                    >
                      Read More...
                    </Button>
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Mandate Explorer */}
          <MandateExplorer 
            entityListSidebar={<EntityListSidebar />}
            organListSidebar={<OrganListSidebar />}
          />

          <section id='about-section' className='mt-16 pt-8'>
            <div className='space-y-6 border-t pt-6'>
              <h2 className='text-2xl font-bold tracking-tight'>
                About the Registry
              </h2>
              <div className='text-muted-foreground space-y-4 sm:text-justify'>
                {explainerTexts.mainHeader.fullDescription.map(
                  (paragraph, index) => (
                    <p key={index} className='leading-relaxed'>
                      {paragraph}
                    </p>
                  )
                )}
              </div>
              <div>
                <p className='text-sm text-muted-foreground italic sm:text-justify leading-relaxed'>
                  {explainerTexts.mainHeader.disclaimer}
                </p>
              </div>

              {/* UN Links Section */}
              <div className="mt-12">
                <h2 className="text-lg font-semibold mb-4">Explore More Transparency Resources</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Card 2: open.un.org */}
                  <a href="https://open.un.org/" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-3 hover:shadow-lg transition flex flex-col items-center text-center">
                    <img src="/screenshots/open.un.org.png" alt="open.un.org screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
                    <div className="font-medium text-un-blue text-base mb-1">UN Transparency Portal</div>
                  </a>
                  {/* Card 3: unsceb.org/financial-statistics */}
                  <a href="https://unsceb.org/financial-statistics" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-3 hover:shadow-lg transition flex flex-col items-center text-center">
                    <img src="/screenshots/unsceb.org.png" alt="unsceb.org/financial-statistics screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
                    <div className="font-medium text-un-blue text-base mb-1">CEB Financial Statistics</div>
                  </a>
                  {/* Card 4: financingun.report */}
                  <a href="https://financingun.report/un-financing/explore-data" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-3 hover:shadow-lg transition flex flex-col items-center text-center">
                    <img src="/screenshots/financingun.report.png" alt="financingun.report screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
                    <div className="font-medium text-un-blue text-base mb-1">"Financing the UN" Report</div>
                  </a>
                  {/* Card 1: results.un.org */}
                  <a href="https://results.un.org/" target="_blank" rel="noopener noreferrer" className="block rounded-lg border border-muted p-3 hover:shadow-lg transition flex flex-col items-center text-center">
                    <img src="/screenshots/results.un.org.png" alt="results.un.org screenshot" className="rounded-md w-full h-32 object-cover mb-3" />
                    <div className="font-medium text-un-blue text-base mb-1">Programme Budget Results</div>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </TooltipProvider>
  )
}

export default function Page () {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MandateNavigator />
    </Suspense>
  )
}
