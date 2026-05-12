'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BackButtonProps {
  label?: string
  className?: string
}

export function BackButton({
  label = 'Go Back',
  className = '',
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      router.push('/')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className={`mb-4 inline-flex h-auto shrink-0 items-center gap-1 bg-trout! px-2 py-1 text-xs text-white! transition-colors hover:bg-trout/90! sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-sm ${className}`}
      onClick={handleClick}
    >
      <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
      {label}
    </Button>
  )
}
