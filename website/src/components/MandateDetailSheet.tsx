'use client'

import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { ReactNode } from 'react'

interface MandateDetailSheetProps {
  title: string
  children: ReactNode
}

export function MandateDetailSheet({
  title,
  children,
}: MandateDetailSheetProps) {
  const router = useRouter()

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.back()
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl p-0"
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <ScrollArea className="h-full p-6">{children}</ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
