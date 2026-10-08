import { addDays } from './dates'

export function computeStreak(checkinDates: string[], decidedAtIso: string, today: string): number {
  const anchor = decidedAtIso.slice(0, 10)
  const set = new Set(checkinDates.filter(d => d >= anchor))
  let cursor = set.has(today) ? today : addDays(today, -1)
  if (!set.has(cursor)) return 0
  let streak = 0
  while (set.has(cursor)) { streak++; cursor = addDays(cursor, -1) }
  return streak
}
