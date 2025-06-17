
// This component is no longer used in page.tsx and can be removed or kept for other purposes.
// For this refactor, its usage has been replaced by MandateTable and MandateTableRow.
// To ensure no build errors if it were imported elsewhere by mistake, keeping a minimal valid component.
// Or, preferably, it should be deleted if confirmed it's not needed anywhere.

import type { Mandate } from '@/types';

interface MandateListItemProps {
  mandate: Mandate;
  onViewOperativeParagraphs: (mandateId: string) => void;
}

export function MandateListItem({ mandate, onViewOperativeParagraphs }: MandateListItemProps) {
  return (
    <div>
      {/* This component is deprecated in favor of the table view. */}
      <p>{mandate.title}</p>
      <button onClick={() => onViewOperativeParagraphs(mandate.id)}>View Details (Old)</button>
    </div>
  );
}
