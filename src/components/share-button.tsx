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
        <Tooltip open={showCopied ? true : disableTooltip ? false : undefined} delayDuration={700}>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    onClick={handleShare}
                    className="flex items-center justify-center gap-2 h-8 px-2 sm:px-3 rounded-md bg-white border border-gray-200 text-gray-500 hover:border-un-blue hover:text-un-blue hover:bg-un-blue/10 transition-colors"
                    aria-label="Share current page"
                >
                    {showCopied ? (
                        <Check className="h-3 w-3 sm:h-4 sm:w-4 text-un-blue" />
                    ) : (
                        <Share className="h-3 w-3 sm:h-4 sm:w-4" />
                    )}
                    <span className="hidden sm:inline text-sm">
                        Share
                    </span>
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
