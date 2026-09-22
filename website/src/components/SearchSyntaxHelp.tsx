'use client'

import { DisclosurePopover } from '@/components/ui/disclosure-popover'
import { explainerTexts } from '@/lib/en_text_contents'

/**
 * The search grammar, as the reader is told it. Two forms of one content:
 * the block, for a heading's "?" panel (the paragraph search folds it into
 * its section heading), and the hint, a "?" of its own beside a field that
 * has no heading to hang it on (the documents-table search). The rules come
 * from one list in en_text_contents, so the two fields cannot describe
 * different grammars.
 */
export function SearchSyntaxHelp() {
  return (
    <div>
      <p className="font-medium text-foreground">
        {explainerTexts.searchSyntax.title}
      </p>
      <ul className="list-disc space-y-1 pl-4">
        {explainerTexts.searchSyntax.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * The "?" beside a search field. The same glyph and geometry as the "?" on
 * the detail-page headings, without the baseline nudge those need: this one
 * centres against the field it sits beside, not a line of heading text.
 */
export function SearchSyntaxHint() {
  return (
    <DisclosurePopover
      label={explainerTexts.searchSyntax.title}
      side="bottom"
      align="start"
      sideOffset={6}
      trigger="?"
      triggerClassName="inline-block h-4 w-4 shrink-0 cursor-pointer overflow-hidden rounded-full border border-border p-0 text-center text-xs leading-[0.875rem] font-semibold text-muted-foreground select-none hover:border-un-blue hover:text-un-blue-text focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
    >
      <SearchSyntaxHelp />
    </DisclosurePopover>
  )
}
