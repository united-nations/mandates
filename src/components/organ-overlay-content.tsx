'use client'

import { useState, useEffect } from 'react'
import { Landmark } from 'lucide-react'
import { MandateExplorer } from '@/components/mandate-explorer'
import { TooltipProvider } from '@/components/ui/tooltip'

interface Organ {
  short: string
  long: string
}

interface OrganOverlayContentProps {
  organName: string
}

export function OrganOverlayContent({ organName }: OrganOverlayContentProps) {
  const [organLongName, setOrganLongName] = useState<string>('')

  useEffect(() => {
    async function fetchOrganDetails() {
      try {
        const res = await fetch('/api/organs')
        if (res.ok) {
          const data = await res.json()
          const organ = data.find((o: Organ) => o.short === organName || o.long === organName)
          if (organ) {
            setOrganLongName(organ.long)
          }
        }
      } catch (error) {
        console.error("Failed to fetch organ details:", error)
      }
    }
    fetchOrganDetails()
  }, [organName])

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="pb-2">
          <div className="mb-6 mt-2">
            <div className="flex items-center gap-3 mb-2">
              <Landmark className="h-8 w-8 text-un-blue" />
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {organLongName || organName}
              </h1>
            </div>
            {organLongName && organLongName !== organName && (
              <div className="text-muted-foreground">
                <span className="font-mono text-sm bg-muted px-2 py-1 rounded">{organName}</span>
              </div>
            )}
          </div>
          
          <div className="text-muted-foreground mt-2 sm:text-justify">
            <p className="leading-tight mb-3">
              Exploring mandate documents issued by <strong>{organLongName || organName}</strong>. 
              This view shows all source documents issued by this organ/body, which establish mandates for UN entities.
            </p>
          </div>
        </div>

        {/* Mandate Explorer with preset organ filter */}
        <MandateExplorer 
          presetOrgan={organName}
          showEntityCard={false}
          mandateListTitle={`Documents Issued by ${organLongName || organName}`}
        />
      </div>
    </TooltipProvider>
  )
} 