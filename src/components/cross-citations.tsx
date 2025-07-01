'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityName } from '@/components/ui/entity-name';
import { Building, ArrowRight, Users } from 'lucide-react';
import Link from 'next/link';

interface CrossCitation {
  entity: string;
  sharedMandatesCount: number;
  totalMandatesCount: number;
}

interface CrossCitationsProps {
  currentEntity: string;
  className?: string;
  onEntityFilter?: (entity: string) => void;
}

export function CrossCitations({ currentEntity, className, onEntityFilter }: CrossCitationsProps) {
  const [crossCitations, setCrossCitations] = useState<CrossCitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(10);

  useEffect(() => {
    async function fetchCrossCitations() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/entities/${encodeURIComponent(currentEntity)}/cross-citations`);
        if (response.ok) {
          const data = await response.json();
          // Filter out null, undefined, or empty string entities
          const filteredData = data.filter((citation: CrossCitation) => 
            citation.entity && 
            citation.entity.trim() !== '' && 
            citation.entity !== 'null' &&
            citation.entity !== 'undefined'
          );
          setCrossCitations(filteredData);
        }
      } catch (error) {
        console.error('Failed to fetch cross-citations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (currentEntity) {
      fetchCrossCitations();
    }
  }, [currentEntity]);

  const displayedCitations = showAll ? crossCitations : crossCitations.slice(0, displayLimit);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Users className="h-5 w-5" />
            Cross-Citations
          </h3>
        </div>
        <div>
          <div className="space-y-3">
            {[...Array(displayLimit)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (crossCitations.length === 0) {
    return (
      <div className={className}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Users className="h-5 w-5" />
            Cross-Citations
          </h3>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            No other entities share cited mandates with this entity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
          <Users className="h-5 w-5" />
          Cross-Citations
        </h3>
        <p className="text-sm text-muted-foreground">
          Entities that share cited mandates with <EntityName entityName={currentEntity} />
          {onEntityFilter && (
            <span className="block mt-1 text-xs">
              Click entity name to filter for shared mandates or <ArrowRight className="h-3 w-3 inline mx-1" /> to visit entity page
            </span>
          )}
        </p>
      </div>
      <div>
        <div className="space-y-3">
          {displayedCitations.map((citation) => (
            <div
              key={citation.entity}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div 
                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                onClick={() => onEntityFilter && onEntityFilter(citation.entity)}
                title="Filter for shared mandates"
              >
                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <EntityName entityName={citation.entity} showUnderline={false} />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="secondary" className="font-mono text-xs">
                  {citation.sharedMandatesCount}
                </Badge>
                <Link href={`/entity/${encodeURIComponent(citation.entity)}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Go to entity page">
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
        
        {crossCitations.length > displayLimit && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show All ${crossCitations.length} Cross-Citations`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 