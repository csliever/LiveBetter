import { db, type CheckIn, type DailyRead, type Favorite, type Status, type UserEntry } from './db'

export interface Backup { userEntries: UserEntry[]; checkIns: CheckIn[]; dailyReads: DailyRead[]; favorites: Favorite[] }

const now = () => new Date().toISOString()

async function putDecision(entryId: string, status: Status): Promise<void> {
  await db.userEntries.put({ id: entryId, status, decidedAt: now() }) // 整行替换；收藏在独立表，天然保留
}

export const decideTodo = (id: string) => putDecision(id, 'todo')
export const decideHabit = (id: string) => putDecision(id, 'habit')
export const rejectEntry = (id: string) => putDecision(id, 'rejected')
export const convertTo = (id: string, status: 'todo' | 'habit') => putDecision(id, status)
export const restoreEntry = (id: string) => db.userEntries.delete(id)
export const deleteEntry = (id: string) => db.userEntries.delete(id) // CheckIn 保留（ADR-0002）

export async function completeEntry(id: string): Promise<void> {
  const prev = await db.userEntries.get(id)
  if (!prev) return
  await db.userEntries.put({ ...prev, status: 'done', doneAt: now() })
}

export async function undoComplete(id: string): Promise<void> {
  const prev = await db.userEntries.get(id)
  if (!prev) return
  const { doneAt: _drop, ...rest } = prev
  await db.userEntries.put({ ...rest, status: 'todo' })
}

export async function setFavorite(entryId: string, on: boolean): Promise<void> {
  if (on) await db.favorites.put({ entryId, addedAt: now() })
  else await db.favorites.delete(entryId)
}

export async function getFavoriteIds(): Promise<Set<string>> {
  return new Set((await db.favorites.toArray()).map(f => f.entryId))
}

export async function toggleCheckIn(entryId: string, date: string): Promise<void> {
  const row = await db.userEntries.get(entryId)
  if (row?.status !== 'habit') throw new Error('not a habit')
  const id = `${entryId}:${date}`
  if (await db.checkIns.get(id)) await db.checkIns.delete(id)
  else await db.checkIns.put({ id, entryId, date })
}

export async function getCheckInDates(entryId: string): Promise<string[]> {
  return (await db.checkIns.where('entryId').equals(entryId).toArray()).map(c => c.date).sort()
}

export const getUserEntriesByStatus = (status: Status) => db.userEntries.where('status').equals(status).toArray()
export const getAllUserEntries = () => db.userEntries.toArray()

export async function getRecentDailyReadIds(days: number): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10)
  const rows = await db.dailyReads.where('date').aboveOrEqual(since).toArray()
  return new Set(rows.map(r => r.entryId))
}

export const getDailyRead = (date: string) => db.dailyReads.get(date)
export const setDailyRead = (date: string, entryId: string) => db.dailyReads.put({ date, entryId })

export async function exportData(): Promise<Backup> {
  return {
    userEntries: await db.userEntries.toArray(),
    checkIns: await db.checkIns.toArray(),
    dailyReads: await db.dailyReads.toArray(),
    favorites: await db.favorites.toArray(),
  }
}

export async function importData(b: Backup): Promise<void> {
  await db.transaction('rw', [db.userEntries, db.checkIns, db.dailyReads, db.favorites], async () => {
    await db.userEntries.bulkPut(b.userEntries ?? [])
    await db.checkIns.bulkPut(b.checkIns ?? [])
    await db.dailyReads.bulkPut(b.dailyReads ?? [])
    await db.favorites.bulkPut(b.favorites ?? [])
  })
}
