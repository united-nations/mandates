import { ElementType, ReactNode } from 'react';

interface MetadataItemProps {
  label: ReactNode;
  children: ReactNode;
  icon?: ElementType;
}

export function MetadataItem({ label, children, icon: Icon }: MetadataItemProps) {
  return (
    <div className="flex gap-3 text-sm py-1.5">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
      <div className="font-medium text-muted-foreground flex-shrink-0 min-w-[120px] leading-relaxed">{label}:</div>
      <div className="text-foreground flex-1">{children}</div>
    </div>
  );
} 