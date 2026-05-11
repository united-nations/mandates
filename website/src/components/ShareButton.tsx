'use client'

import { Share, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function ShareButton() {
  const [showCopied, setShowCopied] = useState(false)
  const [disableTooltip, setDisableTooltip] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => {
        setShowCopied(false)
        setDisableTooltip(true)
        setTimeout(() => setDisableTooltip(false), 500)
      }, 3000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <Tooltip
      open={showCopied ? true : disableTooltip ? false : undefined}
      delayDuration={700}
    >
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          onClick={handleShare}
          className="flex h-8 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-2 text-gray-500 transition-colors hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue sm:px-3"
          aria-label="Share current page"
        >
          {showCopied ? (
            <Check className="h-3 w-3 text-un-blue sm:h-4 sm:w-4" />
          ) : (
            <Share className="h-3 w-3 sm:h-4 sm:w-4" />
          )}
          <span className="hidden text-sm sm:inline">Share</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-sm">
          {showCopied ? 'Copied!' : 'Copy link to current page'}
        </p>
      </TooltipContent>
    </Tooltip>
  )
}
