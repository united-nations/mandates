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
  asChild?: boolean;
}

export function EntityName({ entityName, showUnderline = true, asChild = false }: EntityNameProps) {
  const [entity, setEntity] = useState<Entity | null>(null);

  useEffect(() => {
    async function fetchEntity() {
      try {
        const url = `/api/entities/${encodeURIComponent(entityName)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setEntity(data);
        } else {
          // Fallback to default entity structure if not found
          setEntity({ 'Entity': entityName, 'Entity-Long': entityName });
        }
      } catch (error) {
        console.error('EntityName: Error fetching entity:', error);
        setEntity({ 'Entity': entityName, 'Entity-Long': entityName });
      }
    }

    if (entityName) {
      fetchEntity();
    }
  }, [entityName]);

  const displayName = entity?.['Entity'] || entityName;
  const longName = entity?.['Entity-Long'] || entityName;

  if (displayName === longName) {
    return <>{displayName}</>;
  }

  // If used inside interactive elements, don't render tooltip trigger
  if (asChild) {
    return (
      <span className={showUnderline ? "underline decoration-dotted" : ""} title={longName}>
        {displayName}
      </span>
    );
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