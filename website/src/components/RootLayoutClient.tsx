'use client'
// Separate client boundary so RootLayout stays a Server Component while usePathname and context providers work here.

import { BackButton } from '@/components/BackButton'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { FilterProvider } from '@/contexts/FilterContext'
import { MessageCircle } from 'lucide-react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'

// Dynamic import to prevent SSR and eliminate hydration errors
const AnimatedLogo = dynamic(
  () => import('@/components/AnimatedLogo').then((mod) => mod.AnimatedLogo),
  {
    ssr: false,
  }
)

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMainPage = pathname === '/'

  return (
    <TooltipProvider>
      <FilterProvider>
        <SiteHeader />

        {/* Back Button - shown on all pages except main page */}
        {!isMainPage && (
          <div className="mx-auto mb-2 w-full max-w-4xl px-8 pt-6 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
            <BackButton />
          </div>
        )}

        <main className="mx-auto w-full max-w-4xl px-8 py-6 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          {children}
        </main>

        {/* Fixed Feedback Button */}
        <Button
          asChild
          className="fixed right-6 bottom-6 z-50 shadow-lg transition-shadow hover:shadow-xl"
          size="default"
        >
          <a
            href="https://airtable.com/appId4rDWaFTpzNWz/pagpU0nMIhQMQPICL/form"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Give Feedback
          </a>
        </Button>

        {/* UN80 Logo with UN20 Animation - fixed at bottom */}
        <AnimatedLogo />

        <SiteFooter />

        <Toaster />
      </FilterProvider>
    </TooltipProvider>
  )
}
