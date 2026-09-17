/**
 * The directory summary's columns.
 *
 * Data-driven from this list, the way `COLUMN_DEFINITIONS` in
 * `components/table/MandateColumns.ts` is: array order is column order, and the
 * table renders by mapping over it. Cell bodies are a switch on `id` in
 * `DirectorySummaryTable.tsx`, again following that file.
 *
 * "Summary" names the COLUMN SET, not the audience. The difference between this
 * and the internal directory's own column list is administrative fields — who
 * cleared the designation, who submitted it and when, lead or shared,
 * and the supersession record. None of them is read by the query behind this
 * table (see `lib/data/focal-points.ts`), so the cut is made where the data is
 * fetched, not hidden here at the point of rendering.
 *
 * There are then TWO cuts, and they are different things. The one above is what
 * this page can show at all. The one below — `addable` — is what it shows on
 * arrival. A reader here is not an administrator: they have come to find out
 * who to write to about a subject, they are not signed in, and they will
 * probably not come back. So the table opens on the four columns that answer
 * that question and offers three more behind a control. Everything else the
 * query returns is in the panel, in full, one click away; nothing is hidden by
 * being off by default.
 *
 * ---------------------------------------------------------------------------
 * HOW A COLUMN IS SIZED
 *
 * Each column declares a FLOOR and a SHARE, not a width. The width is worked
 * out for the set of columns actually on screen, by `directorySummaryLayout`
 * below. A fixed width per column cannot do this: the same number has to serve
 * a four-column table and a seven-column one, and it is wrong for at least one
 * of them. Four columns of fixed widths left 360px over, all of which landed in
 * the single column declared flexible — Coverage rendered 480px wide holding
 * three short counts — while the seven-column table was tight enough that two
 * headers and three cells broke.
 *
 * `min` is the floor: the width below which something observably breaks. Every
 * one of them below is a measured number with the breakage named beside it, not
 * a guess. Two kinds of breakage set them:
 *
 *   - The HEADER. A header must never wrap, and a one-word header does not
 *     wrap, it overflows its cell silently. Every floor is at or above its
 *     header's rendered width plus the 24px the cell's `px-3` takes.
 *   - A PHRASE in the cell that should not be split. Where content truncates or
 *     clamps at any width — display names, contact names, addresses — there is
 *     no such phrase, and the header alone sets the floor.
 *
 * `grow` is the share of whatever the table has spare, relative to the other
 * columns on screen. It is a weight, not a percentage: the shares of the
 * visible columns are summed and each column takes its fraction, so adding or
 * removing a column redistributes automatically. Zero means the column never
 * grows — its content has a bounded upper length and extra width would buy
 * nothing but white space, which is the fault this replaced.
 *
 * ---------------------------------------------------------------------------
 * WHAT THE TABLE HAS TO WORK WITH
 *
 * This page uses the shared centred main column rather than the full-bleed
 * treatment the mandate explorer opts into, so the figure is that column's
 * content box, not the window:
 *
 *   `mx-auto w-full max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16`
 *
 * At and above 1152px of viewport the `max-w-6xl` cap binds and the content box
 * is a constant 1152 - 128 = 1024px, at 1280 and at 1440 and at any width
 * above. The table does not get all of it: it sits inside a wrapper with a 1px
 * border on each side, so what it has is 1022. That is `DESIGN_WIDTH`, and the
 * widths are worked out against it — 1024 overflows the wrapper by exactly the
 * two pixels of its own border. Below 1152 the cap is not reached, the content
 * box is `viewport - 128` and shrinks with it, and the table scrolls
 * horizontally with the detail rail pinned — the mandate table's behaviour too,
 * and what this table already did below about 1144.
 *
 * The seven-column set's floors sum to exactly `DESIGN_WIDTH`. That is not a
 * coincidence, it is the binding constraint: the floors are what the content
 * needs, and their sum is what the wrapper gives. There is no slack in the
 * seven-column state — a floor raised here has to come off another column, or
 * the table starts scrolling at every viewport. The four-column set's floors
 * sum to 620, so that state has 402px to hand out, and the shares below decide
 * where it goes.
 */

import { SHOW_ENTITY_CLASSIFICATION } from '@/lib/feature-flags'

/**
 * What the table has to fill wherever the `max-w-6xl` cap binds — every viewport
 * from 1152px up. The centred column's content box is 1024 there; the table is
 * inside a wrapper whose 1px borders take two of them. Laid out to this width,
 * and scrolls below it rather than compressing columns past their floors.
 */
export const DESIGN_WIDTH = 1022

export interface DirectorySummaryColumn {
  id: string
  label: string
  /**
   * The width below which this column observably breaks, in px, including the
   * 24px of `px-3` the cell carries. Never rendered narrower than this.
   */
  min: number
  /**
   * This column's share of the table's spare width, relative to the other
   * columns on screen. Zero for a column whose content has a bounded length and
   * gains nothing from being wider.
   */
  grow: number
  /**
   * Off when the page loads, and offered by the column picker. A column without
   * this is always shown and is never offered — there is no sign-in here, so a
   * reader who switched off Focal points on a page of focal points would have
   * broken it for themselves with nothing but Reset to get back, and the four
   * that carry the answer are what the page IS rather than a preference.
   */
  addable?: true
  align?: 'left' | 'right' | 'center'
}

/**
 * What kind of body the entity is, as the focal points application classified
 * it and publishes it through the view this site reads. Beside the entity,
 * because it is a fact about the entity and not about the designation. An
 * entity the roster does not know, or one the view does not carry, has no
 * class and the cell shows the same dash the other absences show.
 *
 * Floor 136. The header "Entity class" needs 112 to stay on one line — at the
 * 100 this column used to declare it wrapped onto two, the only header in the
 * table that did. The cell then asks for more than the header does: the nine
 * labels are a closed vocabulary, so the floor is set by the longest one that
 * has to read well. "Secretariat department or office" reaches two lines at
 * 133, and was breaking across three. The longest label of the nine,
 * "Specialized agency or related organization", wants 140 for two lines and
 * takes three here — which costs nothing, because the row's height is set by
 * the entity name and the contact block beside it, and three lines of caption
 * text do not reach it.
 *
 * No share. Nine labels of known length: past 140 the column is padding.
 */
const ENTITY_CLASS_COLUMN: DirectorySummaryColumn = {
  id: 'entity_class',
  label: 'Entity class',
  min: 136,
  grow: 0,
  // Addable, not default. It is a fact about the ENTITY and not about the
  // designation, and it answers a question about the shape of the roster
  // rather than the question this page is for. A reader working out whether
  // the roster reaches past the Secretariat wants it; a reader looking up who
  // to write to about oceans does not.
  addable: true,
  align: 'left',
}

export const DIRECTORY_SUMMARY_COLUMNS: DirectorySummaryColumn[] = [
  {
    // The display name, with the code beneath it.
    //
    // The code stays because it is not an internal identifier: 59 of the 62
    // entries in `entity_display_names` are single-token acronyms, and they are
    // the ones the documents and the delegations already use — OCHA, DPPA,
    // DESA, UNEP, OHCHR. Only one code appears verbatim inside its own display
    // name, so it is almost never a repetition of the line above it. It is also
    // the only workable handle at the extremes: IIIM's display name is 227
    // characters, and nobody scans a column for that.
    //
    // So the name leads, because that is what a reader who does not know the
    // acronym needs, and the code follows in caption grey, because that is what
    // a reader who does know it scans for. Dropping either costs one of them.
    //
    // Floor 158, share 30 — the largest share in the table, with Focal points.
    // The floor is the header (68) well cleared and one real name measured:
    // "Executive Office of the Secretary-General" holds two lines at 158. It is
    // a floor and not a target. Longer names are common — "Office of the High
    // Commissioner for Human Rights" wants 227, "Office for the Coordination of
    // Humanitarian Affairs" 189 — and the cell clamps at two lines with the
    // full name on `title`, so the floor costs a clamp rather than a broken
    // layout. The share is what makes the floor rare: on arrival this column
    // renders 285 and the names above fit whole. Only a reader who has switched
    // on all three extras sees it at the floor.
    id: 'entity',
    label: 'Entity',
    min: 158,
    grow: 30,
    align: 'left',
  },
  ...(SHOW_ENTITY_CLASSIFICATION ? [ENTITY_CLASS_COLUMN] : []),
  {
    // "DPPA" does not route a query and "DPPA, Middle East Division" does —
    // which is the reason the underlying column is required. It is the closest
    // thing a designation has to a name, so it carries the row.
    //
    // Floor 132, share 20. This is the column the fixed widths hurt most
    // visibly: at 126 "Executive Office; UN80 team" broke as "Executive /
    // Office; UN80 / team", splitting a phrase the semicolon had already
    // separated. "Executive Office;" needs 127 to stay whole, so the floor
    // clears it and the break falls at the semicolon where it belongs. The
    // whole value wants 200 for one line, which the share reaches on arrival —
    // this column renders 217 in the four-column state and the value does not
    // wrap at all. The share is below Entity's and Focal points' because the
    // gain stops there: past the longest sub-unit name the width is spent.
    id: 'sub_unit',
    label: 'Sub-unit',
    min: 132,
    grow: 20,
    align: 'left',
  },
  {
    // Name, title and address stay in one cell per person. Split across three
    // columns they line up only by position, which breaks the moment a
    // designation names two people — and it may: a large division can name two
    // equal primaries, and alternates are rows rather than a fixed pair.
    //
    // Floor 136, share 30. All three lines truncate at any width, so there is
    // no phrase to protect and the floor is the header ("Focal points", 114)
    // rather than a content measurement. That gap is why this is the column the
    // seven-column set is balanced against: it is the only one whose floor can
    // move without something breaking, so the pixels Coverage and the border
    // needed came off here. The share is joint
    // largest because truncation is the cost here and width is what buys it
    // back: 273 on arrival, against the 180 this column used to have at every
    // column count.
    id: 'people',
    label: 'Focal points',
    min: 136,
    grow: 30,
    align: 'left',
  },
  {
    // Addable, not default. It is the address that outlives the person and the
    // one publishable under OP6, so it is not a minor field — but most readers
    // arrive wanting a name, the panel carries it in full for the rest, and a
    // second column of addresses beside Focal points reads as a repetition of
    // it. Switched on by the reader who means to write to the division rather
    // than to a person.
    //
    // Floor 166, share 15. The floor is the header and nothing else: at 163
    // "Functional mailbox" is the widest header in the table, and the addresses
    // under it truncate at any width. That is also why the share is small — a
    // wider column shows more of an address, which is worth something but not
    // as much as a name that stops being cut.
    id: 'functional_mailbox',
    label: 'Functional mailbox',
    min: 166,
    grow: 15,
    addable: true,
    align: 'left',
  },
  {
    // Addable, not default. A francophone delegation wanting a focal point who
    // works in French is a real routing need and the reason the field is
    // collected at all — but it is a minority of readers, and a column of
    // language codes standing between the people and what they cover is clutter
    // for everyone else.
    //
    // Codes as given on the form. Not a controlled vocabulary upstream, so this
    // shows what was entered.
    //
    // Floor 100, no share. The header sets it, and the header was a bug: at the
    // 80 this column used to declare, "Languages" overflowed its cell by
    // 18.5px. One word cannot wrap, so nothing about that showed as wrapping —
    // it simply spilled into Coverage. 99 is what the word needs and 100 is the
    // floor. No share because three codes and their separators are the whole of
    // the content.
    id: 'languages',
    label: 'Languages',
    min: 100,
    grow: 0,
    addable: true,
    align: 'left',
  },
  {
    // The summary form: how many claims of each kind. The claims themselves are
    // in the panel, in full — a cell cannot hold seven keywords without
    // becoming the row.
    //
    // Floor 138, share 15. The count lines are generated, so their lengths are
    // known rather than sampled: "document symbol" is the longest noun and the
    // plural is longer than the singular, which is the trap here. "1 document
    // symbol" needs 130 and "9 document symbols" needs 136, so a floor set from
    // the singular — as 130 was — wraps the moment a designation claims two.
    // 138 clears every kind at any single-digit count with a couple of pixels
    // over, which the column needs: at a nominal 130 the cell measured 105.5px
    // of usable width rather than 106, and a floor set flush against the
    // requirement wraps on the half pixel.
    //
    // NOT covered: "12 document symbols" wants 143, and in the seven-column
    // state there is nowhere to take the five pixels from. It wraps there, at
    // the space, onto a second line. That is the one content case the 1022
    // budget does not hold, and it holds in every other column set, where the
    // share puts this column past 200.
    //
    // The share is deliberately small, and this is the column the old layout
    // got wrong in the other direction: as the only flexible column it absorbed
    // the entire 360px surplus of the four-column state and rendered 480 wide
    // holding three phrases of about 100px each.
    id: 'coverage',
    label: 'Coverage',
    min: 138,
    grow: 15,
    align: 'left',
  },
  {
    // Pinned right. The visible affordance for the row click, not a control of
    // its own — see the `detail` case in DirectorySummaryTable.
    //
    // Neither default nor addable, and the only column that is in neither list
    // rather than in one of them: it holds no data, its header is empty, and
    // switching it off would take away the visible way into the panel while
    // leaving the row still clickable. There is nothing here for a reader to
    // decide.
    //
    // Floor 56, no share: a 22px button in a cell with 24px of padding. This is
    // the column that makes shares necessary rather than a refinement. Under
    // the old rule the surplus went wherever the one flexible column was,
    // whatever it could use it for; a rail that grows with the table is dead
    // space by construction.
    id: 'detail',
    label: '',
    min: 56,
    grow: 0,
    align: 'center',
  },
]

/**
 * The columns the picker offers, in table order. Three of them, against the
 * internal directory's fifteen or so — that directory is a management view read
 * by people who return to it and build a working set; this one is read once by
 * someone who came for a name and an address.
 */
export const ADDABLE_SUMMARY_COLUMNS: DirectorySummaryColumn[] =
  DIRECTORY_SUMMARY_COLUMNS.filter((column) => column.addable === true)

/**
 * The columns to draw, given the ids the reader has switched on. A column that
 * is not addable is always in; an addable one is in when it has been added.
 */
export function visibleSummaryColumns(
  added: ReadonlySet<string>
): DirectorySummaryColumn[] {
  return DIRECTORY_SUMMARY_COLUMNS.filter(
    (column) => column.addable !== true || added.has(column.id)
  )
}

/** Exact px widths for the columns on screen, and the width they sum to. */
export interface DirectorySummaryLayout {
  /** One width per column, in the order given. Sums exactly to `total`. */
  widths: number[]
  /** The table's width, and its `min-width` — it scrolls rather than go under. */
  total: number
}

/**
 * The widths to render, for the columns actually on screen.
 *
 * Every column starts at its floor; whatever the table has over the sum of the
 * floors is handed out in proportion to the shares of the columns on screen.
 * Because the shares are summed over the VISIBLE columns rather than over the
 * whole list, switching a column on takes width from the others in proportion
 * and switching it off gives it back — which is the point, and what a fixed
 * number per column cannot express.
 *
 * The total is `DESIGN_WIDTH`, or the sum of the floors where that is larger.
 * Larger is the seven-column case, where the floors sum to exactly
 * `DESIGN_WIDTH` and there is nothing to hand out; if a column is ever added to
 * this list the sum goes over, every column still gets its floor, and the table
 * scrolls. It does not compress: a floor is a measured breaking point, and a
 * table that fits by breaking its own headers has not fitted.
 *
 * Widths are whole pixels and sum exactly to the total, so the columns meet the
 * table's right edge with nothing left over. The rounding hands the remainder
 * to the columns with the largest fractional parts — standard largest-remainder
 * apportionment, which keeps each column within a pixel of its exact share.
 */
export function directorySummaryLayout(
  columns: DirectorySummaryColumn[]
): DirectorySummaryLayout {
  const sumMin = columns.reduce((total, column) => total + column.min, 0)
  const sumGrow = columns.reduce((total, column) => total + column.grow, 0)

  // With nothing to grow, the table IS the sum of its floors. Not a guard: it
  // is what the definition comes to when no column asks for the surplus.
  const total = sumGrow > 0 ? Math.max(DESIGN_WIDTH, sumMin) : sumMin
  const surplus = total - sumMin

  const exact = columns.map(
    (column) =>
      column.min + (sumGrow > 0 ? (surplus * column.grow) / sumGrow : 0)
  )
  const widths = exact.map((width) => Math.floor(width))

  // Largest remainder: hand the leftover pixels out one each, to the columns
  // that lost the most to flooring.
  let leftover = total - widths.reduce((sum, width) => sum + width, 0)
  const byRemainder = exact
    .map((width, index) => ({ index, fraction: width - Math.floor(width) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let i = 0; leftover > 0; i = (i + 1) % byRemainder.length) {
    widths[byRemainder[i].index] += 1
    leftover -= 1
  }

  return { widths, total }
}
