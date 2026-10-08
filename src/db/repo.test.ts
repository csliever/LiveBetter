import { expect, beforeEach, test } from 'vitest'
import { db } from './db'
import * as repo from './repo'

beforeEach(async () => { await db.delete(); await db.open() })
test('决策写入行；无行 = 未评估', async () => {
  await repo.decideTodo('05-01')
  const rows = await repo.getAllUserEntries()
  expect(rows).toHaveLength(1)
  expect(rows[0].status).toBe('todo')
  expect(rows[0].decidedAt).toBeTruthy()
})

test('complete → done 带 doneAt；undoComplete 回 todo 且无 doneAt', async () => {
  await repo.decideTodo('05-01')
  await repo.completeEntry('05-01')
  let row = (await repo.getAllUserEntries())[0]
  expect(row.status).toBe('done'); expect(row.doneAt).toBeTruthy()
  await repo.undoComplete('05-01')
  row = (await repo.getAllUserEntries())[0]
  expect(row.status).toBe('todo'); expect(row.doneAt).toBeUndefined()
})

test('deleteEntry 删行但保留 CheckIn（ADR-0002）', async () => {
  await repo.decideHabit('05-01')
  await repo.toggleCheckIn('05-01', '2026-10-08')
  await repo.deleteEntry('05-01')
  expect(await repo.getAllUserEntries()).toHaveLength(0)
  expect(await repo.getCheckInDates('05-01')).toEqual(['2026-10-08'])
})

test('convertTo 互转且收藏不丢', async () => {
  await repo.decideTodo('05-01')
  await repo.setFavorite('05-01', true)
  await repo.convertTo('05-01', 'habit')
  const row = (await repo.getAllUserEntries())[0]
  expect(row.status).toBe('habit')
  expect(await repo.getFavoriteIds()).toEqual(new Set(['05-01']))
})

test('未评估条目也能收藏（独立表）', async () => {
  await repo.setFavorite('01-01', true)
  expect(await repo.getAllUserEntries()).toHaveLength(0)
  expect(await repo.getFavoriteIds()).toEqual(new Set(['01-01']))
})

test('toggleCheckIn 只对 habit 生效，再点一次取消', async () => {
  await repo.decideTodo('05-01')
  await expect(repo.toggleCheckIn('05-01', '2026-10-08')).rejects.toThrow('not a habit')
  await repo.decideHabit('05-02')
  await repo.toggleCheckIn('05-02', '2026-10-08')
  expect(await repo.getCheckInDates('05-02')).toEqual(['2026-10-08'])
  await repo.toggleCheckIn('05-02', '2026-10-08')
  expect(await repo.getCheckInDates('05-02')).toEqual([])
})

test('restore = 删行', async () => {
  await repo.rejectEntry('05-01')
  await repo.restoreEntry('05-01')
  expect(await repo.getAllUserEntries()).toHaveLength(0)
})

test('export → 清库 → import 往返（含收藏与打卡）', async () => {
  await repo.decideHabit('05-01')
  await repo.toggleCheckIn('05-01', '2026-10-08')
  await repo.setFavorite('01-01', true)
  await repo.setDailyRead('2026-10-08', '01-01')
  const backup = await repo.exportData()
  await db.delete(); await db.open()
  await repo.importData(backup)
  expect(await repo.getCheckInDates('05-01')).toEqual(['2026-10-08'])
  expect(await repo.getFavoriteIds()).toEqual(new Set(['01-01']))
  expect((await repo.getDailyRead('2026-10-08'))?.entryId).toBe('01-01')
})

test('getRecentDailyReadIds 只含近 N 天', async () => {
  await repo.setDailyRead('2026-10-01', '01-01')
  await repo.setDailyRead('2026-10-07', '01-02')
  await repo.setDailyRead('2026-10-08', '01-03')
  const ids = await repo.getRecentDailyReadIds(2)
  expect([...ids].sort()).toEqual(['01-02', '01-03'])
})
