import type { ContentEntry } from '../content/types'

export function filterEntries(entries: ContentEntry[], query: string): ContentEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(e => `${e.title}\n${e.plainSpeak}\n${e.benefit}`.toLowerCase().includes(q))
}
