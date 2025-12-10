import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarListItemProps {
  /**
   * The display label for the item
   */
  label: React.ReactNode;

  /**
   * The count value for this item
   */
  count: number;

  /**
   * The maximum count value for calculating progress bar width
   */
  maxCount: number;

  /**
   * Whether this item is currently active/selected
   * @default false
   */
  isActive?: boolean;

  /**
   * Click handler for the item
   */
  onClick?: () => void;

  /**
   * Whether to show the progress bar
   * @default true
   */
  showProgressBar?: boolean;

  /**
   * Visual variant of the item
   * @default 'filter'
   */
  variant?: "navigation" | "filter";

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Additional CSS classes for the count display
   */
  countClassName?: string;

  /**
   * Tooltip content to show on hover
   */
  tooltipContent?: string;
}

export function SidebarListItem({
  label,
  count,
  maxCount,
  isActive = false,
  onClick,
  showProgressBar = true,
  variant = "filter",
  className,
  countClassName,
  tooltipContent,
}: SidebarListItemProps) {
  const progressPercentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

  // Different styles based on variant
  const baseStyles =
    "flex items-center justify-between p-2 rounded-sm cursor-pointer group border-b border-muted/30 last:border-b-0";

  const variantStyles = {
    navigation: {
      container: "hover:bg-muted/20 transition-colors",
      label: "group-hover:text-un-blue transition-colors",
      active: "", // Navigation items don't have active state since they navigate away
    },
    filter: {
      container: "hover:bg-muted/30 transition-colors",
      label: "transition-colors",
      active: "bg-un-blue/10 border-un-blue/30",
    },
  };

  const currentVariant = variantStyles[variant];

  const itemContent = (
    <div
      className={cn(
        baseStyles,
        currentVariant.container,
        isActive && currentVariant.active,
        className,
      )}
      onClick={onClick}
    >
      <div className="min-w-0 flex-1">
        <div
          className={cn("text-sm font-medium truncate", currentVariant.label)}
        >
          {label}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 w-32">
        <span className="flex items-center w-full">
          <span
            className={cn(
              "text-xs font-mono text-un-blue text-right pr-2 min-w-[28px] max-w-[32px] shrink-0 justify-end flex",
              countClassName,
            )}
          >
            {count.toLocaleString()}
          </span>
          {showProgressBar && (
            <span className="relative flex-1 h-2 bg-un-blue/10 rounded">
              <span
                className="absolute left-0 top-0 h-2 rounded bg-un-blue/60"
                style={{
                  width: `${progressPercentage}%`,
                  minWidth: count > 0 ? 2 : 0,
                }}
              />
            </span>
          )}
        </span>
      </div>
    </div>
  );

  // If tooltip content is provided, wrap with tooltip
  if (tooltipContent) {
    return (
      <Tooltip delayDuration={300} disableHoverableContent={true}>
        <TooltipTrigger asChild>{itemContent}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return itemContent;
}
