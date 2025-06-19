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
  showUnderline?: boolean;
}

let entitiesPromise: Promise<Entity[]> | null = null;
const getEntities = () => {
  if (!entitiesPromise) {
    entitiesPromise = fetch('/api/entities').then(res => res.json());
  }
  return entitiesPromise;
};

export function EntityName({ entityName, showUnderline = true }: EntityNameProps) {
  const [entity, setEntity] = useState<Entity | null>(null);

  useEffect(() => {
    getEntities().then(entities => {
      const foundEntity = entities.find(e => e.entity === entityName || e.entity_long === entityName);
      setEntity(foundEntity || { entity: entityName, entity_long: entityName });
    });
  }, [entityName]);

  const displayName = entity?.entity || entityName;
  const longName = entity?.entity_long || entityName;

  if (displayName === longName) {
    return <>{displayName}</>;
  }

  return (
      <Tooltip>
        <TooltipTrigger className={showUnderline ? "underline decoration-dotted cursor-help" : "cursor-help"}>
          {displayName}
        </TooltipTrigger>
        <TooltipContent>
          <p>{longName}</p>
        </TooltipContent>
      </Tooltip>
  );
} 