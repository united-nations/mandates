'use client'

import type { ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterTargetContext } from '@/contexts/FilterTargetContext'

interface AnalyticsTabsProps {
  overTime: ReactNode
  relationships: ReactNode
}

/**
 * Two-tab shell for the analytics charts. Wraps them in a FilterTargetContext
 * pointed at /secretariat, so a click on any chart item (topic pill, entity
 * pair, organ×entity cell) navigates to the main table filtered, rather than
 * mutating this page's URL.
 */
export function AnalyticsTabs({ overTime, relationships }: AnalyticsTabsProps) {
  return (
    <FilterTargetContext.Provider value="/secretariat">
      <Tabs defaultValue="over-time" className="w-full">
        <TabsList>
          <TabsTrigger value="over-time">Over time</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
        </TabsList>
        <TabsContent value="over-time" className="mt-6 space-y-4">
          {overTime}
        </TabsContent>
        <TabsContent value="relationships" className="mt-6 space-y-4">
          {relationships}
        </TabsContent>
      </Tabs>
    </FilterTargetContext.Provider>
  )
}
