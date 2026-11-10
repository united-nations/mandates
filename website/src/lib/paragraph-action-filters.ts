/** Action speech-act taxonomy, separate from what the mandated activity produces. */
export interface ActionAnnotation {
  action_verb?: string | null
  action_verb_normalized?: string | null
  action_verb_type?: string | null
}

export const actionVerbKey = (mandate: ActionAnnotation): string | null => {
  const verb = mandate.action_verb_normalized || mandate.action_verb
  return verb?.trim().toLowerCase() || null
}

export const actionCategoryKey = (mandate: ActionAnnotation): string =>
  mandate.action_verb_type?.trim().toLowerCase() || 'unclear'

/** Accept a whole category, a category/lemma leaf, or a legacy lemma selection. */
export function matchesActionFilter(
  mandate: ActionAnnotation,
  filter: string
): boolean {
  if (filter === 'all') return true
  const verb = actionVerbKey(mandate)
  if (!verb) return false
  const category = actionCategoryKey(mandate)
  return (
    filter === category || filter === `${category}:${verb}` || filter === verb
  )
}

export interface ActionParagraph {
  mandates?: ActionAnnotation[]
}

/** Count paragraphs once per category and once per category/lemma, never sum leaves. */
export function countActionHierarchy<T extends ActionParagraph>(
  paragraphs: readonly T[],
  include: (paragraph: T) => boolean = () => true
): {
  categories: Record<string, number>
  verbs: Record<string, Record<string, number>>
} {
  const categories: Record<string, number> = {}
  const verbs: Record<string, Record<string, number>> = {}
  for (const paragraph of paragraphs) {
    const seenCategories = new Set<string>()
    const seenVerbs = new Map<string, Set<string>>()
    for (const mandate of paragraph.mandates ?? []) {
      const verb = actionVerbKey(mandate)
      if (!verb) continue
      const category = actionCategoryKey(mandate)
      categories[category] ??= 0
      verbs[category] ??= {}
      verbs[category][verb] ??= 0
      seenCategories.add(category)
      const leaves = seenVerbs.get(category) ?? new Set<string>()
      leaves.add(verb)
      seenVerbs.set(category, leaves)
    }
    if (!include(paragraph)) continue
    for (const category of seenCategories) categories[category]++
    for (const [category, leaves] of seenVerbs) {
      for (const verb of leaves) verbs[category][verb]++
    }
  }
  return { categories, verbs }
}
