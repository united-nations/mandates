import { ElementType, ReactNode } from 'react';

interface MetadataItemProps {
  label: ReactNode;
  children: ReactNode;
  icon?: ElementType;
}

export function MetadataItem({ label, children, icon: Icon }: MetadataItemProps) {
  return (
    <div className="text-sm py-1.5">
      {/* Mobile: stacked layout, Desktop: side-by-side */}
      <div className="flex flex-col sm:flex-row sm:gap-3">
        {/* Icon and label container */}
        <div className="flex gap-3 sm:flex-shrink-0 sm:min-w-[120px]">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
          <div className="font-medium text-muted-foreground leading-relaxed">{label}:</div>
        </div>
        
        {/* Content */}
        <div className="text-foreground sm:flex-1 mt-1 sm:mt-0">{children}</div>
      </div>
    </div>
  );
} 