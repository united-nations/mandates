'use client'

import { useState, useEffect } from 'react'
import { Landmark } from 'lucide-react'
import { MandateExplorer } from '@/components/mandate-explorer'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ConsolidatedFilterSidebar } from './consolidated-filter-sidebar'

interface Organ {
  short: string
  long: string
}

interface OrganOverlayContentProps {
  organName: string
}

export function OrganOverlayContent({ organName }: OrganOverlayContentProps) {
  const [organLongName, setOrganLongName] = useState<string>('')
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null)
  const [selectedOrgan, setSelectedOrgan] = useState<string | null>(null)

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

  // When a filter is selected, update the MandateExplorer props
  const effectiveEntity = selectedEntity || undefined
  const effectiveOrgan = selectedOrgan || organName

  return (
    <TooltipProvider>
      <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto py-6 space-y-6 px-8 sm:px-12 lg:px-16">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
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
            {/* Data cards could go here if needed */}
            {/* MandateExplorer with integrated cross-citations sidebar */}
            <MandateExplorer 
              presetEntity={effectiveEntity}
              presetOrgan={effectiveOrgan}
              showEntityCard={false}
              mandateListTitle={`Documents Issued by ${organLongName || organName}`}
              crossCitationsSidebar={
                <div className="w-full lg:w-80 flex-shrink-0 border-l-2 border-un-blue/20 pl-4" />
              }
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
} 