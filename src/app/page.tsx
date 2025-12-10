import { Suspense } from 'react'

import { ExplainerText } from '@/components/ExplainerText'
import { MandateExplorer } from '@/components/MandateExplorer'

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <div className="space-y-6 pb-16">
        {/* Header with context info */}
        <ExplainerText />

        {/* Mandate Explorer - now renders sidebars internally */}
        <MandateExplorer pageType="main" />
      </div>
    </Suspense>
  )
}
