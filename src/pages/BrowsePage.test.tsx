import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { BrowsePage } from './BrowsePage'
import { EntryDetail } from './EntryDetail'
import { db } from '../db/db'
import * as repo from '../db/repo'

vi.mock('../content/book', () => ({
  book: {
    version: 't',
    sections: [{ id: '01', title: '不要早死' }, { id: '05', title: '不要浪费钱' }],
    entries: [
      { id: '01-01', sectionId: '01', title: '戒烟', cost: '花毅力', plainSpeak: '戒了就赚', benefit: '死亡率降', evidenceGrade: 'A', source: 's1', note: 'n1', meta: { money: '0', time: '少', willpower: '些', gain: '大' } },
      { id: '05-05', sectionId: '05', title: '不买彩票', cost: 'c', plainSpeak: '每投 1 元拿回 0.51 元', benefit: 'b', evidenceGrade: 'A', source: 's2', note: '', meta: null },
    ],
  },
}))

beforeEach(async () => { await db.delete(); await db.open() })

test('分组列出条目；搜索过滤标题/说人话', async () => {
  render(<BrowsePage onOpenEntry={() => {}} />)
  expect(await screen.findByText('戒烟')).toBeTruthy()
  expect(screen.getByText('不买彩票')).toBeTruthy()
  fireEvent.input(screen.getByPlaceholderText('搜索标题/说人话/收益'), { target: { value: '彩票' } })
  expect(screen.getByText('不买彩票')).toBeTruthy()
  expect(screen.queryByText('戒烟')).toBeNull()
})

test('只看收藏开关', async () => {
  await repo.setFavorite('01-01', true)
  render(<BrowsePage onOpenEntry={() => {}} />)
  fireEvent.click(await screen.findByLabelText('只看收藏'))
  expect(await screen.findByText('戒烟')).toBeTruthy()
  expect(screen.queryByText('不买彩票')).toBeNull()
})

test('详情浮层：全字段 + 收藏切换 + 未评估三操作', async () => {
  render(<EntryDetail entryId="01-01" onClose={() => {}} />)
  expect(await screen.findByText('戒烟')).toBeTruthy()
  expect(screen.getByText(/戒了就赚/)).toBeTruthy()
  expect(screen.getByText(/花毅力/)).toBeTruthy()
  expect(screen.getByText(/n1/)).toBeTruthy()
  expect(screen.getByText(/s1/)).toBeTruthy()
  expect(screen.getByText(/钱=0 时间=少/)).toBeTruthy()
  fireEvent.click(screen.getByTestId('fav'))
  expect([...(await repo.getFavoriteIds())]).toEqual(['01-01'])
  fireEvent.click(screen.getByText('做一次', { selector: 'button' }))
  expect((await repo.getAllUserEntries())[0]).toMatchObject({ id: '01-01', status: 'todo' })
})

test('详情浮层：todo 状态显示改为打卡', async () => {
  await repo.decideTodo('01-01')
  render(<EntryDetail entryId="01-01" onClose={() => {}} />)
  fireEvent.click(await screen.findByText('改为打卡'))
  expect((await repo.getAllUserEntries())[0].status).toBe('habit')
})
