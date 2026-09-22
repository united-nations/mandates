import {
  DocumentSymbol as SharedDocumentSymbol,
  type DocumentSymbolProps,
} from '@un-eosg/ui/components/document-symbol'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type { DocumentSymbolProps }

export function DocumentSymbol({
  className,
  subdued,
  children,
  title,
  ...props
}: DocumentSymbolProps) {
  return (
    <SharedDocumentSymbol
      {...props}
      subdued={subdued}
      title={subdued ? `Current document${title ? `: ${title}` : ''}` : title}
      className={cn(
        className,
        'text-xs',
        subdued && 'inline-flex items-baseline gap-1 bg-primary font-medium text-primary-foreground'
      )}
    >
      {children}
      {subdued && <Check aria-hidden className="h-3 w-3 shrink-0 self-center" />}
    </SharedDocumentSymbol>
  )
}
