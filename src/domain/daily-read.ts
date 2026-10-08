export function pickDailyRead(date: string, candidateIds: string[], fallbackIds: string[], recentReadIds: string[]): string {
  const recent = new Set(recentReadIds)
  let pool = candidateIds.filter(id => !recent.has(id))
  if (pool.length === 0) pool = candidateIds.length > 0 ? candidateIds : fallbackIds
  let h = 0
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
