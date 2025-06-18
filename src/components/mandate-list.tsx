'use client';

import { useState } from 'react';
import type { Mandate } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
}

const EntityBadges = ({ entities }: { entities: string[] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxVisible = 7;
  const visibleEntities = isExpanded ? entities : entities.slice(0, maxVisible);

  return (
    <div className="flex flex-wrap gap-1">
      {visibleEntities.map(entity => (
        <Badge key={entity} variant="secondary">{entity}</Badge>
      ))}
      {entities.length > maxVisible && (
        <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? 'Show less' : `+${entities.length - maxVisible} more`}
        </Button>
      )}
    </div>
  );
};

export function MandateList({ mandates }: MandateListProps) {
  const maxEntities = mandates.length > 0 ? Math.max(...mandates.map(m => m.num_entities), 0) : 0;

  return (
    <div className="space-y-4">
      {mandates.map((mandate, index) => (
        <motion.div
          key={mandate.symbol}
          className="p-4 border rounded-lg shadow-sm bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow">
              {/* Line 1: Priority Area and Symbol */}
              <div className="flex items-center gap-3 mb-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className={`w-4 h-4 rounded-full flex-shrink-0 ${getPriorityAreaColor(mandate.priority_area)}`}></div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{mandate.priority_area}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-sm text-muted-foreground font-mono truncate">{mandate.full_document_symbol || mandate.symbol}</p>
              </div>

              {/* Line 2: Title */}
              <h3 className="text-base font-semibold mb-3">{mandate.title || 'Untitled Mandate'}</h3>
              
              {/* Line 3: Citations */}
              <div className="w-full md:w-2/3">
                 <div className="text-sm font-medium">{mandate.num_entities} citations</div>
                 <div className="w-full bg-muted rounded-full h-2.5 my-2">
                    <div 
                       className="bg-primary h-2.5 rounded-full" 
                       style={{ width: `${maxEntities > 0 ? (mandate.num_entities / maxEntities) * 100 : 0}%` }}
                    ></div>
                 </div>
                 <EntityBadges entities={mandate.entities} />
              </div>
            </div>

            {/* Details Button on the right */}
            <div className="flex-shrink-0">
              {mandate.operative_paragraphs && mandate.operative_paragraphs.length > 0 && (
                 <Dialog>
                    <DialogTrigger asChild>
                       <Button variant="outline" size="sm">
                          Details
                       </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                       <DialogHeader>
                          <DialogTitle>{mandate.title || 'Untitled Mandate'}</DialogTitle>
                       </DialogHeader>
                       <div className="prose max-h-[60vh] overflow-y-auto p-2">
                          <ul className="list-disc pl-5">
                             {mandate.operative_paragraphs?.map((p, i) => (
                                <li key={i} className="mb-2">{p}</li>
                             ))}
                          </ul>
                       </div>
                    </DialogContent>
                 </Dialog>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
} 