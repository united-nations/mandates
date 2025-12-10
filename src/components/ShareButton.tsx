"use client";

import { Share, Check } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function ShareButton() {
  const [showCopied, setShowCopied] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  return (
    <div className="relative">
      {showCopied && (
        <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-200">
          Copied!
        </div>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={buttonRef}
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
            <span className="hidden sm:inline text-sm">Share</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">Copy link to current page</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
