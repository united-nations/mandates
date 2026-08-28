/**
 * Query parsing and text folding for the paragraph search on the mandate
 * detail page. Pure string logic, kept out of ParagraphsSection so the Node
 * test runner can reach it (the component file is JSX and client-only).
 */
/** One parsed unit of the paragraph search: a folded term, required or excluded. */
export interface SearchTerm {
  term: string
  exclude: boolean
}

/**
 * The folds that run before a query is tokenized: case, invisible
 * characters, quotes, whitespace. Each answers occurrences counted in the
 * paragraph text itself — UN prose spells the same word more than one way
 * (curly and straight apostrophes coexist in the same corpus; "Rule 32" can
 * carry a non-breaking space) — and characters counted at zero there are
 * deliberately not handled. Quotes belong in this stage because phone
 * keyboards silently smarten `"` into curly quotes, and folding them before
 * tokenizing is what keeps phrase syntax working for those readers. Dashes
 * are deliberately deferred — see foldDashes.
 */
function foldBeforeTokenize(text: string): string {
  return (
    text
      .toLowerCase()
      // Soft hyphens (U+00AD) render as nothing and zero-width spaces
      // (U+200B) as no width, so the reader types the word without them:
      // deleted, never substituted for. Escapes, not literals — both
      // characters are invisible in source.
      .replace(/[\u00AD\u200B]/g, '')
      // Curly quotes and apostrophes -> their straight keyboard forms.
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      // \s covers NBSP and the thin-space family, and collapses doubles.
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/**
 * The dash fold, applied to each term only after the tokenizer has consumed
 * a leading exclusion minus. U+2010 hyphen, U+2011 non-breaking hyphen, en
 * dash, em dash — all four occur in the corpus; escapes because three of
 * them are indistinguishable from an ASCII hyphen in an editor. Folding the
 * dashes in with the hyphens trades a visible, dismissable false positive
 * for an invisible miss, and folding them this late is what stops a pasted
 * leading dash from reading as an operator (see parseSearchQuery).
 */
function foldDashes(text: string): string {
  return text.replace(/[\u2010\u2011\u2013\u2014]/g, '-')
}

/**
 * Comparable form for paragraph text: both fold stages. The query side runs
 * the same two stages, but split around tokenization — parseSearchQuery
 * says why the order matters there.
 */
export function searchFold(text: string): string {
  return foldDashes(foldBeforeTokenize(text))
}
/**
 * Parse a search query into terms ready to match. Three conventions, the
 * ones every search box has already taught readers: whitespace-separated
 * terms are all required; a double-quoted span is one exact phrase (an
 * unclosed quote runs to the end of the query, so a phrase narrows sensibly
 * while it is still being typed); a leading minus excludes its term or
 * phrase.
 *
 * The fold is split around tokenization, and the split carries the syntax
 * rules. Quotes fold before tokenizing: phone keyboards silently smarten
 * `"` into curly quotes, and folding first is what keeps phrase syntax
 * working for those readers. Dashes fold after, per term: no keyboard
 * smartens a leading minus, so deferring costs a typed query nothing, and
 * folding earlier would let an en dash pasted flush against a word read as
 * an exclusion the reader never typed. Both stages still apply inside
 * quoted phrases — quoting promises adjacency, not byte-identity, so
 * "follow-up" finds the non-breaking-hyphen spelling. A minus or a quote
 * pair with nothing behind it is not yet a term, and a term that folds to
 * a bare minus (a pasted dash standing between words) is separator
 * punctuation, not a word: both contribute nothing.
 */
export function parseSearchQuery(query: string): SearchTerm[] {
  const folded = foldBeforeTokenize(query)
  const terms: SearchTerm[] = []
  let i = 0
  while (i < folded.length) {
    // After the pre-tokenize fold, the only whitespace left is single
    // ASCII spaces.
    if (folded[i] === ' ') {
      i++
      continue
    }
    let exclude = false
    if (folded[i] === '-') {
      exclude = true
      i++
    }
    let term: string
    if (folded[i] === '"') {
      const close = folded.indexOf('"', i + 1)
      term = close === -1 ? folded.slice(i + 1) : folded.slice(i + 1, close)
      i = close === -1 ? folded.length : close + 1
    } else {
      const start = i
      while (i < folded.length && folded[i] !== ' ') i++
      term = folded.slice(start, i)
    }
    term = foldDashes(term.trim())
    if (term && term !== '-') terms.push({ term, exclude })
  }
  return terms
}

/** Whether one paragraph's text satisfies every parsed search term. */
export function matchesSearchTerms(text: string, terms: SearchTerm[]): boolean {
  const folded = searchFold(text)
  return terms.every(({ term, exclude }) =>
    exclude ? !folded.includes(term) : folded.includes(term)
  )
}
