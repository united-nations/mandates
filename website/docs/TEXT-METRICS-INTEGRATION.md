# Text length and similarity columns

The main table offers **Word length** and **Text similarity** in the existing column picker, both disabled by default. Grouped rows describe the representative document, not a group total; expanded members show their own metrics when those columns are enabled. Compact mode continues to be the existing minimal document list (it has no column picker). The sidebar version history always shows both columns, with no charts.

Similarity and the external diff action are one link: a percentage with the compare icon, or **Compare** when a valid pair has text but no current score. Its accessible name identifies both symbols and the new tab. A dash is unavailable, distinct from zero. Collections, missing dates, duplicate symbols, tied current/predecessor dates and missing accepted text have no automatic compare action. The target is the immediate predecessor from the complete series, independent of list filters, grouping, pagination or the five initially shown sidebar rows.

## Metric contract and release gate

The persisted English `substantive-v1` / `unicode-word-v1` profile counts titles, opening formulae, headings, body paragraphs and tables, including annexes. It excludes frontmatter, footnotes, vote records, signatures and dividers. Similarity uses `token-levenshtein-v1`, not a claim about legal continuity or a percentage of unchanged mandates. The reading view may show footnotes that are outside the metric profile.

The server batches visible documents and grouped members in one query. Word metrics require `document_files.status = parsed`, the same parser version as `document_parses`, and computation at or after that parse. Similarity additionally requires both eligible text hashes to equal the stored comparison inputs, a `ready` comparison, and current series identity, dates and predecessor. No metric is calculated in the browser and no stale fallback is used.

The timestamp gate is deliberately conservative. The current Documents metric upsert does not refresh `computed_at` after an identical reparse. Such a document remains unavailable here until the pipeline can record revalidation against that parse (or a separately reviewed provenance scheme replaces this gate). Do not weaken the gate merely to fill the UI. Parsed status itself is not independent proof of source fidelity: corpus recovery and verification remain prerequisites for release claims.

Tables already exist in the inspected Mandates database. This change adds no migration, schema change, refresh job, backfill or production write. Environments without the metric tables/read grants must receive the previously prepared Documents/Mandates schema changes before release. The old similarity backfill and workflow are not copied in this UI change; pipeline owners must reconcile/recover them separately.

Neither optional column is sortable yet. Sorting only a retrieved page would be misleading; global sorting needs the same eligibility predicate applied before pagination. Existing sort behavior remains unchanged.

The repository has no locale catalogs; its English copy is inline. Existing shared table primitives and document-detail structure are reused; this change does not migrate the sidebar to the newer `ui/` package components.

## Checks

- `node --test src/lib/text-analytics.test.ts src/lib/paragraph-presentation.test.ts`
- `node --env-file=/home/agent/mandates/.env --test src/lib/data/text-metrics.integration.test.ts` on Codebox: 14 independently constructed CTE-only cases, within a read-only transaction; no fixture tables or production writes. Without `DATABASE_URL`, this one integration test explicitly skips.
- `tsc --noEmit`; focused ESLint on touched files.

The SQL scenarios cover valid and zero values, failed status, stale timestamp, parser mismatch, each stale content hash, the wrong predecessor, changed dates, tied dates, an undated member, collections, missing predecessor text and a pending score. Only the latest symbol is requested from each three-member series, so computing a predecessor from filtered rows cannot pass.
