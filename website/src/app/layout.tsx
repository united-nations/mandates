import { RootLayoutClient } from '@/components/RootLayoutClient'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Roboto } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

// https://fonts.google.com/specimen/Roboto
// https://nextjs.org/docs/app/getting-started/fonts
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ['100', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode
  modal: React.ReactNode
}>) {
  return (
    <html lang="en" className={roboto.className}>
      <GoogleAnalytics gaId="G-HYTYJM0JGC" />
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <RootLayoutClient>
          {children}
          {modal}
        </RootLayoutClient>
        <Script
          id="umami"
          src="https://cloud.umami.is/script.js"
          strategy="afterInteractive"
          data-website-id="f8deadc3-00b3-4418-b1aa-ce4fbf56525d"
          data-domains="mandates.un.org"
          data-exclude-search="true"
          data-exclude-hash="true"
        />
      </body>
    </html>
  )
}
