import { RootLayoutClient } from '@/components/RootLayoutClient'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Roboto } from 'next/font/google'
import './globals.css'

// https://fonts.google.com/specimen/Roboto
// https://nextjs.org/docs/app/getting-started/fonts
// 100 (Thin), 300 (Light), 400 (Regular), 500 (Medium), 700 (Bold), 800 (ExtraBold), 900 (Black)
const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '800', '900'],
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
      <body className="min-h-screen bg-background text-foreground">
        <RootLayoutClient>
          {children}
          {modal}
        </RootLayoutClient>
      </body>
    </html>
  )
}
