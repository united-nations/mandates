'use client'

import { Share, Check } from 'lucide-react'
import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

export function ShareButton() {
  const [showCopied, setShowCopied] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setShowCopied(true)
      setTimeout(() => setShowCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  return (
    <div className="relative">
      {showCopied && (
        <div className="absolute top-1/2 right-full mr-2 -translate-y-1/2 animate-in rounded-md bg-gray-200 px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 duration-200 fade-in slide-in-from-right-2">
          Copied!
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={buttonRef}
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
          <p className="text-sm">Copy link to current page</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
}
