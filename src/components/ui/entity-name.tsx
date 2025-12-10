"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EntityNameProps {
  entityName: string;
  entityLong?: string;
  showUnderline?: boolean;
  asChild?: boolean;
}

export function EntityName({
  entityName,
  entityLong,
  showUnderline = true,
  asChild = false,
}: EntityNameProps) {
  const displayName = entityName;
  const longName = entityLong || entityName;

  if (displayName === longName) {
    return <>{displayName}</>;
  }

  // If used inside interactive elements, don't render tooltip trigger
  if (asChild) {
    return <span title={longName}>{displayName}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger className="cursor-help">{displayName}</TooltipTrigger>
      <TooltipContent>
        <p>{longName}</p>
      </TooltipContent>
    </Tooltip>
  );
}
