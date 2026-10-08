import Dexie, { type Table } from 'dexie'

export type Status = 'todo' | 'habit' | 'done' | 'rejected'

export interface UserEntry { id: string; status: Status; decidedAt: string; doneAt?: string }
export interface Favorite { entryId: string; addedAt: string }
export interface CheckIn { id: string; entryId: string; date: string }
export interface DailyRead { date: string; entryId: string }

export class LiveBetterDB extends Dexie {
  userEntries!: Table<UserEntry, string>
  favorites!: Table<Favorite, string>
  checkIns!: Table<CheckIn, string>
  dailyReads!: Table<DailyRead, string>

  constructor(name = 'livebetter') {
    super(name)
    this.version(1).stores({
      userEntries: 'id, status',
      favorites: 'entryId',
      checkIns: 'id, entryId, date',
      dailyReads: 'date',
    })
  }
}

export const db = new LiveBetterDB()
