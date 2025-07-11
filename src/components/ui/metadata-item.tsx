import { ElementType, ReactNode } from 'react';

interface MetadataItemProps {
  label: ReactNode;
  children: ReactNode;
  icon?: ElementType;
}

export function MetadataItem({ label, children, icon: Icon }: MetadataItemProps) {
  return (
    <div className="flex items-center gap-2 text-sm py-1">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      <div className="font-medium text-muted-foreground">{label}:</div>
      <div className="text-foreground">{children}</div>
    </div>
  );
} 