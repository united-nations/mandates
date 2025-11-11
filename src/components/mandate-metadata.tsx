'use client'

import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { titleCase } from 'title-case'
import { getOriginDocumentDisplayName, getBudgetDocumentSlug } from '@/lib/budget-documents'
import { MetadataItem } from '@/components/ui/metadata-item'
import type { Mandate } from '@/types'

interface MandateMetadataProps {
  mandate: Mandate
}

export function MandateMetadata({ mandate }: MandateMetadataProps) {
  const [showAllSubjects, setShowAllSubjects] = useState(false)
  const SUBJECTS_DEFAULT_SHOWN = 20
  const budgetDocuments = useMemo(() => {
    if (!mandate || !mandate.citation_info) return []
    const uniqueDocs = new Set<string>()
    mandate.citation_info.forEach(citation => {
      if (citation.origin_document) {
        uniqueDocs.add(citation.origin_document)
      }
    })
    return Array.from(uniqueDocs)
  }, [mandate])

  return (
    <div className="space-y-0 rounded-lg">
      <MetadataItem label="Organ">
        {mandate.body ? (
          <Badge
            variant="stronger"
            className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
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
          <Badge variant="stronger" className="text-xs">
            {mandate.type}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </MetadataItem>
      
      <MetadataItem label="Year">
        {mandate.year ? (
          <Badge variant="stronger" className="text-xs">
            {mandate.year}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </MetadataItem>
      
      <MetadataItem label="Budget Document">
        {budgetDocuments.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {budgetDocuments.map((doc, index) => {
              const displayName = getOriginDocumentDisplayName(doc)
              const slug = getBudgetDocumentSlug(displayName)

              return (
                <Badge
                  key={index}
                  variant="stronger"
                  className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                  onClick={() => {
                    // Navigate to filtered results using the budget document slug
                    const url = new URL(window.location.origin + '/')
                    url.searchParams.set('page', '1')
                    url.searchParams.set('budget_document', slug)
                    window.location.href = url.toString()
                  }}
                >
                  {displayName}
                </Badge>
              )
            })}
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
            {(showAllSubjects || mandate.subject_headings.length <= SUBJECTS_DEFAULT_SHOWN
              ? mandate.subject_headings.slice().sort((a, b) => a.localeCompare(b))
              : mandate.subject_headings.slice().sort((a, b) => a.localeCompare(b)).slice(0, SUBJECTS_DEFAULT_SHOWN)
            ).map((heading, index) => (
              <Badge
                key={index}
                variant="outline"
                className="text-xs font-normal border-un-blue! cursor-pointer hover:bg-un-blue/10 transition-colors"
                onClick={() => {
                  // Navigate to filtered results with only the subject filter
                  const url = new URL(window.location.origin + '/')
                  url.searchParams.set('page', '1')
                  url.searchParams.set('subject', heading.trim())
                  window.location.href = url.toString()
                }}
              >
                {titleCase(heading.toLowerCase())}
              </Badge>
            ))}
            {mandate.subject_headings.length > SUBJECTS_DEFAULT_SHOWN && (
              <button
                type="button"
                className="text-sm text-un-blue hover:text-un-blue/80 ml-1"
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