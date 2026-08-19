'use client'

import { ClickTooltip } from '@/components/DirectoryControls'
import { ChartSearchInput } from '@/components/ui/chart-search-input'
import { ChipCount } from '@/components/ui/chip'
import { DisclosurePopover } from '@/components/ui/disclosure-popover'
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { DirectorySelection, OrganGroup, OrganWithCount } from '@/types'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { useMemo, useState } from 'react'

/**
 * The directory behind card 1: everything the budget names as the source of a
 * mandate, grouped by its place in the UN system (see lib/organ-groups.ts).
 * Reads the same category structure the table's Organ filter groups by
 * (getOrganHierarchy).
 *
 * Not all of it is an organ — two instruments and one organisation outside the
 * UN sit among the bodies — which is why the dialog is titled by what the
 * members have in common and why two cards carry a marker the others do not.
 *
 * On the single page, selecting an organ ADDS it to the active filters and
 * scrolls to the mandates section; the active organ is highlighted. The write
 * itself is injected by DirectoryExplorer (see DirectorySelection) because it
 * has to match the scope these counts were computed under.
 *
 * One view only: cards with names. The vocabulary holds 26 codes and fewer than
 * that ever render at once, so the compact acronym-pill view the entity
 * directory still needs bought nothing here except a toggle to get wrong — it
 * was removed along with its localStorage pref.
 */

interface OrgansDirectoryProps {
  groups: OrganGroup[]
  selection: DirectorySelection
}

export function OrgansDirectory({ groups, selection }: OrgansDirectoryProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const active = selection.active('organ')
  const select = (value: string) => selection.select('organ', value)

  const totalOrgans = useMemo(
    () => groups.reduce((n, g) => n + g.organs.length, 0),
    [groups]
  )

  const filtered = useMemo(() => {
    if (!term) return groups
    return groups
      .map((g) => ({
        ...g,
        organs: g.organs.filter(
          (o) =>
            o.short.toLowerCase().includes(term) ||
            o.long.toLowerCase().includes(term)
        ),
      }))
      .filter((g) => g.organs.length > 0)
  }, [groups, term])

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <ChartSearchInput
          placeholder="Search organs by acronym or name..."
          value={search}
          onChange={setSearch}
        />

        {filtered.length > 0 ? (
          <div className="space-y-6">
            {filtered.map((group) => (
              <div key={group.id}>
                <GroupHeading>{group.label}</GroupHeading>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.organs.map((organ) => (
                    <OrganCard
                      key={organ.short}
                      organ={organ}
                      active={active === organ.short}
                      onSelect={select}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No organs match “{search.trim()}”.
          </p>
        )}

        {/* The footer and the notes sit under the last category, and only when
            nothing is typed: both describe the whole list, and neither is true
            of a search result. */}
        {!term && (
          <div className="space-y-1 pt-2">
            <p className="text-xs text-gray-500">
              {totalOrgans.toLocaleString()} sources of mandates listed.
            </p>
            <AboutThisList />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

/* The `i` roundel, in the two weights this surface uses. The hairline form is
   the same mark the detail view puts beside a disclaimer line; the card form is
   a size up, filled, and fills with the accent colour when its panel is open,
   because on those two cards the marker is the only thing explaining why the
   card is where it is and it has to read as a control rather than as
   decoration. */
const NOTE_GLYPH =
  'inline-block h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-gray-300 text-center font-serif text-[9px] leading-3 text-gray-500 italic select-none'
const CARD_GLYPH =
  'inline-block h-4 w-4 shrink-0 overflow-hidden rounded-full border border-gray-400 bg-gray-100 text-center font-serif text-[10px] leading-[0.875rem] font-bold text-gray-700 italic select-none'

/**
 * The notes, in render order. The zero-documents line leads because it answers
 * the first question a reader has on opening the panel, which is why the list is
 * shorter than the number above it.
 *
 * Held as whole strings rather than written into the markup: a sentence the
 * formatter is free to break across source lines stops being one thing anyone
 * can search for, and these were reviewed as sentences.
 */
const ABOUT_THIS_LIST = [
  'Bodies with no documents in the current view are not listed — the Trusteeship Council among them.',
  'The grouping into categories is editorial — a choice made for this page.',
  'Some instruments are recorded under Other rather than here.',
  'Some documents record an issuing body that is not shown in this list.',
]

/**
 * What a reader needs to know about the list that the list cannot say itself:
 * which bodies are missing from it, that the grouping is a choice, where the
 * rest of the instruments are, and that a few documents name a source no card
 * here stands for.
 *
 * Notes, not a disclaimer, with one exception. A disclaimer is earned by
 * content produced by a process that can be wrong in ways the reader cannot
 * see; a deterministic display rule cannot be wrong, only unstated. The third
 * line is the exception and is a real disclaimer: `Other` is clickable, its
 * documents are itemised nowhere, and a reader looking for an instrument has no
 * way to discover that some are inside it.
 *
 * The last line depends on card 1 counting what this list counts. While the two
 * disagreed, the line that belonged here was the one describing the difference;
 * asserting the totals agree before they do is worse than the silent
 * disagreement, because the page then vouches for it.
 *
 * Same disclosure primitive as the card markers, and lighter than the cards on
 * purpose — a trigger, not a fifth entry in the list of categories.
 */
function AboutThisList() {
  return (
    <DisclosurePopover
      label="About this list"
      // Anchored at the foot of the list, so it opens upward: a panel dropping
      // downward from the last element opens off the end of the surface.
      side="top"
      align="start"
      triggerClassName="group/notes inline-flex cursor-pointer items-center gap-1.5 rounded-sm p-0 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
      contentClassName="w-[27rem]"
      trigger={
        <>
          <span className="border-b border-dotted border-gray-300 pb-px text-xs text-gray-500 group-hover/notes:border-un-blue group-hover/notes:text-un-blue group-data-[state=open]/notes:border-un-blue group-data-[state=open]/notes:text-un-blue">
            About this list
          </span>
          <span
            aria-hidden
            className={cn(
              NOTE_GLYPH,
              'group-hover/notes:border-un-blue group-hover/notes:text-un-blue group-data-[state=open]/notes:border-un-blue group-data-[state=open]/notes:text-un-blue'
            )}
          >
            i
          </span>
        </>
      }
    >
      <span className="mb-2 block text-[11px] font-semibold tracking-[0.04em] text-gray-500 uppercase">
        About this list
      </span>
      <ul className="list-disc space-y-1.5 pl-3.5 text-xs leading-relaxed text-gray-600 marker:text-gray-300">
        {ABOUT_THIS_LIST.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </DisclosurePopover>
  )
}

/**
 * The two cards whose category label does not describe them, and what the
 * marker says. Keyed by the code, not by the category: both keep their marker
 * wherever their card is grouped, and the grouping is the thing most likely to
 * be revised next.
 *
 * Both markers carry the same weight. Two matched markers read as "these have
 * context"; one heavier than the other reads as "something is wrong with this
 * one", which is the reading per-card placement exists to avoid.
 */
const CARD_NOTES: Record<string, string> = {
  WTO:
    'The World Trade Organization is not a United Nations body. It is a ' +
    'standing intergovernmental organisation; its documents appear here ' +
    'because the budget records obligations arising from them.',
  INCB:
    'The International Narcotics Control Board is established by treaty, but ' +
    'it monitors how conventions are implemented rather than adopting ' +
    'decisions.',
}

/** h3, not h2: the dialog's own DialogTitle is the h2 of this subtree. */
function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-gray-200 pb-1.5 text-sm font-normal tracking-wide text-gray-600 uppercase">
      {children}
    </h3>
  )
}

function OrganCard({
  organ,
  active,
  onSelect,
}: {
  organ: OrganWithCount
  active: boolean
  onSelect: (value: string) => void
}) {
  const longName = organ.long && organ.long !== organ.short ? organ.long : null
  const note = CARD_NOTES[organ.short]

  return (
    <div
      className={cn(
        'group flex items-start justify-between gap-2 rounded-lg border bg-white px-3 py-2 transition-all',
        active
          ? 'border-un-blue'
          : 'border-gray-200 hover:border-un-blue hover:shadow-md'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`/secretariat?organ=${encodeURIComponent(organ.short)}`}
            onClick={(e) => {
              e.preventDefault()
              onSelect(organ.short)
            }}
            // The ring lives on the anchor, not on the card that wraps it: the
            // card is a <div> and cannot take focus, so a ring drawn there
            // would highlight a region the keyboard never lands on. Offset and
            // radius match the shared chip focus treatment.
            className="min-w-0 flex-1 rounded-sm focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  'text-sm font-semibold',
                  active ? 'text-un-blue' : 'text-gray-900'
                )}
              >
                {organ.short}
              </span>
              <ChipCount>{organ.count.toLocaleString()}</ChipCount>
            </div>
            {longName && (
              // Up to three lines, not one truncated one: the whole point of the
              // directory is expanding the acronym, and single-line truncation
              // made ESCAP and ESCWA render identical text. `title` is the
              // last-resort recovery path should a name ever still clamp.
              <div
                title={longName}
                className="line-clamp-3 text-xs leading-snug text-gray-500"
              >
                {longName}
              </div>
            )}
          </a>
        </TooltipTrigger>
        <ClickTooltip
          name={longName ?? undefined}
          meta={`${organ.count.toLocaleString()} mandate${organ.count === 1 ? '' : 's'}`}
        />
      </Tooltip>

      {/* The marker sits in the card's top row after the count chip, as a
          sibling of the name link rather than inside it: a button nested in an
          anchor is not valid, and the name carries a tooltip of its own that
          this must not be swallowed by. */}
      <div className="mt-0.5 flex shrink-0 items-center gap-1">
        {note && (
          <DisclosurePopover
            label={`About ${organ.short}`}
            // Downward, and right-aligned to the card so the panel does not
            // overflow the grid at the right-hand column.
            side="bottom"
            align="end"
            triggerClassName="group/marker inline-flex cursor-pointer rounded-full p-0 focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
            trigger={
              <span
                aria-hidden
                className={cn(
                  CARD_GLYPH,
                  'group-hover/marker:border-un-blue group-hover/marker:bg-un-blue group-hover/marker:text-white group-data-[state=open]/marker:border-un-blue group-data-[state=open]/marker:bg-un-blue group-data-[state=open]/marker:text-white'
                )}
              >
                i
              </span>
            }
          >
            {note}
          </DisclosurePopover>
        )}
        {organ.website && (
          <a
            href={organ.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Official website of ${organ.short} (opens in a new tab)`}
            title="Official website"
            className="rounded-sm text-gray-300 hover:text-un-blue focus-visible:ring-2 focus-visible:ring-un-blue focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
          </a>
        )}
        <ChevronRight
          aria-hidden
          className={cn(
            'h-3.5 w-3.5',
            active ? 'text-un-blue' : 'text-gray-300 group-hover:text-un-blue'
          )}
        />
      </div>
    </div>
  )
}
