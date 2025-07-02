'use client';

import { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Entity {
  'Entity': string;
  'Entity-Long': string;
  'Entity URL'?: string;
  'UN Principal Organ'?: string;
}

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
      const foundEntity = entities.find(e => e['Entity'] === entityName || e['Entity-Long'] === entityName);
      setEntity(foundEntity || { 'Entity': entityName, 'Entity-Long': entityName });
    });
  }, [entityName]);

  const displayName = entity?.['Entity'] || entityName;
  const longName = entity?.['Entity-Long'] || entityName;

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