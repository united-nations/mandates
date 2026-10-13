/**
 * Columns for the focal point directory. Personal contact details and working
 * languages live together in Focal points, below the office mailbox.
 * Each column has a minimum width and a share of the remaining space.
 */

/** Minimum design width after combining telephone and language columns. */
export const DESIGN_WIDTH = 922

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

export const DIRECTORY_SUMMARY_COLUMNS: DirectorySummaryColumn[] = [
  {
    // Entity and sub-unit identify a designation together. Keep both in one
    // column, with space for the entity name above its sub-unit.
    id: 'entity',
    label: 'Entity',
    min: 240,
    grow: 40,
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
