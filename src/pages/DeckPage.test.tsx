import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { swipeAction, DeckPage } from './DeckPage'
import { db } from '../db/db'
import * as repo from '../db/repo'

vi.mock('../content/book', () => ({
  book: {
    version: 't',
    sections: [{ id: '01', title: '不要早死' }, { id: '02', title: '第二节' }],
    entries: [
      { id: '01-01', sectionId: '01', title: '戒烟', cost: 'c', plainSpeak: 'p1', benefit: 'b', evidenceGrade: 'A', source: 's', note: '', meta: null },
      { id: '01-02', sectionId: '01', title: '运动', cost: 'c', plainSpeak: 'p2', benefit: 'b', evidenceGrade: 'B', source: 's', note: '', meta: null },
      { id: '02-01', sectionId: '02', title: '写遗嘱', cost: 'c', plainSpeak: 'p3', benefit: 'b', evidenceGrade: 'C', source: 's', note: '', meta: null },
    ],
  },
}))

beforeEach(async () => { await db.delete(); await db.open() })

test('swipeAction 阈值边界', () => {
  expect(swipeAction(-80)).toBe('left')
  expect(swipeAction(80)).toBe('right')
  expect(swipeAction(-79)).toBeNull()
  expect(swipeAction(79)).toBeNull()
  expect(swipeAction(0)).toBeNull()
})
test('按书序出卡：做 → 弹层 → 做一次 → 下一张 + 行状态 todo', async () => {
  render(<DeckPage onOpenEntry={() => {}} />)
  await screen.findByText('每日一读')
  expect(screen.getByText('戒烟')).toBeTruthy()
  fireEvent.click(screen.getByText('做', { selector: 'button' }))
  fireEvent.click(await screen.findByText('做一次（进清单）'))
  expect(await screen.findByText('运动')).toBeTruthy()
  expect((await repo.getAllUserEntries())[0]).toMatchObject({ id: '01-01', status: 'todo' })
})

test('不做 → rejected → 下一张', async () => {
  render(<DeckPage onOpenEntry={() => {}} />)
  await screen.findByText('每日一读')
  fireEvent.click(screen.getByText('不做'))
  expect(await screen.findByText('运动')).toBeTruthy()
  expect((await repo.getUserEntriesByStatus('rejected')).map(r => r.id)).toEqual(['01-01'])
})

test('全部评估完 → 空状态', async () => {
  await repo.decideTodo('01-01'); await repo.decideHabit('01-02'); await repo.rejectEntry('02-01')
  render(<DeckPage onOpenEntry={() => {}} />)
  await screen.findByText('每日一读')
  expect(await screen.findByText(/全部评估完了/)).toBeTruthy()
})

test('每日一读卡片渲染', async () => {
  render(<DeckPage onOpenEntry={() => {}} />)
  expect(await screen.findByText('每日一读')).toBeTruthy()
})
