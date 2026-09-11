/**
 * The search query grammar, translated to SQL for the documents table.
 *
 * The paragraph search matches in JavaScript: fold the text, fold the query,
 * then `includes`. The documents table matches in Postgres, over the same
 * three conventions (terms ANDed, quoted phrases, leading-minus exclusion),
 * so this module is the SQL half of that one grammar: the parser in
 * `search-query.ts` produces the terms, and this turns them into a predicate
 * whose folds are the JavaScript ones spelled in SQL.
 *
 * A term is literal text, never a pattern. It travels as a bound parameter
 * with LIKE's own metacharacters escaped, so a reader searching "50%" finds
 * "50%" and nothing else.
 */
import type { SearchTerm } from '#lib/search-query'

/**
 * `searchFold` in SQL, for one text expression. Stage by stage it is the
 * JavaScript fold: lower-case; delete the two invisible characters (soft
 * hyphen, zero-width space); map curly quotes and apostrophes to their
 * straight forms and the four dash spellings to a hyphen; collapse whitespace
 * to single spaces; trim. Every mapping is a single character to a single
 * character, so the order the stages run in cannot change the result and
 * the split the JavaScript side makes around tokenizing has no counterpart
 * here — the text being folded is never a query.
 *
 * Two whitespace forms are mapped by hand rather than left to `\s`: the
 * no-break space and its narrow form. JavaScript's `\s` includes both, but
 * whether Postgres's does depends on the database's locale, and the no-break
 * space is the one that occurs in this corpus ("Rule 32"). The rest of the
 * Unicode space family is counted at zero there and is not mapped, which is
 * the one place the two folds are allowed to differ.
 *
 * The escapes are E'' strings: `\u` in an E'' literal is the code point, so
 * the characters that are invisible or indistinguishable in an editor are
 * named rather than typed.
 */
export function searchFoldSql(expr: string): string {
  // Ten characters map to ten: two apostrophes, two double quotes, four
  // dashes, two spaces.
  const mapped = `translate(${characterFoldSql(expr)}, E'\\u2018\\u2019\\u201C\\u201D\\u2010\\u2011\\u2013\\u2014\\u00A0\\u202F', E'\\'\\'""----  ')`
  return `btrim(regexp_replace(${mapped}, '\\s+', ' ', 'g'))`
}

/**
 * The fold for a term with no whitespace in it: every stage of `searchFoldSql`
 * except the whitespace ones, which cannot change the answer for such a term.
 *
 * The argument: the whitespace stages only replace, collapse or trim runs of
 * whitespace characters, and never touch a character outside that class or
 * put one in. So the maximal runs of non-whitespace text are the same before
 * and after, character for character and in the same order. A term with no
 * whitespace in it cannot straddle a whitespace run, so it is a substring of
 * some non-whitespace run or of nothing — and that is the same run either way.
 * The term side is safe too: the parser has already collapsed every kind of
 * whitespace in the query to a single space, so a term without a space holds
 * no no-break space or any other member of the class.
 *
 * This is the cheap fold, and it is used for every term except a quoted
 * phrase: the regexp is the expensive stage, and it runs per row, per field,
 * per term.
 */
export function termFoldSql(expr: string): string {
  // Eight characters map to eight: two apostrophes, two double quotes, four
  // dashes.
  return `translate(${characterFoldSql(expr)}, E'\\u2018\\u2019\\u201C\\u201D\\u2010\\u2011\\u2013\\u2014', E'\\'\\'""----')`
}

/** The stages before any character mapping: lower-case, delete invisibles. */
function characterFoldSql(expr: string): string {
  return `replace(replace(LOWER(${expr}), E'\\u00AD', ''), E'\\u200B', '')`
}

/**
 * A term as a LIKE pattern: the folded text with LIKE's three metacharacters
 * escaped (its default escape character is the backslash), wrapped for a
 * substring match. Bound as a parameter, never interpolated.
 */
export function likePattern(term: string): string {
  return `%${escapeLike(term)}%`
}

/** The same term anchored at the start: what "the symbol begins with it" asks. */
export function likePrefixPattern(term: string): string {
  return `${escapeLike(term)}%`
}

function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&')
}

/**
 * Case fold only: `LOWER`. For a field counted as carrying none of the
 * characters the full fold maps — where the full fold would give the same
 * answer at several times the cost, since every stage runs per row, per
 * field, per term with no index to lean on.
 */
export function caseFoldSql(expr: string): string {
  return `LOWER(${expr})`
}

/**
 * One field the search reads. `array` marks a text[] column, matched if any
 * element does; a positive term matches a row if it appears in any field,
 * and an excluded term rejects the row if it appears in any field.
 *
 * `fold` is chosen per field from what the field's text was counted to
 * contain: `text` is the full fold, `case` is `LOWER` alone. There is no
 * default — the choice is the evidence, and it belongs at the call site.
 */
export interface SearchField {
  expr: string
  fold: 'text' | 'case'
  array?: true
}

/**
 * The fold for one field under one term. A `text` field takes the full fold
 * only when the term is a phrase — the one kind of term that can contain a
 * space — and the cheaper term fold otherwise; see `termFoldSql` for why
 * the two cannot disagree on such a term.
 */
function foldFor(field: SearchField, term: string): (expr: string) => string {
  if (field.fold === 'case') return caseFoldSql
  return term.includes(' ') ? searchFoldSql : termFoldSql
}

/**
 * The WHERE fragment for a parsed query, or null for a query with no terms —
 * whitespace, a bare minus, an empty quote pair — which is no search at all,
 * exactly as the paragraph field treats it. Parameters are numbered from
 * `firstParamIndex` and returned in order for the caller to append; the
 * caller owns the parameter list, so numbering is its call.
 */
export function buildSearchPredicate(
  terms: SearchTerm[],
  fields: SearchField[],
  firstParamIndex: number
): { clause: string | null; params: string[] } {
  if (terms.length === 0) return { clause: null, params: [] }

  const params: string[] = []
  const groups = terms.map(({ term, exclude }) => {
    const placeholder = `$${firstParamIndex + params.length}`
    params.push(likePattern(term))
    // Every field is read through COALESCE: a NULL field under an excluded
    // term would make the group `NOT (false OR NULL)`, which is NULL, which
    // WHERE reads as false — so a document with no description would vanish
    // from every negative query. The array field's EXISTS is never NULL.
    const anyField = fields
      .map((field) => {
        const fold = foldFor(field, term)
        return field.array
          ? `EXISTS (SELECT 1 FROM UNNEST(COALESCE(${field.expr}, '{}'::text[])) AS element(value) WHERE ${fold('element.value')} LIKE ${placeholder})`
          : `${fold(`COALESCE(${field.expr}, '')`)} LIKE ${placeholder}`
      })
      .join(' OR ')
    return exclude ? `NOT (${anyField})` : `(${anyField})`
  })

  return { clause: `(${groups.join(' AND ')})`, params }
}
