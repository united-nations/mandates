/**
 * Hardcoded feature flags.
 *
 * These are deliberately plain constants, not environment variables: they gate
 * finished features that are being held back from the UI, so the code stays
 * compiled, typechecked and reviewable. Flip a flag to `true` to bring the
 * feature back — nothing else should need changing.
 */

/**
 * The "Related mandate documents" list on the mandate detail view: other
 * documents ranked by rarity-weighted shared topics.
 *
 * Held back because the ranking is still experimental. Note the underlying
 * query (lib/data/related.ts) also has a known defect while this is off — it
 * joins digitallibrary.resolution_series on raw rather than normalised
 * symbols, so its "latest version only" filter leaks and its own-series
 * exclusion is inert for some documents. Fix that before flipping this on.
 */
export const SHOW_RELATED_MANDATES: boolean = false

/**
 * The five-point rating of how openly each organization's mandates can be
 * traced, on /system: the per-organization dots and the legend explaining
 * them.
 *
 * Held back because the scoring is a judgement call we are not ready to
 * publish. With it off, the column keeps the organizations' own registry and
 * portal links and is headed "Related resources" instead of "Mandate
 * Registry", and the rating vocabulary is suppressed with it.
 */
export const SHOW_MANDATE_REGISTRY_RATING: boolean = false

/**
 * The "reports submitted under this mandate" list on the mandate detail view:
 * Secretary-General reports whose Digital Library catalogue notes cite the
 * page's resolution as mandating them (lib/data/sg-report-links.ts).
 *
 * On by default; the flag exists so the block can be withdrawn without a
 * revert. When off, the query is skipped entirely, not run and discarded.
 */
export const SHOW_MANDATED_SG_REPORTS: boolean = true
