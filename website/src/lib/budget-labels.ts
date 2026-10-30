/** Preserve unnumbered source labels; separate only an explicit numbered prefix. */
export function splitSubprogrammeLabel(
  label: string | null,
  number: number | null
) {
  if (!label) return { number: null, title: null }
  const title =
    number === null
      ? label
      : label.replace(/^Subprogramme\s+\d+\s*[.:–—-]?\s*/i, '').trim()
  return { number, title: title || null }
}
