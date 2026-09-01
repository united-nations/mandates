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

// ===========================================================================
// Marking — where a term occurs in a paragraph's own text
// ===========================================================================

/**
 * Marking does not go through the fold, and the reason is the whole design.
 *
 * `searchFold` answers "does this paragraph match", and it answers it by
 * rewriting the text: deleting invisible characters, collapsing runs of
 * whitespace, trimming the ends. So an offset into the folded string does not
 * address the same character in the raw one, and the drift between them varies
 * along the string. Turning a folded offset back into a raw one would mean
 * carrying an index map through every fold stage.
 *
 * Instead each term is compiled into a pattern that tolerates the spellings
 * the fold tolerates, and that pattern is run against the raw text. Nothing is
 * rewritten and nothing changes length, so a match position addresses the raw
 * string directly and there is no map to carry.
 *
 * The pattern is allowed to find nothing. A paragraph that matched the filter
 * but yields no ranges renders unmarked, which is exactly what it did before
 * any of this existed — the safe direction, and the reason no index map is
 * needed.
 *
 * These sets answer the fold stage by stage and have to be read beside it. The
 * fold substitutes one spelling for another; this alternates over both, which
 * is why they are spelled out separately rather than shared.
 */

/** Straight and curly apostrophes — foldBeforeTokenize makes these equal. */
const MARK_APOSTROPHES = "'\u2018\u2019"

/** Straight and curly double quotes — same stage. */
const MARK_DOUBLE_QUOTES = '"\u201C\u201D'

/**
 * Dashes — foldDashes makes these equal. All five spellings, not the three
 * that are easy to name: U+2010 hyphen and U+2011 non-breaking hyphen are
 * indistinguishable from an ASCII hyphen in an editor and both occur in this
 * corpus, and the registry's own vocabulary is hyphenated throughout
 * (Secretary-General, capacity-building, follow-up). ASCII hyphen leads the
 * class so it needs no escape.
 */
const MARK_DASHES = '-\u2010\u2011\u2013\u2014'

/**
 * Invisible characters a term may be interrupted by. Line-break hyphenation in
 * scanned text splits a word mid-token, so "development" has to find
 * "devel<soft hyphen>opment". Wider than the two the fold deletes: the fold
 * removes U+00AD and U+200B only, so a term interrupted by a zero-width
 * joiner is marked here but was not what made the paragraph match. That
 * direction is harmless — it can only mark a further occurrence of a term the
 * reader typed, in a paragraph that already matched — but it is an asymmetry,
 * not a coincidence.
 */
const MARK_INVISIBLES = '\u00AD\u200B\u200C\u200D\uFEFF'

/** Characters that would otherwise be read as regex syntax. */
const REGEX_METACHARACTERS = /[.*+?^${}()|[\]\\]/g

/** A half-open range of a string, in characters: [start, end). */
export interface MarkRange {
  start: number
  end: number
}

/**
 * Compiled patterns for the terms that should be marked. Held as an opaque
 * value so pattern construction stays in this module, which is the one under
 * test; the component compiles once per query and passes this back in.
 */
export interface SearchMarker {
  readonly patterns: readonly RegExp[]
}

/**
 * Compile the terms that mark. Excluded terms are dropped: an excluded term's
 * *absence* is why the paragraph matched, so there is nothing of it to mark.
 * A query of nothing but exclusions therefore compiles to no patterns and
 * marks nothing, which is correct rather than a special case.
 *
 * Terms are expected to come from parseSearchQuery, which never emits an empty
 * one.
 */
export function compileSearchMarker(terms: SearchTerm[]): SearchMarker {
  return {
    patterns: terms
      .filter(({ exclude }) => !exclude)
      .map(({ term }) => termToPattern(term)),
  }
}

/**
 * Build one term's pattern. Every character of the term becomes a required
 * element, so the pattern can never match the empty string; between each pair
 * of them any number of invisible characters may intervene. The `i` flag is
 * the case fold, and it is the whole of it — nothing is lowercased, which is
 * what keeps the match position addressing the raw string.
 */
function termToPattern(term: string): RegExp {
  const parts: string[] = []
  let i = 0
  while (i < term.length) {
    const char = term[i]
    if (/\s/.test(char)) {
      // A space in a term is a word boundary the fold already collapsed; in
      // the raw text it may still be a run, a line break or a non-breaking
      // space. Only multi-word phrases reach this.
      while (i < term.length && /\s/.test(term[i])) i++
      parts.push('\\s+')
      continue
    }
    if (MARK_APOSTROPHES.includes(char)) parts.push(`[${MARK_APOSTROPHES}]`)
    else if (MARK_DOUBLE_QUOTES.includes(char))
      parts.push(`[${MARK_DOUBLE_QUOTES}]`)
    else if (MARK_DASHES.includes(char)) parts.push(`[${MARK_DASHES}]`)
    else parts.push(char.replace(REGEX_METACHARACTERS, '\\$&'))
    i++
  }
  return new RegExp(parts.join(`[${MARK_INVISIBLES}]*`), 'gi')
}

/**
 * Every range of `text` covered by a marked term, merged and in order.
 *
 * Ranges from different terms can land on the same characters — "report" and
 * "reporting" both cover the first six — so they are merged before returning:
 * the caller slices straight through the list and would otherwise emit those
 * characters twice.
 */
export function findMarkRanges(
  text: string,
  marker: SearchMarker
): MarkRange[] {
  const found: MarkRange[] = []
  for (const pattern of marker.patterns) {
    // matchAll copies lastIndex rather than advancing the pattern's own, so a
    // compiled marker is safe to run against one segment after another.
    for (const match of text.matchAll(pattern)) {
      found.push({ start: match.index, end: match.index + match[0].length })
    }
  }
  if (found.length < 2) return found

  found.sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: MarkRange[] = [{ ...found[0] }]
  for (const range of found.slice(1)) {
    const last = merged[merged.length - 1]
    if (range.start <= last.end) last.end = Math.max(last.end, range.end)
    else merged.push({ ...range })
  }
  return merged
}
