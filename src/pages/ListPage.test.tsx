import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { ListPage } from './ListPage'
import { db } from '../db/db'
import * as repo from '../db/repo'

vi.mock('../content/book', () => ({
  book: {
    version: 't',
    sections: [{ id: '01', title: '不要早死' }],
    entries: [
      { id: '01-01', sectionId: '01', title: '戒烟', cost: 'c', plainSpeak: 'p1', benefit: 'b', evidenceGrade: 'A', source: 's', note: '', meta: null },
      { id: '01-02', sectionId: '01', title: '运动', cost: 'c', plainSpeak: 'p2', benefit: 'b', evidenceGrade: 'B', source: 's', note: '', meta: null },
    ],
  },
}))

beforeEach(async () => { await db.delete(); await db.open() })

test('待做列表打勾 → done 进折叠区，撤销回来', async () => {
  await repo.decideTodo('01-01')
  render(<ListPage onOpenEntry={() => {}} />)
  fireEvent.click(await screen.findByLabelText('完成 戒烟'))
  expect(await screen.findByText('已完成（1）')).toBeTruthy()
  expect((await repo.getAllUserEntries())[0].status).toBe('done')
  fireEvent.click(screen.getByLabelText('撤销 戒烟'))
  expect(await screen.findByText('已完成（0）')).toBeTruthy()
  expect((await repo.getAllUserEntries())[0].status).toBe('todo')
})

test('删除 → 回未评估（无行）', async () => {
  await repo.decideTodo('01-02')
  render(<ListPage onOpenEntry={() => {}} />)
  fireEvent.click(await screen.findByText('删除'))
  expect(await repo.getAllUserEntries()).toHaveLength(0)
})
