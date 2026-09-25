import type { Paragraph } from '../types/index.ts'

/** Match explicit document-wide source IDs, never infer links from citation text. */
export function attachFootnotes(rows: Paragraph[]): Paragraph[] {
  const notes = rows.filter((row) => row.type === 'footnote')
  const attached = new Set<Paragraph>()
  const result = rows.map((row) => {
    if (!['paragraph', 'heading'].includes(row.type)) return row
    const footnotes = notes.filter((note) =>
      note.note_ids?.some((id) => row.note_ids?.includes(id))
    )
    footnotes.forEach((note) => attached.add(note))
    return footnotes.length ? { ...row, footnotes } : row
  })
  // Unreferenced notes remain visible; missing references must never lose text.
  return result.filter((row) => !attached.has(row))
}

/** Map indices in annotation markup back to unchanged paragraph text (UTF-16). */
export function plainTextOffsets(
  text: string,
  marked: string
): number[] | null {
  if (text === marked)
    return Array.from({ length: text.length + 1 }, (_, i) => i)
  const delimiters = /\*|<<|>>|\[\[|\]\]|\{\{|\}\}/g
  const offsets: number[] = []
  let sourceIndex = 0
  let plainIndex = 0
  let restored = ''
  for (const match of marked.matchAll(delimiters)) {
    while (sourceIndex < match.index) {
      offsets[sourceIndex] = plainIndex++
      restored += marked[sourceIndex++]
    }
    for (let i = 0; i < match[0].length; i++)
      offsets[sourceIndex++] = plainIndex
  }
  while (sourceIndex < marked.length) {
    offsets[sourceIndex] = plainIndex++
    restored += marked[sourceIndex++]
  }
  offsets[sourceIndex] = plainIndex
  // Never position notes against a rewritten or inconsistent annotated copy.
  return restored === text ? offsets : null
}
