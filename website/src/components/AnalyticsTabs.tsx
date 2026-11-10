'use client'

import type { ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = [
    'breakdown',
    'relationships',
    'topics',
    'mandate-tasks',
  ].includes(requestedTab ?? '')
    ? requestedTab!
    : 'breakdown'

  const selectTab = (value: string) => {
    // Pointer activation may fire both mousedown and focus before React renders.
    // Read the live URL so one selection adds exactly one history entry.
    const next = new URLSearchParams(window.location.search)
    if (next.get('tab') === value) return
    next.set('tab', value)
    // Next's native-history integration updates tab state without requerying charts.
    window.history.pushState(
      null,
      '',
      `${pathname}?${next}${window.location.hash}`
    )
  }

  return (
    <FilterTargetContext.Provider value="/secretariat">
      <Tabs value={tab} onValueChange={selectTab} className="w-full">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="breakdown">{text.overTime}</TabsTrigger>
          <TabsTrigger value="relationships">{text.relationships}</TabsTrigger>
          <TabsTrigger value="topics">{text.topics}</TabsTrigger>
          <TabsTrigger value="mandate-tasks">Mandate tasks</TabsTrigger>
        </TabsList>
        <TabsContent value="breakdown" className="mt-6 space-y-4">
          {overTime}
        </TabsContent>
        <TabsContent value="relationships" className="mt-6 space-y-4">
          {relationships}
        </TabsContent>
        <TabsContent value="mandate-tasks" className="mt-6 space-y-4">
          {llmAnalysis}
        </TabsContent>
        <TabsContent value="topics" className="mt-6 space-y-4">
          {topics}
        </TabsContent>
      </Tabs>
    </FilterTargetContext.Provider>
  )
}
