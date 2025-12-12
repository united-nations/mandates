import { ElementType, ReactNode } from 'react'

interface MetadataItemProps {
  label: ReactNode
  children: ReactNode
  icon?: ElementType
}

export function MetadataItem({
  label,
  children,
  icon: Icon,
}: MetadataItemProps) {
  return (
    <div className="py-1.5 text-sm">
      {/* Mobile: stacked layout, Desktop: side-by-side */}
      <div className="flex flex-col sm:flex-row sm:gap-3">
        {/* Icon and label container */}
        <div className="flex gap-3 sm:min-w-[120px] sm:shrink-0">
          {Icon && (
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div className="leading-relaxed font-medium text-muted-foreground">
            {label}:
          </div>
        </div>

        {/* Content */}
        <div className="mt-1 text-foreground sm:mt-0 sm:flex-1">{children}</div>
      </div>
    </div>
  )
}
