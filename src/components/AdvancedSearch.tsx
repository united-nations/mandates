'use client'

import { SearchableDropdown } from './SearchableDropdown'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'
import { HelpCircle, Calendar, Target, Receipt, BookOpen } from 'lucide-react'
import { YearSlider } from './YearSlider'
import { explainerTexts } from '@/lib/explainer-texts'
import { titleCase } from 'title-case'
import { useState, useEffect } from 'react'
import { getBudgetDocumentOptions } from '@/lib/budget-documents'

interface AdvancedSearchProps {
  programme: string
  subject: string
  budgetDocument: string
  programmeOptions: { value: string; count: number }[]
  subjectOptions: { value: string; count: number }[]
  yearRange: { min: number; max: number } | null
  yearDistribution: { [year: string]: number }
  originalYearDistribution?: { [year: string]: number }
  selectedYearRange: [number, number] | null
  onProgrammeChange: (value: string) => void
  onSubjectChange: (value: string) => void
  onBudgetDocumentChange: (value: string) => void
  onYearRangeChange: (value: [number, number]) => void
}

export function AdvancedSearch({
  programme,
  subject,
  budgetDocument,
  programmeOptions,
  subjectOptions,
  yearRange,
  yearDistribution,
  originalYearDistribution,
  selectedYearRange,
  onProgrammeChange,
  onSubjectChange,
  onBudgetDocumentChange,
  onYearRangeChange,
}: AdvancedSearchProps) {
  const [openTooltip, setOpenTooltip] = useState<string | null>(null)

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.tooltip-container')) {
        setOpenTooltip(null)
      }
    }

    if (openTooltip) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openTooltip])

  const programmeDropdownOptions = programmeOptions.map((p) => ({
    value: p.value,
    label: `${titleCase(p.value)} (${p.count})`,
    disabled: p.count === 0,
  }))

  const subjectDropdownOptions = subjectOptions.map((s) => ({
    value: s.value,
    label: `${titleCase(s.value)} (${s.count})`,
    disabled: s.count === 0,
  }))

  const toggleTooltip = (tooltipId: string) => {
    setOpenTooltip(openTooltip === tooltipId ? null : tooltipId)
  }

  const TooltipButton = ({
    tooltipId,
    ariaLabel,
    tooltipText,
  }: {
    tooltipId: string
    ariaLabel: string
    tooltipText: string
  }) => (
    <div className="tooltip-container relative">
      <button
        type="button"
        className="-ml-1 cursor-help touch-manipulation rounded-sm border-0 bg-transparent p-0 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-hidden"
        aria-label={ariaLabel}
        onClick={() => toggleTooltip(tooltipId)}
      >
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </button>
      {openTooltip === tooltipId && (
        <div className="absolute top-6 right-0 z-50 w-64 rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-md">
          <p>{tooltipText}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Row 1: UN Subjects, Programme, Budget Document */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-slate-700">
                {explainerTexts.advancedFilters.subjects.label}
              </Label>
              <BookOpen className="h-4 w-4 text-slate-500" />
            </div>
            <TooltipButton
              tooltipId="subjects"
              ariaLabel="More information about UN subjects filter"
              tooltipText={explainerTexts.advancedFilters.subjects.tooltip}
            />
          </div>
          <SearchableDropdown
            options={subjectDropdownOptions}
            value={subject}
            onChange={onSubjectChange}
            placeholder={explainerTexts.advancedFilters.subjects.placeholder}
            searchPlaceholder={
              explainerTexts.advancedFilters.subjects.searchPlaceholder
            }
            emptyPlaceholder={
              explainerTexts.advancedFilters.subjects.emptyPlaceholder
            }
            className="h-11 border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-slate-700">
                {explainerTexts.advancedFilters.programme.label}
              </Label>
              <Target className="h-4 w-4 text-slate-500" />
            </div>
            <TooltipButton
              tooltipId="programme"
              ariaLabel="More information about programme filter"
              tooltipText={explainerTexts.advancedFilters.programme.tooltip}
            />
          </div>
          <SearchableDropdown
            options={programmeDropdownOptions}
            value={programme}
            onChange={onProgrammeChange}
            placeholder={explainerTexts.advancedFilters.programme.placeholder}
            searchPlaceholder={
              explainerTexts.advancedFilters.programme.searchPlaceholder
            }
            emptyPlaceholder={
              explainerTexts.advancedFilters.programme.emptyPlaceholder
            }
            className="h-11 border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="budget-document"
                className="text-sm font-semibold text-slate-700"
              >
                {explainerTexts.advancedFilters.budgetDocument.label}
              </Label>
              <Receipt className="h-4 w-4 text-slate-500" />
            </div>
            <TooltipButton
              tooltipId="budgetDocument"
              ariaLabel="More information about budget document filter"
              tooltipText={
                explainerTexts.advancedFilters.budgetDocument.tooltip
              }
            />
          </div>
          <Select value={budgetDocument} onValueChange={onBudgetDocumentChange}>
            <SelectTrigger
              id="budget-document"
              className="h-11 border-slate-300 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <SelectValue
                placeholder={
                  explainerTexts.advancedFilters.budgetDocument.placeholder
                }
                className="text-left"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Budget Documents</SelectItem>
              <SelectSeparator />
              {getBudgetDocumentOptions().map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Row 2: Year Range */}
      {yearRange && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-semibold text-slate-700">
                {explainerTexts.advancedFilters.yearRange.label}
              </Label>
              <Calendar className="h-4 w-4 text-slate-500" />
            </div>
            <TooltipButton
              tooltipId="yearRange"
              ariaLabel="More information about year range filter"
              tooltipText={explainerTexts.advancedFilters.yearRange.tooltip}
            />
          </div>
          <div className="p-4">
            <YearSlider
              yearDistribution={yearDistribution}
              yearRange={yearRange}
              value={selectedYearRange || [yearRange.min, yearRange.max]}
              onChange={onYearRangeChange}
              originalYearDistribution={originalYearDistribution}
            />
          </div>
        </div>
      )}
    </div>
  )
}
