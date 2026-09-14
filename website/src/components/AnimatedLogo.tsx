'use client'

import { AnimatedCornerLogo } from '@un-eosg/ui/components/animated-corner-logo'
import { usePathname } from 'next/navigation'

export function AnimatedLogo() {
  const pathname = usePathname()
  if (pathname !== '/secretariat') return null
  return (
    <AnimatedCornerLogo
      label="Visit UN 2.0 Network"
      newTabLabel="opens in new tab"
    />
  )
}
