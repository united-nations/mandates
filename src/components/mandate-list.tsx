'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EntityName } from './ui/entity-name';
import { FileText, Calendar, Building, Target } from 'lucide-react';

const priorityAreaColors: { [key: string]: string } = {
  'Maintenance of international peace and security': 'bg-blue-500',
  'Promotion of sustained economic growth and sustainable development': 'bg-green-500',
  'Development of Africa': 'bg-yellow-500',
  'Promotion and protection of human rights': 'bg-red-500',
  'Effective coordination of humanitarian assistance efforts': 'bg-purple-500',
  'Justice and international law': 'bg-indigo-500',
  'Disarmament': 'bg-pink-500',
  // Add more if there are others, or a default
  'default': 'bg-gray-500',
};

const getPriorityAreaColor = (area: string) => {
  return priorityAreaColors[area] || priorityAreaColors.default;
}

interface MandateListProps {
  mandates: Mandate[];
  onMandateClick: (mandate: Mandate) => void;
}

const EntityBadges = ({ entities }: { entities: string[] }) => {
  const validEntities = entities.filter(entity => entity !== null);

  if (validEntities.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {validEntities.map(entity => (
          <Badge key={entity} variant="secondary" className="font-normal">
            <EntityName entityName={entity} showUnderline={false} />
          </Badge>
      ))}
    </div>
  );
};

// Component to safely render HTML content with highlighting
const HighlightedContent = ({ content, fallback }: { content?: string; fallback: string }) => {
  if (content && content !== fallback) {
    return (
      <span dangerouslySetInnerHTML={{ __html: content }} />
    );
  }
  return <span>{fallback}</span>;
};

export function MandateList({ mandates, onMandateClick }: MandateListProps) {
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {mandates.map((mandate, index) => {
          const hasSearchMatches = mandate.match_details && mandate.match_details.length > 0;
          const searchScore = mandate.searchScore || 0;
          
          return (
            <motion.div
              key={mandate.document_symbol}
              className={`relative p-4 border rounded-lg shadow-sm bg-card hover:bg-muted/50 transition-colors cursor-pointer ${
                hasSearchMatches ? 'ring-2 ring-primary/20 bg-accent/5' : ''
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => onMandateClick(mandate)}
            >
              <div className="flex flex-col gap-3">
                {/* Details button - positioned absolute */}
                <Button size="sm" variant="outline" className="absolute top-3 right-3 shrink-0 text-xs px-2 py-1 h-7">
                  Details
                </Button>

                <div className="pr-16">
                  <h3 className="text-base font-semibold leading-tight">
                    <HighlightedContent 
                      content={mandate.highlightedTitle || mandate.highlightedFields?.title} 
                      fallback={mandate.title || 'Untitled'} 
                    />
                  </h3>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    <span className="font-medium">{mandate.document_symbol}</span>
                  </div>
                  {mandate.body && (
                    <div className="flex items-center gap-1.5">
                      <Building className="h-3 w-3" />
                      <span className="font-medium">{mandate.body}</span>
                    </div>
                  )}
                   
                  {mandate.year && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      <span className="font-medium">{mandate.year}</span>
                    </div>
                  )}

                  {/* Show search score for debugging/information */}
                  {searchScore > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1.5">
                          <Target className="h-3 w-3" />
                          <span className="font-medium">{Math.round(searchScore * 100)}% match</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Search relevance score</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                
                {/* Match details and highlighted content */}
                {hasSearchMatches && (
                  <div className="text-xs space-y-2">
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="font-medium text-muted-foreground">Matches found in:</span>
                      {mandate.match_details!.map((detail, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {detail}
                        </Badge>
                      ))}
                    </div>
                    
                    {/* Show highlighted snippets from other fields */}
                    {mandate.highlightedFields && Object.entries(mandate.highlightedFields).map(([field, content]) => {
                      if (field === 'title') return null; // Already shown in title
                      
                      // Ensure content is a string
                      const contentStr = typeof content === 'string' ? content : '';
                      
                      // For AI summary, show the full content; for others, truncate if too long
                      const shouldTruncate = field !== 'ai_summary' && contentStr.length > 200;
                      const displayContent = shouldTruncate 
                        ? contentStr.substring(0, 200) + '...' 
                        : contentStr;
                      
                      // Create better field names for display
                      const getFieldDisplayName = (fieldName: string) => {
                        const displayNames: { [key: string]: string } = {
                          'ai_summary': 'Summary',
                          'subject_headings': 'Subject Headings',
                          'abstract': 'Abstract',
                          'issuing_body': 'Issuing Body',
                          'entities': 'Entities',
                          'priority_area': 'Priority Area',
                          'pillar': 'Pillar',
                          'programme_titles': 'Programme Titles',
                          'section_titles': 'Section Titles',
                          'descriptions': 'Descriptions',
                          'operative_paragraphs': 'Operative Paragraphs',
                          'note': 'Notes',
                          'subtitle': 'Subtitle',
                          'uniform_title': 'Uniform Title',
                          'translated_title': 'Translated Title'
                        };
                        return displayNames[fieldName] || fieldName.replace('_', ' ');
                      };
                      
                      return (
                        <div key={field} className={`text-sm ${field === 'ai_summary' ? 'bg-accent/20 p-3 rounded-md border' : ''}`}>
                          <span className="font-medium text-muted-foreground">{getFieldDisplayName(field)}:</span>{' '}
                          <span 
                            dangerouslySetInnerHTML={{ __html: displayContent }}
                            className={field === 'ai_summary' ? 'block mt-1 text-foreground' : ''}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Citations and Entities */}
                {(mandate.num_citations > 0 || (mandate.entities && mandate.entities.length > 0)) && (
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs font-medium mb-2 text-muted-foreground">
                      Cited {mandate.num_citations} time{mandate.num_citations !== 1 ? 's' : ''} by {mandate.num_entities} entit{mandate.num_entities !== 1 ? 'ies' : 'y'}
                    </p>
                    <EntityBadges entities={mandate.entities || []} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}