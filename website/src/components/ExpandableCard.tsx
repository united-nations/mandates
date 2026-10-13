'use client'

import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface ExpandableCardProps {
  id?: string
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  variant?: 'default' | 'filled'
}

export function ExpandableCard({
  id,
  title,
  children,
  defaultOpen = false,
  variant = 'default',
}: ExpandableCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Open the card when navigating to it via hash link (e.g. /secretariat#methodology)
  useEffect(() => {
    if (id && typeof window !== 'undefined') {
      const handleHashChange = () => {
        if (window.location.hash === `#${id}`) {
          setIsOpen(true)
          setTimeout(() => {
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }
      }

      handleHashChange()
      window.addEventListener('hashchange', handleHashChange)
      return () => window.removeEventListener('hashchange', handleHashChange)
    }
  }, [id])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        id={id}
        className={`flex w-full scroll-mt-20 items-center justify-between py-4 text-left transition-colors ${
          variant === 'filled'
            ? 'bg-muted px-4 hover:bg-secondary'
            : 'border-b border-border hover:bg-muted'
        }`}
      >
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="py-4 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
