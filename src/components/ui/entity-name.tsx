'use client';

import { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Entity } from '@/types';

interface EntityNameProps {
  entityName: string;
}

let entitiesPromise: Promise<Entity[]> | null = null;
const getEntities = () => {
  if (!entitiesPromise) {
    entitiesPromise = fetch('/api/entities').then(res => res.json());
  }
  return entitiesPromise;
};

export function EntityName({ entityName }: EntityNameProps) {
  const [entity, setEntity] = useState<Entity | null>(null);

  useEffect(() => {
    getEntities().then(entities => {
      const foundEntity = entities.find(e => e.short_name === entityName || e.long_name === entityName);
      setEntity(foundEntity || { long_name: entityName, short_name: entityName, principal_organ: [], category: 'Unknown' });
    });
  }, [entityName]);

  const displayName = entity?.short_name || entityName;
  const longName = entity?.long_name || entityName;

  if (displayName === longName) {
    return <>{displayName}</>;
  }

  return (
      <Tooltip>
        <TooltipTrigger className="underline decoration-dotted cursor-help">
          {displayName}
        </TooltipTrigger>
        <TooltipContent>
          <p>{longName}</p>
        </TooltipContent>
      </Tooltip>
  );
} 