'use client'

import type { ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FilterTargetContext } from '@/contexts/FilterTargetContext'
import { explainerTexts } from '@/lib/en_text_contents'

const text = explainerTexts.analyticsTabs

interface AnalyticsTabsProps {
  overTime: ReactNode
  relationships: ReactNode
  topics: ReactNode
  llmAnalysis: ReactNode
}

/**
 * Tab shell for the analytics charts. Wraps them in a FilterTargetContext
 * pointed at /secretariat, so a click on any chart item (topic pill, entity
 * pair, organ×entity cell) navigates to the main table filtered, rather than
 * mutating this page's URL.
 */
export function AnalyticsTabs({
  overTime,
  relationships,
  topics,
  llmAnalysis,
}: AnalyticsTabsProps) {
  return (
    <FilterTargetContext.Provider value="/secretariat">
      <Tabs defaultValue="over-time" className="w-full">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="over-time">{text.overTime}</TabsTrigger>
          <TabsTrigger value="relationships">{text.relationships}</TabsTrigger>
          <TabsTrigger value="topics">{text.topics}</TabsTrigger>
          <TabsTrigger value="llm-analysis">Mandate tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="over-time" className="mt-6 space-y-4">
          {overTime}
        </TabsContent>
        <TabsContent value="relationships" className="mt-6 space-y-4">
          {relationships}
        </TabsContent>
        <TabsContent value="llm-analysis" className="mt-6 space-y-4">
          {llmAnalysis}
        </TabsContent>
        <TabsContent value="topics" className="mt-6 space-y-4">
          {topics}
        </TabsContent>
      </Tabs>
    </FilterTargetContext.Provider>
  )
}
