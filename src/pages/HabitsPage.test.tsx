import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { HabitsPage } from './HabitsPage'
import { db } from '../db/db'
import * as repo from '../db/repo'
import { addDays, todayStr } from '../domain/dates'

vi.mock('../content/book', () => ({
  book: {
    version: 't',
    sections: [{ id: '01', title: '不要早死' }],
    entries: [
      { id: '01-01', sectionId: '01', title: '戒烟', cost: 'c', plainSpeak: 'p1', benefit: 'b', evidenceGrade: 'A', source: 's', note: '', meta: null },
    ],
  },
}))

beforeEach(async () => { await db.delete(); await db.open() })

test('显示习惯与连续天数；今日打卡切换', async () => {
  await db.userEntries.put({ id: '01-01', status: 'habit', decidedAt: new Date(Date.now() - 3 * 86400_000).toISOString() })
  const today = todayStr()
  await repo.toggleCheckIn('01-01', addDays(today, -1))
  render(<HabitsPage onOpenEntry={() => {}} />)
  expect(await screen.findByText('戒烟')).toBeTruthy()
  expect(await screen.findByText(/连续 1 天/)).toBeTruthy() // 今天未打，数到昨天（等 dates 加载）
  fireEvent.click(screen.getByLabelText('打卡 戒烟'))
  expect(await screen.findByText(/连续 2 天/)).toBeTruthy()
  expect((await repo.getCheckInDates('01-01'))).toHaveLength(2)
  fireEvent.click(screen.getByLabelText('打卡 戒烟'))
  expect(await screen.findByText(/连续 1 天/)).toBeTruthy() // 取消今天，回到昨天
})
