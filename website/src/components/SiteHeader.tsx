'use client'

import { ShareButton } from '@/components/ShareButton'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  ExternalLink,
  GitCompare,
  Home,
  Menu,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Mirrors the page container used by <main> in RootLayoutClient so the header
// content lines up with the main column.
const pageWidth = 'max-w-4xl lg:max-w-6xl xl:max-w-7xl'
const pagePadding = 'px-8 sm:px-12 lg:px-16'

export function SiteHeader() {
  const pathname = usePathname()
  // Outboard the emblem into the page margin on very wide viewports — needs
  // ~46px of side margin; 1408px is comfortable for xl:max-w-7xl.
  const outboardOnly = 'hidden min-[1408px]:block'
  const inlineOnly = 'min-[1408px]:hidden'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 py-3 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div
        className={cn(
          'relative mx-auto flex items-center gap-4',
          pagePadding,
          pageWidth,
        )}
      >
        {/* Emblem aspect ≈ 1.198:1. Outboard variant tucks into the
            container's left padding so its right edge sits 7.26px from where
            the wordmark begins (matches the inline emblem→wordmark gap on
            un-transcribed). The 56.74px offset = lg:px-16 (64px) − 7.26px.
            Inline variant takes over below 1408px viewports. */}
        <Link
          href="/"
          aria-label="Mandate Source Registry — home"
          className={cn(
            'absolute top-1/2 end-[calc(100%-56.74px)] h-10 w-[47.9px] -translate-y-1/2 transition-opacity hover:opacity-75',
            outboardOnly,
          )}
        >
          <Image
            src="/images/un-emblem-colour.svg"
            alt=""
            width={152}
            height={127}
            className="h-10 w-[47.9px] shrink-0 select-none"
            draggable={false}
          />
        </Link>
        <Link
          href="/"
          aria-label="Mandate Source Registry — home"
          className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-75"
        >
          <Image
            src="/images/un-emblem-colour.svg"
            alt=""
            width={152}
            height={127}
            className={cn('h-10 w-[47.9px] shrink-0 select-none', inlineOnly)}
            draggable={false}
          />
          {/* Mobile: wordmark + beta badge stack vertically so the title can
              shrink and the badge stays visible. md+: original inline layout. */}
          <span className="flex flex-col items-start gap-1 md:flex-row md:items-center md:gap-2.5">
            <span className="text-lg leading-none tracking-tight text-foreground md:text-[23.83px]">
              <span className="hidden font-bold md:inline">United Nations </span>
              <span className="font-light">Mandate Source Registry</span>
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help rounded-md bg-un-blue/10 px-1.5 py-0.5 text-[10px] leading-none font-semibold whitespace-nowrap text-un-blue md:px-2 md:py-1 md:text-xs">
                  beta version
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-56">
                <p className="text-sm">
                  The development of the mandate registry is still ongoing. Go
                  to the{' '}
                  <Link
                    href="/methodology"
                    className="font-medium text-un-blue underline hover:text-shuttle-gray"
                  >
                    Methodology
                  </Link>{' '}
                  page for information on the current scope.
                </p>
              </TooltipContent>
            </Tooltip>
          </span>
        </Link>
        <div className="ms-auto flex items-center gap-2">
          <ShareButton />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Open navigation menu"
                className="inline-flex h-auto shrink-0 items-center gap-1 bg-trout! px-2 py-1 text-xs text-white! hover:bg-trout/90! sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-sm"
              >
                <Menu className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                asChild={pathname !== '/'}
                className={
                  pathname === '/'
                    ? 'cursor-default bg-un-blue/10 font-medium text-un-blue'
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
                    ? 'cursor-default bg-un-blue/10 font-medium text-un-blue'
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
                asChild={pathname !== '/diff'}
                className={pathname === '/diff' ? 'cursor-default' : ''}
              >
                {pathname === '/diff' ? (
                  <span className="flex items-center gap-2 font-medium">
                    <GitCompare className="h-4 w-4" />
                    UN Document Diff Viewer
                  </span>
                ) : (
                  <Link href="/diff" className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4" />
                    UN Document Diff Viewer
                  </Link>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                asChild={pathname !== '/resources'}
                className={
                  pathname === '/resources'
                    ? 'cursor-default bg-un-blue/10 font-medium text-un-blue'
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
  )
}
