'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Organ } from '@/types'

interface OrganNameProps {
  organName: string
  allOrgans: Organ[]
  showUnderline?: boolean
  asChild?: boolean
}

export function OrganName({ 
  organName, 
  allOrgans, 
  showUnderline = true, 
  asChild = false 
}: OrganNameProps) {
  const organData = allOrgans.find(organ => organ.short === organName || organ.long === organName)
  const displayName = organData?.short || organName
  const longName = organData?.long || organName

  if (displayName === longName) {
    return <>{displayName}</>
  }

  // If used inside interactive elements, don't render tooltip trigger
  if (asChild) {
    return (
      <span className={showUnderline ? "underline decoration-dotted" : ""} title={longName}>
        {displayName}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger className={showUnderline ? "underline decoration-dotted cursor-help" : "cursor-help"}>
        {displayName}
      </TooltipTrigger>
      <TooltipContent>
        <p>{longName}</p>
      </TooltipContent>
    </Tooltip>
  )
} 