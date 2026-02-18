'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { MetadataItem } from '@/components/MetadataItem'
import type { Mandate } from '@/types'
import type { BudgetDocument } from '@/lib/data/budget-documents'

interface MandateMetadataProps {
  mandate: Mandate
  budgetDocuments: BudgetDocument[]
}

export function MandateMetadata({
  mandate,
  budgetDocuments,
}: MandateMetadataProps) {
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const SUBJECTS_DEFAULT_SHOWN = 20

  // Derive the matching BudgetDocument entries for this mandate's citations
  const citedBudgetDocuments = useMemo(() => {
    if (!mandate?.citation_info) return []
    const uniqueOrigins = new Set<string>()
    mandate.citation_info.forEach((citation) => {
      if (citation.origin_document) uniqueOrigins.add(citation.origin_document)
    })
    // Match each origin_document value to a BudgetDocument via its regex
    const matched = new Map<string, { slug: string; display_name: string }>()
    for (const origin of uniqueOrigins) {
      for (const doc of budgetDocuments) {
        if (new RegExp(doc.match_pattern).test(origin)) {
          matched.set(doc.slug, doc)
          break
        }
      }
    }
    return Array.from(matched.values())
  }, [mandate, budgetDocuments])

  return (
    <div className="space-y-0 rounded-lg">
      <MetadataItem label="Organ">
        {mandate.body ? (
          <Badge
            variant="secondary"
            className="cursor-pointer text-xs transition-colors hover:bg-secondary/80"
            onClick={() => {
              // Navigate to organ detail page
              window.location.href = `/organ/${encodeURIComponent(mandate.body)}`
            }}
          >
            {mandate.body}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </MetadataItem>

      <MetadataItem label="Document Type">
        {mandate.type ? (
          <Badge variant="secondary" className="text-xs">
            {mandate.type}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </MetadataItem>

      <MetadataItem label="Year">
        {mandate.year ? (
          <Badge variant="secondary" className="text-xs">
            {mandate.year}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </MetadataItem>

      <MetadataItem label="Budget Document">
        {citedBudgetDocuments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {citedBudgetDocuments.map((doc, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer text-xs transition-colors hover:bg-secondary/80"
                onClick={() => {
                  const url = new URL(window.location.origin + '/')
                  url.searchParams.set('page', '1')
                  url.searchParams.set('budget_document', doc.slug)
                  window.location.href = url.toString()
                }}
              >
                {doc.display_name}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </MetadataItem>

      {mandate.subject_headings && mandate.subject_headings.length > 0 && (
        <MetadataItem
          label={
            <a
              href="https://metadata.un.org/thesaurus/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              UN Library Subjects
            </a>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {(showAllSubjects ||
            mandate.subject_headings.length <= SUBJECTS_DEFAULT_SHOWN
              ? mandate.subject_headings
                  .slice()
                  .sort((a, b) => a.localeCompare(b))
              : mandate.subject_headings
                  .slice()
                  .sort((a, b) => a.localeCompare(b))
                  .slice(0, SUBJECTS_DEFAULT_SHOWN)
            ).map((heading, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer border-un-blue! text-xs font-normal transition-colors hover:bg-un-blue/10"
                onClick={() => {
                  // Navigate to filtered results with only the subject filter
                  const url = new URL(window.location.origin + '/')
                  url.searchParams.set('page', '1')
                  url.searchParams.set('subject', heading.trim())
                  window.location.href = url.toString()
                }}
              >
                {heading}
              </Badge>
            ))}
            {mandate.subject_headings.length > SUBJECTS_DEFAULT_SHOWN && (
              <button
                type="button"
                className="ml-1 text-sm text-un-blue hover:text-un-blue/80"
                onClick={() => setShowAllSubjects(!showAllSubjects)}
              >
                {showAllSubjects
                  ? 'Show less'
                  : `Show ${mandate.subject_headings.length - SUBJECTS_DEFAULT_SHOWN} more`}
              </button>
            )}
          </div>
        </MetadataItem>
      )}
    </div>
  )
}
