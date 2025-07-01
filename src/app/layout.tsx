import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { explainerTexts } from '@/lib/explainer-texts';
import { GoogleAnalytics } from '@next/third-parties/google';
import { FilterProvider } from '@/contexts/FilterContext';

export const metadata: Metadata = {
  title: explainerTexts.pageMetadata.title,
  description: explainerTexts.pageMetadata.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      {/* Updated body to use font-sans from Tailwind config (which is now Roboto) */}
      <body className="font-sans antialiased">
        <FilterProvider>
          {children}
          <Toaster />
        </FilterProvider>
      </body>
      <GoogleAnalytics gaId="G-HYTYJM0JGC" />
    </html>
  );
}



