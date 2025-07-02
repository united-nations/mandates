'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { EntityListSidebar } from '@/components/entity-list-sidebar'
import { OrganListSidebar } from '@/components/organ-list-sidebar'
import { Building, Landmark } from 'lucide-react'

export function CollapsibleSidebars() {
  return (
    <div className="lg:hidden mb-6 border rounded-lg">
      <Accordion type="multiple" className="w-full">
        <AccordionItem value="entities" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-un-blue" />
              <span className="font-semibold">UN Entities</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <EntityListSidebar hideHeader={true} borderless={true} />
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="organs" className="border-b-0">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-un-blue" />
              <span className="font-semibold">UN Organs</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <OrganListSidebar hideHeader={true} borderless={true} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  )
} 