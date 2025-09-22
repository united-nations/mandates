'use client'

import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { TooltipProvider } from '@/components/ui/tooltip'
import { explainerTexts } from '@/lib/explainer-texts'
import { GoogleAnalytics } from '@next/third-parties/google'
import { FilterProvider } from '@/contexts/FilterContext'
import { Menu, MessageCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import Clarity from '@microsoft/clarity'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { BackButton } from '@/components/ui/back-button'
import { Roboto } from 'next/font/google'

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
    variable: '--font-roboto',
    preload: true,
    adjustFontFallback: false,
})

export default function RootLayout({
    children
}: Readonly<{
    children: React.ReactNode
}>) {
    const pathname = usePathname()
    const isMainPage = pathname === '/'
    const isResolutionsPage = pathname === '/resolutions'
    const isReportsPage = pathname === '/reports'
    const isDiffPage = pathname === '/diff'

    // Initialize Microsoft Clarity with a delay to not block initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            Clarity.init('s4kksugeb9')
        }, 1000) // Delay Clarity initialization by 1 second

        return () => clearTimeout(timer)
    }, [])
    return (
        <html lang='en' className={roboto.variable}>
            <head>
                {/* DNS prefetch for external resources */}
                <link rel="dns-prefetch" href="//fonts.googleapis.com" />
                <link rel="dns-prefetch" href="//fonts.gstatic.com" />
                <link rel="dns-prefetch" href="//www.googletagmanager.com" />
                <link rel="dns-prefetch" href="//www.google-analytics.com" />
                <link rel="dns-prefetch" href="//forms.office.com" />
            </head>
            {/* Updated body to use font-sans from Tailwind config (which is now Roboto) */}
            <body className='font-sans antialiased min-h-screen bg-background text-foreground'>
                <TooltipProvider>
                    <FilterProvider>
                        <header className='w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-8 pb-2 flex items-start justify-between'>
                            <div className='flex-1'>
                                <div className='flex flex-col lg:flex-row lg:items-center lg:gap-x-2 mb-2'>
                                    <Link
                                        href='/'
                                        className='text-4xl font-bold tracking-tight text-foreground hover:text-un-blue transition-colors'
                                    >
                                        {explainerTexts.mainHeader.title}
                                    </Link>
                                    <div className='mt-1 lg:mt-0'>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className='inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer h-auto'
                                                >
                                                    beta version
                                                    <Info className='h-3 w-3' />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-56">
                                                <p className="text-sm">
                                                    This beta version focuses on data about the UN secretariat.
                                                    <br />
                                                    Go to the{' '}
                                                    <Link 
                                                        href="/methodology" 
                                                        className="text-un-blue hover:text-shuttle-gray underline font-medium"
                                                    >
                                                        Methodology
                                                    </Link>
                                                    {' '}page for more details.
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                            <div className='pt-2'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            aria-label='Open navigation menu'
                                            className='shrink-0 inline-flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-1 sm:px-2.5 sm:py-1.5 h-auto !bg-trout !text-white hover:!bg-trout/90'
                                        >
                                            <Menu className='h-3 w-3 sm:h-4 sm:w-4' />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align='end'>
                                        <DropdownMenuItem
                                            asChild={pathname !== '/'}
                                            className={pathname === '/' ? 'text-muted-foreground cursor-default opacity-60' : ''}
                                        >
                                            {pathname === '/' ? (
                                                <span>Mandate Source Registry</span>
                                            ) : (
                                                <Link href='/'>Mandate Source Registry</Link>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            asChild={pathname !== '/methodology'}
                                            className={pathname === '/methodology' ? 'text-muted-foreground cursor-default opacity-60' : ''}
                                        >
                                            {pathname === '/methodology' ? (
                                                <span>Methodology</span>
                                            ) : (
                                                <Link href='/methodology'>Methodology</Link>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            asChild={pathname !== '/resolutions'}
                                            className={pathname === '/resolutions' ? 'text-muted-foreground cursor-default opacity-60' : ''}
                                        >
                                            {pathname === '/resolutions' ? (
                                                <span>All Resolutions</span>
                                            ) : (
                                                <Link href='/resolutions'>All Resolutions</Link>
                                            )}
                                        </DropdownMenuItem>
                                        {/* <DropdownMenuItem
                                            asChild={pathname !== '/reports'}
                                            className={pathname === '/reports' ? 'text-muted-foreground cursor-default opacity-60' : ''}
                                        >
                                            {pathname === '/reports' ? (
                                                <span>Reports</span>
                                            ) : (
                                                <Link href='/reports'>Reports</Link>
                                            )}
                                        </DropdownMenuItem> */}
                                        <DropdownMenuItem
                                            asChild={pathname !== '/resources'}
                                            className={pathname === '/resources' ? 'text-muted-foreground cursor-default opacity-60' : ''}
                                        >
                                            {pathname === '/resources' ? (
                                                <span>More Resources</span>
                                            ) : (
                                                <Link href='/resources'>More Resources</Link>
                                            )}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </header>

                        {/* Back Button - shown on all pages except main page, resolutions page, reports page, and diff page */}
                        {!isMainPage && !isResolutionsPage && !isReportsPage && !isDiffPage && (
                            <div className='w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 mb-8'>
                                <BackButton />
                            </div>
                        )}

                        <main className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-0 px-8 sm:px-12 lg:px-16">
                            {children}
                        </main>

                        {/* Fixed Feedback Button */}
                        <Button
                            asChild
                            className='fixed bottom-6 right-6 z-50 shadow-lg hover:shadow-xl transition-shadow'
                            size='default'
                        >
                            <a
                                href='https://forms.office.com/Pages/ResponsePage.aspx?id=2zWeD09UYE-9zF6kFubccKWYVHshXnBMlwUt34IXB2ZUQko4SUdLUVVQSE5BRU1UOTQ1WFRLV0JXRiQlQCN0PWcu'
                                target='_blank'
                                rel='noopener noreferrer'
                                className='inline-flex items-center gap-2'
                            >
                                <MessageCircle className='h-4 w-4' />
                                Give Feedback
                            </a>
                        </Button>

                        <Toaster />
                    </FilterProvider>
                </TooltipProvider>
            </body>
            <GoogleAnalytics gaId='G-HYTYJM0JGC' />
        </html>
    )
}
