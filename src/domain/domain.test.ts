import { describe, expect, test } from 'vitest'
import { addDays, todayStr, toISODate } from './dates'
import { computeStreak } from './streak'
import { pickDailyRead } from './daily-read'
import { filterEntries } from './search'
import type { ContentEntry } from '../content/types'

const e = (id: string, title: string, plainSpeak: string, benefit: string): ContentEntry =>
  ({ id, sectionId: '01', title, cost: 'c', plainSpeak, benefit, evidenceGrade: 'A', source: 's', note: '', meta: null })

test('日期工具：本地格式 / 加减天', () => {
  expect(toISODate(new Date(2026, 9, 8))).toBe('2026-10-08')
  expect(addDays('2026-10-08', -1)).toBe('2026-10-07')
  expect(addDays('2026-10-01', -1)).toBe('2026-09-30')
  expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

describe('computeStreak：锚定 decidedAt，断签归零', () => {
  const decided = '2026-10-01T00:00:00.000Z'
  test('连续三天含今天', () => {
    expect(computeStreak(['2026-10-06', '2026-10-07', '2026-10-08'], decided, '2026-10-08')).toBe(3)
  })
  test('今天未打，数到昨天', () => {
    expect(computeStreak(['2026-10-06', '2026-10-07'], decided, '2026-10-08')).toBe(2)
  })
  test('昨天断签，今天打了 → 1', () => {
    expect(computeStreak(['2026-10-05', '2026-10-08'], decided, '2026-10-08')).toBe(1)
  })
  test('从未打卡 → 0', () => {
    expect(computeStreak([], decided, '2026-10-08')).toBe(0)
  })
  test('decidedAt 之前的旧打卡不计入（删了重设不吃历史）', () => {
    expect(computeStreak(['2026-09-28', '2026-09-29', '2026-10-08'], '2026-10-07T00:00:00.000Z', '2026-10-08')).toBe(1)
  })
})

test('pickDailyRead：同日同池同结果；排除近期已读；空池回退', () => {
  const c = ['a', 'b', 'c']
  const d1 = pickDailyRead('2026-10-08', c, ['x'], [])
  const d2 = pickDailyRead('2026-10-08', c, ['x'], [])
  expect(d1).toBe(d2)
  expect(c).toContain(d1)
  const notRecent = pickDailyRead('2026-10-08', ['a', 'b'], ['x'], ['a'])
  expect(notRecent).toBe('b')
  expect(pickDailyRead('2026-10-08', [], ['f1', 'f2'], [])).toMatch(/^f/)
})

test('filterEntries：标题/说人话/收益 命中，忽略大小写，空查询返回全部', () => {
  const es = [e('01-01', '戒烟', '戒了就赚', '死亡率降'), e('01-02', '运动', '每周三次', 'RR 0.8')]
  expect(filterEntries(es, '戒烟')).toHaveLength(1)
  expect(filterEntries(es, 'rr 0.8')).toHaveLength(1)
  expect(filterEntries(es, '')).toHaveLength(2)
  expect(filterEntries(es, '不存在')).toHaveLength(0)
})
