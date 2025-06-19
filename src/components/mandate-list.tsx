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
  return (
    <div className="flex flex-wrap gap-1">
      {entities
        .filter(entity => entity !== null)
        .map(entity => (
          <Badge key={entity} variant="secondary">
            <EntityName entityName={entity} />
          </Badge>
      ))}
    </div>
  );
};

export function MandateList({ mandates, onMandateClick }: MandateListProps) {
  const maxEntities = mandates.length > 0 ? Math.max(...mandates.map(m => m.num_entities), 0) : 0;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {mandates.map((mandate, index) => {
          const titleParts = mandate.title ? mandate.title.split(': ') : ['Untitled Mandate'];
          const mainTitle = titleParts[0];
          const subTitle = titleParts.length > 1 ? titleParts.slice(1).join(': ') : null;
          
          return (
          <Tooltip key={mandate.document_symbol} delayDuration={100}>
            <TooltipTrigger asChild>
              <motion.div
                className="p-4 border rounded-lg shadow-sm bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => onMandateClick(mandate)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-grow">
                    {/* Line 1: Priority Area and Symbol */}
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm text-muted-foreground font-mono truncate">{mandate.full_document_symbol || mandate.document_symbol}</p>
                    </div>

                    {/* Line 2: Title */}
                    <div className="mb-1">
                      {mandate.highlightedTitle ? (
                        <h3 
                          className="text-base font-semibold max-w-5xl" 
                          dangerouslySetInnerHTML={{ __html: mandate.highlightedTitle }}
                        />
                      ) : (
                        <h3 className="text-base font-semibold max-w-5xl">{mainTitle}</h3>
                      )}
                      {subTitle && <h4 className="text-base text-muted-foreground max-w-5xl">{subTitle}</h4>}
                    </div>
                    
                    {mandate.match_details && mandate.match_details.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1 mb-2">
                        Match in: {mandate.match_details.join(', ')}
                      </div>
                    )}

                    {/* Line 3: Citations */}
                    <div className="w-full md:w-2/3">
                       <div className="text-sm font-medium mb-2">Cited {mandate.num_citations} times by {mandate.num_entities} entities</div>
                       <EntityBadges entities={mandate.entities} />
                    </div>
                  </div>

                  {/* Details Button on the right */}
                  <div className="flex-shrink-0">
                     <Button size="sm" className="bg-gray-700 text-white hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-700">
                        Details
                     </Button>
                  </div>
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Click for more details</p>
            </TooltipContent>
          </Tooltip>
        )})}
      </div>
    </TooltipProvider>
  );
}