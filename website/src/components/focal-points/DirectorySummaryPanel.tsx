'use client'

import { Mail, X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet'
import { Chip } from '@/components/ui/chip'
import {
  DetailField,
  DetailFields,
  DetailPanel,
  DetailSection,
} from '@un-eosg/ui/components/detail-panel'
import { DetailPanelControls } from '@un-eosg/ui/components/detail-panel-controls'
import {
  contactTelephone,
  COVERAGE_KINDS,
  coverageClaimLabel,
  coverageKindHeading,
  type DirectorySummaryDesignation,
  type DirectorySummaryEntity,
} from '@/lib/focal-point-constants'

/**
 * The record view for one focal point designation.
 *
 * SAME SHELL AS THE MANDATE SHEET, DIFFERENT DISMISSAL.
 * -----------------------------------------------------
 * Structurally this is `MandateDetailSheet`: the local `@/components/ui/sheet`
 * over Radix Dialog, `hideClose` so the shell's own corner button is suppressed,
 * and `DetailPanel` + `DetailPanelControls` from `@un-eosg/ui` inside it — the
 * title in the fixed header where it cannot scroll away, the controls in normal
 * flow beside it and never floated.
 *
 * What differs is how it opens and closes, and it has to. The mandate sheet is
 * the shell for an intercepting parallel route: it is hardcoded `open`, because
 * the route's presence IS the open state, and it dismisses with `router.back()`,
 * because the only way to reach it is a soft navigation that pushed a history
 * entry. Neither holds here. There is no per-designation page on this site and
 * none is wanted, so there is no route to intercept and no history entry to pop
 * — `router.back()` would leave the page the reader came from. This panel is
 * therefore state-driven: `open` is a prop, and closing is a callback.
 *
 * Consequently there is no expand control. `DetailPanelControls` takes `expand`
 * as optional, so omitting it leaves close alone rather than needing a disabled
 * button standing in for a page that does not exist.
 *
 * NO RECORD SECTION. Two sections, People and Coverage, and the header. Who
 * cleared the designation, who submitted it and when, whether the entity leads
 * or shares, and the supersession history are the administrative cut — they are
 * not in the query behind this page at all, so there is nothing here to omit.
 */
export function DirectorySummaryPanel({
  designation,
  open,
  onOpenChange,
}: {
  /**
   * The record to show. Held by the caller across a close so the panel has
   * something to render while it animates out — clearing it on close empties
   * the panel for the length of the slide.
   */
  designation: DirectorySummaryDesignation | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open && designation !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        // Same gutter correction as the mandate sheet: the page reserves a
        // permanent scrollbar gutter, and Radix's scroll-lock publishes the
        // width it removed as --removed-body-scroll-bar-size on the locked
        // body. Without this the panel sits ~15px off the window edge.
        className="mr-[calc(var(--removed-body-scroll-bar-size,0px)*-1)] flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl"
      >
        {designation && (
          <>
            <SheetTitle className="sr-only">
              {entityLabel(designation.entity)} — {designation.subUnit}
            </SheetTitle>
            {/* Radix warns, and screen readers lose the announcement, when a
                DialogContent has no description. Mirrors the two visible
                sections, and has to be re-read whenever they change. */}
            <SheetDescription className="sr-only">
              Focal point designation for {entityLabel(designation.entity)},{' '}
              {designation.subUnit}: who to contact there, and what subjects the
              designation covers.
            </SheetDescription>

            <DetailPanel
              className="[&>header_h2]:break-words [&>header_h2]:whitespace-normal"
              eyebrow="Focal point designation"
              title={designation.subUnit}
              bodyClassName="un-scrollbar px-5 py-6"
              headerMetadata={
                <>
                  {/* The name in full — no clamp here. The table clamps at two
                      lines because a row has a height to keep; the panel is
                      where the whole of a 227-character name belongs. */}
                  {designation.entity.name ? (
                    <span className="text-sm text-foreground">
                      {designation.entity.name}
                    </span>
                  ) : (
                    // Rostered but unnamed by the view. The code below is not
                    // promoted into this slot to cover for it.
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {designation.entity.code && (
                    <Chip density="dense" title="Entity code">
                      {designation.entity.code}
                    </Chip>
                  )}
                </>
              }
              controls={
                <DetailPanelControls
                  close={{
                    label: 'Close',
                    onClick: () => onOpenChange(false),
                    icon: <X aria-hidden className="h-4 w-4" />,
                  }}
                />
              }
            >
              <DesignationDetails designation={designation} />
            </DetailPanel>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Shared contact and coverage content for designation and entity panels. */
export function DesignationDetails({
  designation,
}: {
  designation: DirectorySummaryDesignation
}) {
  return (
    <div className="space-y-6">
      <PeopleSection designation={designation} />
      <CoverageSection designation={designation} />
    </div>
  )
}

/**
 * The people on the designation, and the division's shared mailbox.
 *
 * One block per person rather than a grid of fields: name, title and address
 * belong to each other, and a designation may name more than one primary.
 */
function PeopleSection({
  designation,
}: {
  designation: DirectorySummaryDesignation
}) {
  const { contacts, functionalMailbox } = designation
  return (
    <DetailSection
      heading="Who to contact"
      hint={contacts.length > 0 ? contactCountHint(contacts.length) : undefined}
    >
      {contacts.length === 0 ? (
        // A live designation with nobody current on it is a real state — a
        // departure closes the contact row and leaves the portfolio standing —
        // and it is said plainly rather than papered over with the mailbox.
        <p className="text-muted-foreground">
          No current contact is listed for this designation.
        </p>
      ) : (
        <ul className="space-y-5">
          {contacts.map((contact) => {
            const telephone = contactTelephone(contact)
            return (
              <li key={contact.email + contact.name} className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-medium text-foreground">
                    {contact.name}
                  </span>
                  {contact.role === 'alternate' && (
                    <span className="text-xs text-muted-foreground">
                      Alternate
                    </span>
                  )}
                </div>
                {contact.title && (
                  <p className="text-foreground">{contact.title}</p>
                )}
                <EmailLink address={contact.email} className="mt-1" />
                {/* Absent unless a number was given, and rendered as nothing
                  rather than as a dash: the panel is a stack of what is known
                  about this person, and a line saying a field is empty is not
                  one of them. The table's cell does show a dash, because a
                  cell in a column has to hold its row's height. */}
                {telephone !== null && (
                  <p className="mt-1">
                    <a
                      href={`tel:${contact.telephone}`}
                      className="text-un-blue-text hover:underline"
                    >
                      {telephone}
                    </a>
                  </p>
                )}
                {contact.workingLanguages &&
                  contact.workingLanguages.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Works in {contact.workingLanguages.join(', ')}
                    </p>
                  )}
              </li>
            )
          })}
        </ul>
      )}

      {/* DetailField renders dt/dd, which are only valid inside a dl — that is
          what DetailFields is, so the pair travels together even for one
          field. */}
      {functionalMailbox && (
        <DetailFields columns={1} className="mt-6">
          <DetailField
            label="Functional mailbox"
            className="[&>dt]:text-foreground"
          >
            <EmailLink address={functionalMailbox} />
          </DetailField>
        </DetailFields>
      )}
    </DetailSection>
  )
}

/**
 * The coverage claims in full — the one thing the panel has that the table
 * cannot, since a cell will not hold seven keywords without becoming the row.
 *
 * Grouped by kind, in COVERAGE_KINDS order. A kind with no claims renders
 * nothing: an entity that claims no agenda items has not left a gap to fill.
 *
 * A body the entity named itself is a chip among the bodies rather than a
 * group of its own, because it is one of the bodies the division supports and
 * reads as one. The line under the group is what keeps it honest: the
 * controlled list is a list somebody drew up, and a name that is not on it is
 * a claim about a body rather than a choice from the nine on offer. That
 * distinction is the same one the entity column makes about an entity the
 * roster does not hold, and it is worth a line for the same reason.
 */
function CoverageSection({
  designation,
}: {
  designation: DirectorySummaryDesignation
}) {
  const { coverage } = designation
  const named = coverage
    .map((claim) => claim.unmatchedBodyText)
    .filter((text): text is string => text !== null)
  return (
    <DetailSection heading="What it covers">
      {coverage.length === 0 ? (
        <p className="text-muted-foreground">
          This designation records no coverage claims.
        </p>
      ) : (
        <div className="space-y-4">
          {COVERAGE_KINDS.map((kind) => {
            const claims = coverage.filter((claim) => claim.kind === kind)
            if (claims.length === 0) return null
            return (
              <div key={kind}>
                <h4 className="mb-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                  {coverageKindHeading(kind)}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {claims.map((claim) => (
                    <Chip key={claim.value} density="dense">
                      {coverageClaimLabel(claim)}
                    </Chip>
                  ))}
                </div>
                {kind === 'body' && named.length > 0 && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {named.join(', ')} {named.length === 1 ? 'is' : 'are'} not
                    on the list of bodies offered; the entity named{' '}
                    {named.length === 1 ? 'it' : 'them'}.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </DetailSection>
  )
}

/**
 * An address, as a mail link.
 *
 * Shared by the panel and the table so the two spell the same thing the same
 * way. In the table it also has to stop the click reaching the row — see
 * `DirectorySummaryTable`, which passes its own handler.
 */
export function EmailLink({
  address,
  className,
  onClick,
}: {
  address: string
  className?: string
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a
      href={`mailto:${address}`}
      onClick={onClick}
      className={`inline-flex min-w-0 items-center gap-1.5 text-un-blue-text hover:underline ${className ?? ''}`}
    >
      <Mail aria-hidden className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{address}</span>
    </a>
  )
}

function contactCountHint(count: number): string {
  return count === 1 ? '1 person' : `${count} people`
}

/**
 * How the entity is announced to a screen reader.
 *
 * Joins the parts that exist rather than choosing one to stand for the other —
 * the same two facts the visible header shows, in the same order. An entity
 * whose name the view does not carry is announced by its code alone, which is
 * what is on the screen for it too; nothing is substituted that is not also
 * visible.
 */
function entityLabel(entity: DirectorySummaryEntity): string {
  return [entity.name, entity.code].filter(Boolean).join(' ')
}
