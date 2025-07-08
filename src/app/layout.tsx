import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { explainerTexts } from '@/lib/explainer-texts'
import { GoogleAnalytics } from '@next/third-parties/google'
import { FilterProvider } from '@/contexts/FilterContext'
import { Menu, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import Clarity from '@microsoft/clarity'
import { useEffect } from 'react'

export const metadata: Metadata = {
  title: explainerTexts.pageMetadata.title,
  description: explainerTexts.pageMetadata.description
}

export default function RootLayout ({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  // Initialize Microsoft Clarity
  useEffect(() => {
    Clarity.init('s4kksugeb9')
  }, [])
  return (
    <html lang='en'>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link
          rel='preconnect'
          href='https://fonts.gstatic.com'
          crossOrigin='anonymous'
        />
        <link
          href='https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap'
          rel='stylesheet'
        />
      </head>
      {/* Updated body to use font-sans from Tailwind config (which is now Roboto) */}
      <body className='font-sans antialiased'>
        <FilterProvider>
          <header className='w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-6 pb-2 flex items-start justify-between'>
            <div className='flex-1'>
              <div className='flex items-center gap-x-2 mb-2'>
                <Link
                  href='/'
                  className='text-4xl font-bold tracking-tight text-foreground hover:text-un-blue transition-colors'
                >
                  {explainerTexts.mainHeader.title}
                </Link>
                <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200'>
                  {explainerTexts.mainHeader.versionTag}
                </span>
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
                  <DropdownMenuItem asChild>
                    <Link href='/'>Mandate Source Registry</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/methodology'>Methodology</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href='/resources'>More Resources</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {children}

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
      </body>
      <GoogleAnalytics gaId='G-HYTYJM0JGC' />
    </html>
  )
}
