'use client'

import { useState } from 'react'
import { Share, Check } from 'lucide-react'
import { Button } from './button'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

export function ShareButton() {
    const [copied, setCopied] = useState(false)

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            console.error('Failed to copy link:', error)
        }
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className={`h-9 w-9 transition-colors ${
                        copied 
                            ? 'bg-un-blue text-white hover:bg-un-blue' 
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    }`}
                    aria-label="Share current page"
                >
                    {copied ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <Share className="h-4 w-4" />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
                <p className="text-sm">
                    {copied ? 'Link copied!' : 'Copy link to current page'}
                </p>
            </TooltipContent>
        </Tooltip>
    )
}