'use client'

import { Suspense } from 'react'

import { MandateExplorer } from '@/components/mandate-explorer'
import { explainerTexts } from '@/lib/explainer-texts'
import Link from 'next/link'
import { LoadingFallback } from '@/components/ui/loading-fallback'


export default function Page () {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <div className='space-y-6 pb-16'>
        {/* Header with context info */}
        <div className='text-muted-foreground mt-4 sm:text-justify max-w-[792px] text-left'>
          <p className='leading-tight mb-0'>
            {explainerTexts.mainHeader.shortDescription} <br />
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
        <MandateExplorer pageType='main' />
      </div>
    </Suspense>
  )
}
