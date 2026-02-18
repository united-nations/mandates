'use client'

import { BackButton } from '@/components/BackButton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ShareButton } from '@/components/ShareButton'
import { Toaster } from '@/components/ui/sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { FilterProvider } from '@/contexts/FilterContext'
import {
  BookOpen,
  ExternalLink,
  Home,
  Info,
  Menu,
  MessageCircle,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
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
  const isDiffPage = pathname === '/diff'

  return (
    <>
      <TooltipProvider>
        <FilterProvider>
          <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
            <div className="mx-auto flex w-full max-w-4xl items-start justify-between px-8 py-2 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
              <div className="flex-1">
                <div className="mb-0 flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                    <Link
                      href="/"
                      className="mt-1 text-4xl leading-tight tracking-tight text-foreground transition-colors hover:text-un-blue"
                    >
                      <div className="leading-none">
                        <span className="font-bold">UN Mandate</span>
                        <span className="block text-3xl font-normal lg:ml-1 lg:inline lg:pl-1 lg:text-4xl">
                          Source Registry
                        </span>
                      </div>
                    </Link>
                    {/*  beta badge that repositions */}
                    <div className="mt-1 hidden self-start lg:block lg:self-auto">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className="inline-flex h-auto cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-700"
                          >
                            beta version
                            <Info className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-56">
                          <p className="text-sm">
                            This beta version focuses on data about the UN
                            secretariat.
                            <br />
                            Go to the{' '}
                            <Link
                              href="/methodology"
                              className="font-medium text-un-blue underline hover:text-shuttle-gray"
                            >
                              Methodology
                            </Link>{' '}
                            page for more details.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <ShareButton />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Open navigation menu"
                      className="inline-flex h-auto shrink-0 items-center gap-1 bg-trout! px-2 py-1 text-xs text-white! hover:bg-trout/90! sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-sm"
                    >
                      <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      asChild={pathname !== '/'}
                      className={
                        pathname === '/'
                          ? 'cursor-default text-muted-foreground opacity-60'
                          : ''
                      }
                    >
                      {pathname === '/' ? (
                        <span className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Mandate Source Registry
                        </span>
                      ) : (
                        <Link href="/" className="flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          Mandate Source Registry
                        </Link>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild={pathname !== '/methodology'}
                      className={
                        pathname === '/methodology'
                          ? 'cursor-default text-muted-foreground opacity-60'
                          : ''
                      }
                    >
                      {pathname === '/methodology' ? (
                        <span className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Methodology
                        </span>
                      ) : (
                        <Link
                          href="/methodology"
                          className="flex items-center gap-2"
                        >
                          <BookOpen className="h-4 w-4" />
                          Methodology
                        </Link>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      asChild={pathname !== '/resources'}
                      className={
                        pathname === '/resources'
                          ? 'cursor-default text-muted-foreground opacity-60'
                          : ''
                      }
                    >
                      {pathname === '/resources' ? (
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          More Resources
                        </span>
                      ) : (
                        <Link
                          href="/resources"
                          className="flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          More Resources
                        </Link>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Back Button - shown on all pages except main page and diff page */}
          {!isMainPage && !isDiffPage && (
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

          <Toaster />
        </FilterProvider>
      </TooltipProvider>
    </>
  )
}
