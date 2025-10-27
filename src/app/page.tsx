'use client'

import { Suspense } from 'react'

import { MandateExplorer } from '@/components/mandate-explorer'
import { explainerTexts } from '@/lib/explainer-texts'
import Link from 'next/link'


export default function Page () {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <div className='space-y-6 pb-16'>
        {/* Header with context info */}
        <div className='text-muted-foreground mt-4 sm:text-justify max-w-[792px] text-left'>
          <p className='leading-tight mb-0'>
            Developed as part of the{' '}
            <Link
              href={explainerTexts.mainHeader.un80Link}
              target='_blank'
              rel='noopener noreferrer'
              className='text-un-blue hover:text-shuttle-gray transition-colors'
            >
              UN80 Initiative
            </Link>
            , this registry serves as a transparency tool for understanding UN mandates and programmes. It compiles the source documents that UN entities cite when explaining why their programmes exist and why they require resources, enabling better dialogue on{' '}
            <Link
              href={explainerTexts.mainHeader.mandateImplementationLink}
              target='_blank'
              rel='noopener noreferrer'
              className='text-un-blue hover:text-shuttle-gray transition-colors'
            >
              mandate implementation
            </Link>
            .
            {' '}<br />
            <Link
              href='/methodology'
              className='font-bold text-un-blue hover:text-shuttle-gray text-sm inline transition-colors underline'
            >
              Learn More
            </Link>
          </p>
        </div>

        {/* Mandate Explorer - now renders sidebars internally */}
        <MandateExplorer pageType='main' />
      </div>
    </Suspense>
  )
}
