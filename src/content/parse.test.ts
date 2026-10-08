import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseBook, parseSectionFile } from './parse'

const text = readFileSync('tests/fixture-book05.md', 'utf8')

test('解析节标题与节号（文件名序号 + # 标题）', () => {
  const { section } = parseSectionFile({ name: '05-不要浪费钱.md', text })
  expect(section).toEqual({ id: '05', title: '不要浪费钱' })
})

test('解析条目字段与 id 补零', () => {
  const { entries } = parseSectionFile({ name: '05-不要浪费钱.md', text })
  expect(entries.map(e => e.id)).toEqual(['05-01', '05-05'])
  const e1 = entries[0]
  expect(e1.title).toBe('关掉所有自动续费，改为到期手动续')
  expect(e1.cost).toContain('自动扣款')
  expect(e1.plainSpeak).toContain('订阅')
  expect(e1.evidenceGrade).toBe('C')
  expect(e1.source).toContain('samr.gov.cn')
  expect(e1.note).toContain('年付')
})

test('缺失备注 → 空串；条目内未知行 → 1 条 warning（含文件与行号）', () => {
  const { entries, warnings } = parseSectionFile({ name: '05-不要浪费钱.md', text })
  expect(entries[1].note).toBe('')
  expect(warnings).toHaveLength(1)
  expect(warnings[0].file).toBe('05-不要浪费钱.md')
  expect(warnings[0].text).toBe('奇怪的孤行')
})

test('解析成本标签 HTML 注释为 meta', () => {
  const { entries } = parseSectionFile({ name: '05-不要浪费钱.md', text })
  expect(entries[0].meta).toEqual({ money: '0', time: '少', willpower: '否', gain: '中', scope: '金钱' })
})

test('parseBook 按文件名排序、version 透传、warning 汇总', () => {
  const { book, warnings } = parseBook(
    [{ name: '05-不要浪费钱.md', text }, { name: '01-不要早死.md', text: '# 1. 不要早死\n\n### 1. 戒烟\n- 成本：不花钱。\n- 说人话：戒了就赚。\n- 收益：r\n- 证据等级：A\n- 来源：s\n' }],
    'abc123',
  )
  expect(book.version).toBe('abc123')
  expect(book.sections.map(s => s.id)).toEqual(['01', '05'])
  expect(book.entries.map(e => e.id)).toEqual(['01-01', '05-01', '05-05'])
  expect(warnings).toHaveLength(1)
})

test('无 # 标题时回退用文件名做节标题', () => {
  const { section } = parseSectionFile({ name: '07-没钱的时候怎么活.md', text: '### 1. x\n- 成本：c\n- 说人话：p\n- 收益：b\n- 证据等级：A\n- 来源：s\n' })
  expect(section.title).toBe('没钱的时候怎么活')
})
