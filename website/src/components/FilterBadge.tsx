import { Chip } from '@/components/ui/chip'
import { X, LucideIcon } from 'lucide-react'

/**
 * One chip in the "Active filters" bar.
 *
 * `touch` density, unlike every chip in a table cell: this bar is a primary
 * interaction, and each chip carries a nested dismiss button that needs room
 * not to be a 16px target. The chip itself is deliberately NOT clickable — the
 * dismiss button is the only thing that does anything, so it is the only thing
 * that is focusable.
 */
interface FilterBadgeProps {
  /** The icon to display (from lucide-react) */
  icon?: LucideIcon

  /** The label text to display */
  label: React.ReactNode

  /**
   * Whether to show a clear button
   * @default true
   */
  showClearButton?: boolean

  /** Callback when clear button is clicked */
  onClear?: () => void

  /** Additional CSS classes */
  className?: string
}

export function FilterBadge({
  icon: Icon,
  label,
  showClearButton = true,
  onClear,
  className,
}: FilterBadgeProps) {
  return (
    <Chip density="touch" tone="neutral" className={className}>
      {Icon && <Icon aria-hidden className="size-3 shrink-0 self-center" />}
      {/* `self-center`, like the icon and the dismiss button. The Chip base is
          `items-baseline`, and with the 24px dismiss button next to it the label
          was the only baseline-aligned item in the line: it got flushed to the
          top of the chip, so the text sat visibly above the chip's middle and
          out of line with the "Active filters" label beside it. */}
      <span className="self-center font-medium">{label}</span>
      {showClearButton && onClear && (
        // 24px, not the old 16px: the smallest thing anyone is asked to hit in
        // this bar. `-mr-1` claws back part of the chip's own padding so the
        // extra width does not crowd the label.
        <button
          type="button"
          onClick={onClear}
          title="Clear filter"
          aria-label="Clear filter"
          className="-mr-1 inline-flex size-6 shrink-0 cursor-pointer items-center justify-center self-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
        >
          <X className="size-3" />
        </button>
      )}
    </Chip>
  )
}
