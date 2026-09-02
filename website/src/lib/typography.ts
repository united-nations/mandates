export const typography = {
  /** Page hero. One per page. The ceiling — see the principle above. */
  pageTitle: "text-4xl font-bold tracking-tight text-foreground",
  /** Standalone card titles — error pages, login, empty states. */
  cardTitle: "text-2xl font-semibold text-foreground",
  /** Primary content title and peer section headings. The workhorse heading. */
  sectionTitle: "text-xl font-semibold tracking-tight text-foreground",
  /** Sub-section / step titles. */
  subTitle: "text-base font-semibold text-foreground",
  /** Intro or lead paragraph sitting under a title. */
  lead: "text-lg text-foreground",
  /** Default body / paragraph text. */
  body: "text-sm leading-relaxed",
  /** Long-form prose pages (about, methodology). */
  prose: "text-base leading-relaxed text-foreground",
  /** Metadata rows — date, category, duration, counts. */
  meta: "text-sm text-muted-foreground",
  /** Small captions, timestamps, back-links. */
  caption: "text-xs text-muted-foreground",
  /** Inline form/control labels, button text, badge text. */
  label: "text-xs font-medium",
  /**
   * Eyebrow / overline — the small uppercase label above a heading or section.
   * Same case-and-tracking treatment as `tableHeader`, but it sits in prose
   * rather than a table, so it keeps the foreground colour.
   */
  eyebrow: "text-xs font-medium tracking-wider uppercase text-foreground",
  /**
   * Table column headers.
   *
   * Resolves the audit's clearest accidental divergence: transcripts and
   * mandates express this same design, but mandates hardcodes `text-gray-500`
   * instead of the semantic token — and housekeeping ships two different
   * treatments inside one codebase.
   */
  tableHeader:
    "text-xs font-medium tracking-wider text-muted-foreground uppercase",
  /**
   * Numeric cells and any figure that lines up in a column. Tabular figures
   * are not optional once digits stack vertically.
   */
  numeric: "text-sm tabular-nums",
  /**
   * The micro tier — 10px. Badges, dense table meta, chip labels.
   * Named so it stops being an arbitrary value in six separate repos.
   * Do not go below this: 9px failed legibility review.
   */
  micro: "text-micro font-medium",
} as const;

export type TypographyTier = keyof typeof typography;
