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
 * cleared the designation, who submitted it and when, lead or shared, scope,
 * and the supersession record. None of them is read by the query behind this
 * table (see `lib/data/focal-points.ts`), so the cut is made where the data is
 * fetched, not hidden here at the point of rendering.
 *
 * The table runs `table-layout: fixed`, so `width` binds exactly rather than
 * being a hint the browser may overrule from cell content. One column declares
 * `flexible` and absorbs the surplus.
 *
 * The widths sum to 1016px with the entity class column in, and to 916px
 * without it (the column is present only while SHOW_ENTITY_CLASSIFICATION is
 * on; off, its 100px goes to the flexible column as surplus). This page uses
 * the shared centred main column rather than the full-bleed treatment the
 * mandate explorer opts into, so what the table has to work with is that
 * column's content box, not the window:
 *
 *   `mx-auto w-full max-w-4xl px-8 sm:px-12 lg:max-w-6xl lg:px-16`
 *
 * At and above 1152px of viewport the `max-w-6xl` cap binds and the content box
 * is a constant 1152 − 128 = 1024px, so the table fits with 8px to spare. Below
 * 1152 the cap is not reached and the container is the viewport itself, so the
 * content box is `viewport − 128` and shrinks with it: 896px at a 1024px
 * viewport. The table therefore fits from about a 1144px viewport upward
 * (1144 − 128 = 1016) and scrolls horizontally below that, with the detail rail
 * pinned — the mandate table's behaviour too.
 *
 * So there IS a band, roughly 1024px to 1143px of viewport, where the `lg`
 * layout is in force but the table still scrolls. That is known and is left as
 * it is; closing it means retuning every width down to 896px, which is a
 * separate decision from what each column needs.
 *
 * The class column was admitted by taking its 100px off five neighbours rather
 * than by widening the table past the content box, which would have made it
 * scroll at every viewport: sub-unit 146 to 126, focal points 200 to 180,
 * functional mailbox 196 to 174, languages 92 to 80, coverage's floor 146 to
 * 120. Each cut is noted on the column it was taken from.
 */

import { SHOW_ENTITY_CLASSIFICATION } from '@/lib/feature-flags'

export interface DirectorySummaryColumn {
  id: string
  label: string
  /** Exact column width in px under table-fixed; a floor on the flexible column. */
  width: number
  /**
   * The one column that absorbs whatever the table has over its minimum. Only
   * coverage is flexible: it is the column whose content has no upper bound and
   * the only one that gains from being wider.
   */
  flexible?: true
  align?: 'left' | 'right' | 'center'
}

/**
 * What kind of body the entity is, as the focal points application classified
 * it and publishes it through the view this site reads. Beside the entity,
 * because it is a fact about the entity and not about the designation. An
 * entity the roster does not know, or one the view does not carry, has no
 * class and the cell shows the same dash the other absences show.
 *
 * 100px holds the longest label, "Specialized agency or related organization",
 * on three lines at the caption size the cell uses.
 */
const ENTITY_CLASS_COLUMN: DirectorySummaryColumn = {
  id: 'entity_class',
  label: 'Entity class',
  width: 100,
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
    // 180px is sized for the name, not the code: median display name is 42
    // characters, which wraps to two lines here. The cell clamps at two.
    id: 'entity',
    label: 'Entity',
    width: 180,
    align: 'left',
  },
  ...(SHOW_ENTITY_CLASSIFICATION ? [ENTITY_CLASS_COLUMN] : []),
  {
    // "DPPA" does not route a query and "DPPA, Middle East Division" does —
    // which is the reason the underlying column is required. It is the closest
    // thing a designation has to a name, so it carries the row. 126 rather
    // than 146: a sub-unit name wraps in either, and the 20px went to the
    // class column.
    id: 'sub_unit',
    label: 'Sub-unit',
    width: 126,
    align: 'left',
  },
  {
    // Name, title and address stay in one cell per person. Split across three
    // columns they line up only by position, which breaks the moment a
    // designation names two people — and it may: a large division can name two
    // equal primaries, and alternates are rows rather than a fixed pair. 180
    // rather than 200: the name and the title truncate, the address already
    // did; 20px went to the class column.
    id: 'people',
    label: 'Focal points',
    width: 180,
    align: 'left',
  },
  {
    // 174 rather than 196: the address truncates a little earlier; 22px went
    // to the class column.
    id: 'functional_mailbox',
    label: 'Functional mailbox',
    width: 174,
    align: 'left',
  },
  {
    // Codes as given on the form. Not a controlled vocabulary upstream, so this
    // shows what was entered. 80 rather than 92 holds three codes and their
    // separators; 12px went to the class column.
    id: 'languages',
    label: 'Languages',
    width: 80,
    align: 'left',
  },
  {
    // The summary form: how many claims of each kind. The claims themselves are
    // in the panel, in full — a cell cannot hold seven keywords without
    // becoming the row. The floor is 120 rather than 146, 26px having gone to
    // the class column; at the capped content box it still gets the 8px
    // surplus, and "1 document symbol" fits on one line at 128.
    id: 'coverage',
    label: 'Coverage',
    width: 120,
    flexible: true,
    align: 'left',
  },
  {
    // Pinned right. The visible affordance for the row click, not a control of
    // its own — see the `detail` case in DirectorySummaryTable.
    id: 'detail',
    label: '',
    width: 56,
    align: 'center',
  },
]

/**
 * The table's minimum width: every column's declared width, with the flexible
 * one contributing its floor. Below this the table scrolls horizontally rather
 * than compressing columns past the widths above.
 */
export function directorySummaryMinWidth(
  columns: DirectorySummaryColumn[]
): number {
  return columns.reduce((total, column) => total + column.width, 0)
}
