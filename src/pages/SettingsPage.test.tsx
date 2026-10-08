import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { SettingsPage } from './SettingsPage'
import { db } from '../db/db'
import * as repo from '../db/repo'

vi.mock('../content/book', () => ({
  book: {
    version: 't',
    sections: [{ id: '01', title: '不要早死' }],
    entries: [
      { id: '01-01', sectionId: '01', title: '戒烟', cost: 'c', plainSpeak: 'p', benefit: 'b', evidenceGrade: 'A', source: 's', note: '', meta: null },
    ],
  },
}))

beforeEach(async () => { await db.delete(); await db.open() })

test('不做列表展示 + 恢复 = 删行', async () => {
  await repo.rejectEntry('01-01')
  render(<SettingsPage />)
  expect(await screen.findByText('不做（1）')).toBeTruthy()
  expect(screen.getByText('戒烟')).toBeTruthy()
  fireEvent.click(screen.getByText('恢复'))
  expect(await screen.findByText('不做（0）')).toBeTruthy()
  expect(await repo.getAllUserEntries()).toHaveLength(0)
})

test('导入备份文件恢复数据（导出→清库→经 UI 导入）', async () => {
  await repo.decideHabit('01-01')
  await repo.setFavorite('01-01', true)
  const backup = await repo.exportData()
  await db.delete(); await db.open()
  render(<SettingsPage />)
  const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })
  fireEvent.input(screen.getByLabelText('导入备份'), { target: { files: [file] } })
  await waitFor(async () => expect(await repo.getFavoriteIds()).toEqual(new Set(['01-01'])))
  expect((await repo.getAllUserEntries())[0].status).toBe('habit')
})
