'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

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
          <Badge key={entity} variant="secondary">{entity}</Badge>
      ))}
    </div>
  );
};

export function MandateList({ mandates, onMandateClick }: MandateListProps) {
  const maxEntities = mandates.length > 0 ? Math.max(...mandates.map(m => m.num_entities), 0) : 0;

  return (
    <div className="space-y-4">
      {mandates.map((mandate, index) => {
        const titleParts = mandate.title ? mandate.title.split(': ') : ['Untitled Mandate'];
        const mainTitle = titleParts[0];
        const subTitle = titleParts.length > 1 ? titleParts.slice(1).join(': ') : null;
        
        return (
        <motion.div
          key={mandate.symbol}
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
                <p className="text-sm text-muted-foreground font-mono truncate">{mandate.full_document_symbol || mandate.symbol}</p>
              </div>

              {/* Line 2: Title */}
              <h3 className="text-base font-semibold">{mainTitle}</h3>
              {subTitle && <h4 className="text-base text-muted-foreground mb-3">{subTitle}</h4>}
              
              {/* Line 3: Citations */}
              <div className="w-full md:w-2/3">
                 <div className="text-sm font-medium mb-2">Cited by {mandate.num_citations}x by {mandate.num_entities} entities</div>
                 <EntityBadges entities={mandate.entities} />
              </div>
            </div>

            {/* Details Button on the right */}
            <div className="flex-shrink-0">
               <Button variant="outline" size="sm">
                  Details
               </Button>
            </div>
          </div>
        </motion.div>
      )})}
    </div>
  );
} 