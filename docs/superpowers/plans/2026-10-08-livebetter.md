# LiveBetter 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Inline) or subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把《高性价比人生指南》672 条建议做成 Android 可用的离线 PWA：滑卡决策、待做清单、每日打卡、浏览/搜索/收藏、每日一读。

**Architecture:** Vite+Preact SPA，无后端。内容是构建产物（上游 `book/*.md` → `src/data/entries.json`，只读，见 ADR-0001）；用户状态（决策/打卡/收藏/每日一读）存 IndexedDB（Dexie），以条目 id 关联。底部 4 Tab + 设置页。

**Tech Stack:** Preact 10、Dexie 4、vite-plugin-pwa、Vite 6、vitest + jsdom + @testing-library/preact + fake-indexeddb、tsx（构建脚本）。

**Spec:** `docs/superpowers/specs/2026-10-08-livebetter-design.md`（含第 2 幕拷问裁决）。术语以 `CONTEXT.md` 为准（待做/习惯/不做/打卡/连续天数/收藏/未评估）。

## Global Constraints

- 无行 = 未评估；恢复/删除 = 删 UserEntry 行；CheckIn 永不删除（ADR-0002）。
- 收藏独立表 `favorites`，未评估条目也可收藏。
- 打卡仅每日频率，无补签；连续天数只从当次 decidedAt 起算。
- 滑卡按书序出场；滑动手势阈值 80px。
- 内容唯一来源：上游仓库 `book/` 目录；`entries.json` 为构建产物，随仓库提交；条目数 ≥ 600 校验。
- `vite.config.ts` 恒为 `base: './'`（GitHub Pages 项目页可用，无客户端路由）。
- Node ≥ 20；包管理 npm；所有测试命令 `npx vitest run <file>`。
- UI 文案中文；git commit 用 conventional commits（中文描述可）。
- PWA 图标已生成并入库：`public/icons/icon-192.png`、`public/icons/icon-512.png`（绿底白环，勿再生成）。

---

### Task 1: 项目脚手架（Vite + Preact + TS + vitest）

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/app.tsx`, `src/styles.css`, `tests/setup.ts`
- Test: `src/app.test.tsx`

**Interfaces:**
- Produces: `App` 组件（`src/app.tsx`，Task 6 重写为 Tab 壳）；vitest 环境 jsdom + `tests/setup.ts`（fake-indexeddb + cleanup）。

- [ ] **Step 1: 写包配置与工具链**

`package.json`：

```json
{
  "name": "livebetter",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "build:content": "tsx scripts/build-content.ts",
    "deploy": "npm run build && gh-pages -d dist"
  },
  "dependencies": {
    "dexie": "^4.0.8",
    "preact": "^10.19.3"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.9.1",
    "@testing-library/preact": "^3.2.4",
    "fake-indexeddb": "^6.0.0",
    "gh-pages": "^6.2.0",
    "jsdom": "^25.0.1",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vitest": "^2.1.8"
  }
}
```

`vite.config.ts`：

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  base: './',
  plugins: [preact()],
  test: { environment: 'jsdom', setupFiles: './tests/setup.ts' },
})
```

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "scripts", "tests"]
}
```

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>LiveBetter</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`tests/setup.ts`：

```ts
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/preact'
import { afterEach } from 'vitest'

afterEach(cleanup)
```

`src/styles.css`（全项目样式，后续任务不再改）：

```css
:root { --fg:#222; --muted:#777; --border:#ddd; --surface:#fff; --accent:#228b22; --bg:#f6f6f4; }
@media (prefers-color-scheme: dark) {
  :root { --fg:#e8e8e8; --muted:#999; --border:#3a3a3a; --surface:#1e1e1e; --accent:#4caf50; --bg:#121212; }
}
* { box-sizing: border-box; }
body { margin: 0; font: 16px/1.6 system-ui, sans-serif; background: var(--bg); color: var(--fg); }
.app { display: flex; flex-direction: column; height: 100dvh; max-width: 640px; margin: 0 auto; }
.topbar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--surface); border-bottom: 1px solid var(--border); }
.brand { font-weight: 700; color: var(--accent); }
main { flex: 1; overflow-y: auto; padding: 12px; }
.tabs { display: flex; background: var(--surface); border-top: 1px solid var(--border); }
.tabs button { flex: 1; padding: 10px 0; border: none; background: none; font-size: 15px; color: var(--muted); }
.tabs button.on { color: var(--accent); font-weight: 700; }
.page h2 { margin: 8px 0 12px; }
.muted { color: var(--muted); font-size: 13px; }
.empty { text-align: center; color: var(--muted); padding: 40px 20px; }
.progress { color: var(--muted); font-size: 13px; margin-bottom: 8px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 16px; margin: 8px 0; touch-action: pan-y; user-select: none; }
.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-title { margin: 10px 0; font-size: 18px; }
.plain { color: var(--muted); font-size: 14px; }
.badge { display: inline-block; padding: 1px 8px; border: 1px solid var(--accent); border-radius: 10px; color: var(--accent); font-size: 12px; }
.actions { display: flex; gap: 8px; margin-top: 14px; }
.btn { padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--fg); font-size: 14px; }
.btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.rows { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; gap: 10px; padding: 10px 8px; border-bottom: 1px solid var(--border); }
.row-title { flex: 1; cursor: pointer; }
.streak { color: var(--accent); font-size: 13px; white-space: nowrap; }
.searchbox { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--fg); font-size: 15px; }
.fav-toggle { display: block; margin: 8px 0; font-size: 14px; }
.section-block h3 { margin: 16px 0 4px; font-size: 15px; }
.sheet-backdrop, .detail-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: flex-end; justify-content: center; z-index: 10; }
.detail-backdrop { align-items: center; }
.sheet { width: 100%; max-width: 640px; background: var(--surface); border-radius: 14px 14px 0 0; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.detail { width: calc(100% - 24px); max-width: 600px; max-height: 85dvh; overflow-y: auto; background: var(--surface); border-radius: 14px; padding: 16px; }
.star { border: none; background: none; font-size: 22px; color: var(--accent); cursor: pointer; }
.update-toast { position: fixed; bottom: 70px; left: 50%; transform: translateX(-50%); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 8px 12px; display: flex; gap: 8px; align-items: center; z-index: 20; }
.done-box summary { cursor: pointer; color: var(--muted); padding: 12px 0; }
.daily { cursor: pointer; }
```

- [ ] **Step 2: 写最小 App 与入口**

`src/main.tsx`：

```tsx
import { render } from 'preact'
import { App } from './app'
import './styles.css'

render(<App />, document.getElementById('app')!)
```

`src/app.tsx`：

```tsx
export function App() {
  return <h1>LiveBetter</h1>
}
```

- [ ] **Step 3: 安装依赖并写冒烟测试**

Run: `npm install`

`src/app.test.tsx`：

```tsx
import { render, screen } from '@testing-library/preact'
import { App } from './app'

test('renders app title', () => {
  render(<App />)
  expect(screen.getByText('LiveBetter')).toBeTruthy()
})
```

- [ ] **Step 4: 跑测试确认通过 + 开发服务器冒烟**

Run: `npx vitest run src/app.test.tsx`
Expected: PASS 1 test
Run: `npx vite dev --port 5173 &`，浏览器打开 http://localhost:5173 看到 LiveBetter 大标题，然后停掉。

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: Vite+Preact+TS+vitest 脚手架"
```

---

### Task 2: 内容解析器（book/*.md → 结构化条目）

**Files:**
- Create: `src/content/types.ts`, `src/content/parse.ts`, `tests/fixture-book05.md`
- Test: `src/content/parse.test.ts`

**Interfaces:**
- Produces:
  - `interface Section { id: string; title: string }`
  - `interface EntryMeta { money?: string; time?: string; willpower?: string; gain?: string; scope?: string }`
  - `interface ContentEntry { id: string; sectionId: string; title: string; cost: string; plainSpeak: string; benefit: string; evidenceGrade: string; source: string; note: string; meta: EntryMeta | null }`
  - `interface Book { version: string; sections: Section[]; entries: ContentEntry[] }`
  - `interface ParseWarning { file: string; line: number; text: string }`
  - `parseSectionFile(file: { name: string; text: string }): { section: Section; entries: ContentEntry[]; warnings: ParseWarning[] }`
  - `parseBook(files: { name: string; text: string }[], version: string): { book: Book; warnings: ParseWarning[] }`

- [ ] **Step 1: 写类型与失败测试**

`src/content/types.ts`：

```ts
export interface Section { id: string; title: string }
export interface EntryMeta { money?: string; time?: string; willpower?: string; gain?: string; scope?: string }
export interface ContentEntry {
  id: string; sectionId: string; title: string
  cost: string; plainSpeak: string; benefit: string
  evidenceGrade: string; source: string; note: string
  meta: EntryMeta | null
}
export interface Book { version: string; sections: Section[]; entries: ContentEntry[] }
export interface ParseWarning { file: string; line: number; text: string }
```

`tests/fixture-book05.md`（真实上游结构摘录，第 5 条删去备注行、加一行孤行以测宽容解析）：

```markdown
[← 回总目录](../README.md)

# 5. 不要浪费钱

这一节只算钱：能省下多少，每年收益差多少。（fixture 摘录）

### 1. 关掉所有自动续费，改为到期手动续
<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->
- 成本：不花钱。把「自动扣款」列表翻一遍，一次 10 到 20 分钟。
- 说人话：省下来的，是那些你早就不用、每月还在扣钱的订阅。
- 收益：省下的钱，等于你已经不用、却还在扣费的那些订阅加起来的钱。
- 证据等级：C
- 来源：国家市场监督管理总局 (2021). 网络交易监督管理办法. <https://www.samr.gov.cn/xxx>
- 备注：你确实经常用的服务，年付一般比月付便宜。

### 5. 不买彩票
<!-- 成本标签: 钱=0 时间=少 毅力=否 收益=中 口径=金钱 -->
- 成本：不花钱。不买就是省钱。
- 说人话：每投 1 元，长期平均只能拿回 0.51 元，稳定亏掉 49%。
- 收益：财政部规定了奖金占销售额的最低比例。
- 证据等级：A
- 来源：财政部 (2015). 关于规范彩票资金的通知. <http://m.mof.gov.cn/xxx>
奇怪的孤行
```

`src/content/parse.test.ts`：

```ts
import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseBook, parseSectionFile } from './parse'

const text = readFileSync(new URL('../../tests/fixture-book05.md', import.meta.url), 'utf8')

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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/content/parse.test.ts`
Expected: FAIL — `Cannot find module './parse'`

- [ ] **Step 3: 实现解析器**

`src/content/parse.ts`：

```ts
import type { Book, ContentEntry, EntryMeta, ParseWarning, Section } from './types'

const ENTRY_RE = /^###\s+(\d+)\.\s+(.*)$/
const SECTION_RE = /^#\s+\d+\.\s+(.*)$/
const FIELD_RE = /^-\s*(成本|说人话|收益|证据等级|来源|备注)：(.*)$/
const META_RE = /^<!--\s*成本标签:\s*(.*?)\s*-->$/

const FIELD_KEY: Record<string, 'cost' | 'plainSpeak' | 'benefit' | 'evidenceGrade' | 'source' | 'note'> = {
  成本: 'cost', 说人话: 'plainSpeak', 收益: 'benefit', 证据等级: 'evidenceGrade', 来源: 'source', 备注: 'note',
}
const META_KEY: Record<string, keyof EntryMeta> = { 钱: 'money', 时间: 'time', 毅力: 'willpower', 收益: 'gain', 口径: 'scope' }

function parseMeta(tag: string): EntryMeta {
  const meta: EntryMeta = {}
  for (const m of tag.matchAll(/([\u4e00-\u9fa5]+)=([^\s]+)/g)) {
    const k = META_KEY[m[1]]
    if (k) meta[k] = m[2]
  }
  return meta
}

export interface SectionFile { name: string; text: string }

export function parseSectionFile(file: SectionFile): { section: Section; entries: ContentEntry[]; warnings: ParseWarning[] } {
  const sectionId = /^(\d{2})-/.exec(file.name)?.[1]
  if (!sectionId) throw new Error(`bad book file name: ${file.name}`)
  const warnings: ParseWarning[] = []
  const entries: ContentEntry[] = []
  let sectionTitle = file.name.replace(/^\d{2}-/, '').replace(/\.md$/, '')
  let cur: ContentEntry | null = null
  const flush = () => { if (cur) entries.push(cur); cur = null }
  const lines = file.text.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!cur) {
      const sm = SECTION_RE.exec(line)
      if (sm) { sectionTitle = sm[1]; continue }
      const em = ENTRY_RE.exec(line)
      if (em) cur = { id: `${sectionId}-${String(em[1]).padStart(2, '0')}`, sectionId, title: em[2].trim(), cost: '', plainSpeak: '', benefit: '', evidenceGrade: '', source: '', note: '', meta: null }
      continue // 首条目前的前言/目录行静默忽略
    }
    if (ENTRY_RE.test(line)) { flush(); i--; continue }
    const mm = META_RE.exec(line)
    if (mm) { cur.meta = parseMeta(mm[1]); continue }
    const fm = FIELD_RE.exec(line)
    if (fm) { cur[FIELD_KEY[fm[1]]] = fm[2].trim(); continue }
    if (line.trim() === '') continue
    warnings.push({ file: file.name, line: i + 1, text: line })
  }
  flush()
  return { section: { id: sectionId, title: sectionTitle }, entries, warnings }
}

export function parseBook(files: SectionFile[], version: string): { book: Book; warnings: ParseWarning[] } {
  const sections: Section[] = []
  const entries: ContentEntry[] = []
  const warnings: ParseWarning[] = []
  for (const f of [...files].sort((a, b) => a.name.localeCompare(b.name))) {
    const r = parseSectionFile(f)
    sections.push(r.section)
    entries.push(...r.entries)
    warnings.push(...r.warnings)
  }
  return { book: { version, sections, entries }, warnings }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/content/parse.test.ts`
Expected: PASS 6 tests

- [ ] **Step 5: Commit**

```bash
git add src/content tests && git commit -m "feat: 上游 book/*.md 解析器（宽容字段 + 成本标签 + warning 收集）"
```

---

### Task 3: 构建脚本（拉上游 → entries.json）

**Files:**
- Create: `scripts/build-content.ts`（产物 `src/data/entries.json` 随后生成并提交）

**Interfaces:**
- Consumes: `parseBook`（Task 2）
- Produces: `src/data/entries.json`，形如 `{"version":"<40位sha>","sections":[…],"entries":[…]}`；`npm run build:content`

- [ ] **Step 1: 写脚本**

`scripts/build-content.ts`：

```ts
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { parseBook } from '../src/content/parse'

const REPO = 'https://github.com/eternity4719/HowToLiveBetter.git'
const TMP = 'tmp-upstream-htlb'

rmSync(TMP, { recursive: true, force: true })
execSync(`git clone --depth 1 ${REPO} ${TMP}`, { stdio: 'inherit' })
const sha = execSync(`git -C ${TMP} rev-parse HEAD`).toString().trim()

const files = readdirSync(`${TMP}/book`)
  .filter(f => /^\d{2}-.*\.md$/.test(f))
  .map(name => ({ name, text: readFileSync(`${TMP}/book/${name}`, 'utf8') }))

const { book, warnings } = parseBook(files, sha)
for (const w of warnings) console.warn(`[parse] ${w.file}:${w.line} ${w.text}`)

if (book.entries.length < 600) throw new Error(`entries=${book.entries.length} < 600，上游格式可能变了`)
const missing = book.entries.filter(e => !e.title || !e.plainSpeak || !e.evidenceGrade)
if (missing.length) throw new Error(`缺必要字段: ${missing.map(e => e.id).join(', ')}`)

mkdirSync('src/data', { recursive: true })
writeFileSync('src/data/entries.json', JSON.stringify(book))
rmSync(TMP, { recursive: true, force: true })
console.log(`OK entries=${book.entries.length} sections=${book.sections.length} sha=${sha.slice(0, 7)}`)
```

- [ ] **Step 2: 运行（需网络与 git）**

Run: `npm run build:content`
Expected: 末行 `OK entries=6xx sections=34 sha=xxxxxxx`；warning 行数 0（若有，人工抽查对应行是否新格式）

- [ ] **Step 3: 校验产物结构**

Run: `node -e "const b=require('./src/data/entries.json');console.log(b.version.length, b.sections.length, b.entries.length, b.entries[0].id, b.entries[0].meta)"`
Expected: `40 34 6xx NN-NN { money: '0', … }`

- [ ] **Step 4: Commit**

```bash
git add scripts/build-content.ts src/data/entries.json && git commit -m "feat: build:content 构建脚本 + 首份 entries.json"
```

---

### Task 4: 用户状态存储（Dexie + repo）

**Files:**
- Create: `src/db/db.ts`, `src/db/repo.ts`
- Test: `src/db/repo.test.ts`

**Interfaces:**
- Produces:
  - `type Status = 'todo' | 'habit' | 'done' | 'rejected'`
  - `interface UserEntry { id: string; status: Status; decidedAt: string; doneAt?: string }`
  - `interface Favorite { entryId: string; addedAt: string }`
  - `interface CheckIn { id: string; entryId: string; date: string }`（id = `` `${entryId}:${date}` ``）
  - `interface DailyRead { date: string; entryId: string }`
  - `interface Backup { userEntries: UserEntry[]; checkIns: CheckIn[]; dailyReads: DailyRead[]; favorites: Favorite[] }`
  - repo 函数：`decideTodo/decideHabit/rejectEntry(id)`、`restoreEntry(id)`、`deleteEntry(id)`、`convertTo(id, 'todo'|'habit')`、`completeEntry(id)`、`undoComplete(id)`、`setFavorite(id, on)`、`getFavoriteIds(): Promise<Set<string>>`、`toggleCheckIn(id, date)`、`getCheckInDates(id): Promise<string[]>`、`getUserEntriesByStatus(status)`、`getAllUserEntries()`、`getRecentDailyReadIds(days): Promise<Set<string>>`、`getDailyRead(date)`、`setDailyRead(date, id)`、`exportData(): Promise<Backup>`、`importData(Backup)`

- [ ] **Step 1: 写失败测试**

`src/db/repo.test.ts`：

```ts
import { beforeEach, test } from 'vitest'
import { expect } from 'vitest'
import { db } from './db'
import * as repo from './repo'

beforeEach(async () => { await db.delete() })

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
  await db.delete()
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/db/repo.test.ts`
Expected: FAIL — `Cannot find module './db'`

- [ ] **Step 3: 实现 db 与 repo**

`src/db/db.ts`：

```ts
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
```

`src/db/repo.ts`：

```ts
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
```

（代码即最终版，无补充说明。）

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/db/repo.test.ts`
Expected: PASS 9 tests

- [ ] **Step 5: Commit**

```bash
git add src/db && git commit -m "feat: Dexie 用户状态层（决策/收藏/打卡/每日一读 + 备份往返）"
```

---

### Task 5: 领域逻辑（日期 / 连续天数 / 每日一读 / 搜索）

**Files:**
- Create: `src/domain/dates.ts`, `src/domain/streak.ts`, `src/domain/daily-read.ts`, `src/domain/search.ts`
- Test: `src/domain/domain.test.ts`

**Interfaces:**
- Consumes: `ContentEntry`（Task 2）
- Produces:
  - `toISODate(d: Date): string`；`todayStr(): string`；`addDays(iso: string, n: number): string`
  - `computeStreak(checkinDates: string[], decidedAtIso: string, today: string): number`
  - `pickDailyRead(date: string, candidateIds: string[], fallbackIds: string[], recentReadIds: string[]): string`
  - `filterEntries(entries: ContentEntry[], query: string): ContentEntry[]`

- [ ] **Step 1: 写失败测试**

`src/domain/domain.test.ts`：

```ts
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
```

（测试文件头已显式导入 vitest API，无需全局配置。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/domain/domain.test.ts`
Expected: FAIL — 找不到 `./dates` 等模块

- [ ] **Step 3: 实现四个纯函数模块**

`src/domain/dates.ts`：

```ts
const p = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function todayStr(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + n))
}
```

`src/domain/streak.ts`：

```ts
import { addDays } from './dates'

export function computeStreak(checkinDates: string[], decidedAtIso: string, today: string): number {
  const anchor = decidedAtIso.slice(0, 10)
  const set = new Set(checkinDates.filter(d => d >= anchor))
  let cursor = set.has(today) ? today : addDays(today, -1)
  if (!set.has(cursor)) return 0
  let streak = 0
  while (set.has(cursor)) { streak++; cursor = addDays(cursor, -1) }
  return streak
}
```

`src/domain/daily-read.ts`：

```ts
export function pickDailyRead(date: string, candidateIds: string[], fallbackIds: string[], recentReadIds: string[]): string {
  const recent = new Set(recentReadIds)
  let pool = candidateIds.filter(id => !recent.has(id))
  if (pool.length === 0) pool = candidateIds.length > 0 ? candidateIds : fallbackIds
  let h = 0
  for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return pool[h % pool.length]
}
```

`src/domain/search.ts`：

```ts
import type { ContentEntry } from '../content/types'

export function filterEntries(entries: ContentEntry[], query: string): ContentEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return entries
  return entries.filter(e => `${e.title}\n${e.plainSpeak}\n${e.benefit}`.toLowerCase().includes(q))
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/domain/domain.test.ts`
Expected: PASS 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/domain && git commit -m "feat: 领域逻辑——日期/连续天数(decidedAt 锚定)/每日一读种子/全文过滤"
```

---

### Task 6: App 壳（Tab 导航 + 数据装载 + 最小页面）

**Files:**
- Create: `src/content/book.ts`, `src/db/use-user.ts`, `src/pages/DeckPage.tsx`, `src/pages/ListPage.tsx`, `src/pages/HabitsPage.tsx`, `src/pages/BrowsePage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/EntryDetail.tsx`
- Modify: `src/app.tsx`（整体重写）
- Test: `src/app.test.tsx`（重写）

**Interfaces:**
- Consumes: `book`（Task 3 的 `src/data/entries.json`）、repo（Task 4）
- Produces:
  - `src/content/book.ts` 导出 `book: Book`
  - `useUserEntries(): { rows: UserEntry[]; reload: () => void; ready: boolean }`（`src/db/use-user.ts`）
  - 页面组件 props：`DeckPage/ListPage/HabitsPage/BrowsePage: { onOpenEntry: (id: string) => void }`；`SettingsPage: {}`；`EntryDetail: { entryId: string; onClose: () => void }`
  - `App` 内 `Tab = 'deck' | 'list' | 'habits' | 'browse' | 'settings'`，设置经顶栏 ⚙ 进入（底部仅 4 Tab，spec §页面）

- [ ] **Step 1: 写失败测试（重写 `src/app.test.tsx`）**

```tsx
import { expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
import { App } from './app'

test('默认在挑页；底部 4 Tab；⚙ 打开设置页', async () => {
  render(<App />)
  expect(await screen.findByText(/已评估 0\/\d+/)).toBeTruthy()
  expect(screen.getByRole('navigation').querySelectorAll('button')).toHaveLength(4)
  fireEvent.click(screen.getByLabelText('设置'))
  expect(await screen.findByText('不做（0）')).toBeTruthy()
})
```

（设置页最小版含 `不做（0）` 标题。）

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/app.test.tsx`
Expected: FAIL — 找不到「已评估」

- [ ] **Step 3: 实现**

`src/content/book.ts`：

```ts
import raw from '../data/entries.json'
import type { Book } from './types'

export const book = raw as unknown as Book
```

`src/db/use-user.ts`：

```ts
import { useEffect, useState } from 'preact/hooks'
import { getAllUserEntries } from './repo'
import type { UserEntry } from './db'

export function useUserEntries(): { rows: UserEntry[]; reload: () => void; ready: boolean } {
  const [rows, setRows] = useState<UserEntry[]>([])
  const [ready, setReady] = useState(false)
  const reload = () => { getAllUserEntries().then(r => { setRows(r); setReady(true) }) }
  useEffect(reload, [])
  return { rows, reload, ready }
}
```

`src/app.tsx`（重写）：

```tsx
import { useState } from 'preact/hooks'
import { DeckPage } from './pages/DeckPage'
import { ListPage } from './pages/ListPage'
import { HabitsPage } from './pages/HabitsPage'
import { BrowsePage } from './pages/BrowsePage'
import { SettingsPage } from './pages/SettingsPage'
import { EntryDetail } from './pages/EntryDetail'

export type Tab = 'deck' | 'list' | 'habits' | 'browse' | 'settings'

export function App() {
  const [tab, setTab] = useState<Tab>('deck')
  const [detailId, setDetailId] = useState<string | null>(null)
  return (
    <div class="app">
      <header class="topbar">
        <span class="brand">LiveBetter</span>
        <button class="gear" aria-label="设置" onClick={() => setTab('settings')}>⚙</button>
      </header>
      <main>
        {tab === 'deck' && <DeckPage onOpenEntry={setDetailId} />}
        {tab === 'list' && <ListPage onOpenEntry={setDetailId} />}
        {tab === 'habits' && <HabitsPage onOpenEntry={setDetailId} />}
        {tab === 'browse' && <BrowsePage onOpenEntry={setDetailId} />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      {detailId && <EntryDetail entryId={detailId} onClose={() => setDetailId(null)} />}
      <nav class="tabs" role="navigation">
        <button class={tab === 'deck' ? 'on' : ''} onClick={() => setTab('deck')}>挑</button>
        <button class={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>清单</button>
        <button class={tab === 'habits' ? 'on' : ''} onClick={() => setTab('habits')}>打卡</button>
        <button class={tab === 'browse' ? 'on' : ''} onClick={() => setTab('browse')}>浏览</button>
      </nav>
    </div>
  )
}
```

最小页面（后续任务逐个充实，本任务只要可渲染、有锚点文案）：

`src/pages/DeckPage.tsx`：

```tsx
import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'

export function DeckPage(_props: { onOpenEntry: (id: string) => void }) {
  const { rows } = useUserEntries()
  return (
    <section class="page">
      <div class="progress">已评估 {rows.length}/{book.entries.length}</div>
    </section>
  )
}
```

`src/pages/ListPage.tsx`：

```tsx
export function ListPage(_props: { onOpenEntry: (id: string) => void }) {
  return <section class="page"><h2>清单</h2><div class="empty">清单是空的。去「挑」里决策。</div></section>
}
```

`src/pages/HabitsPage.tsx`：

```tsx
export function HabitsPage(_props: { onOpenEntry: (id: string) => void }) {
  return <section class="page"><h2>打卡</h2><div class="empty">还没有要重复做的事。</div></section>
}
```

`src/pages/BrowsePage.tsx`：

```tsx
export function BrowsePage(_props: { onOpenEntry: (id: string) => void }) {
  return <section class="page"><h2>浏览</h2></section>
}
```

`src/pages/SettingsPage.tsx`：

```tsx
export function SettingsPage() {
  return <section class="page"><h2>设置</h2><h3>不做（0）</h3></section>
}
```

`src/pages/EntryDetail.tsx`：

```tsx
import { book } from '../content/book'

export function EntryDetail({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const e = book.entries.find(x => x.id === entryId)
  if (!e) return null
  return (
    <div class="detail-backdrop" onClick={onClose}>
      <div class="detail" onClick={ev => ev.stopPropagation()}>
        <h3>{e.title}</h3>
        <button class="btn" onClick={onClose}>关闭</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑全部测试确认通过**

Run: `npx vitest run`
Expected: PASS（app 壳 + 之前所有任务测试）

- [ ] **Step 5: Commit**

```bash
git add src && git commit -m "feat: App 壳——4 Tab + 设置 + 详情浮层 + book/useUserEntries 数据装载"
```

---

### Task 7: 挑页（滑卡 deck + 决策弹层 + 每日一读）

**Files:**
- Modify: `src/pages/DeckPage.tsx`（整体重写）
- Test: `src/pages/DeckPage.test.tsx`

**Interfaces:**
- Consumes: `book`、`useUserEntries`、`decideTodo/decideHabit/rejectEntry/getDailyRead/setDailyRead/getRecentDailyReadIds`（Task 4/6）、`pickDailyRead`、`todayStr`
- Produces: `swipeAction(dx: number, threshold = 80): 'left' | 'right' | null`（从 DeckPage 导出，Task 后续无人消费，仅单测手势阈值）

- [ ] **Step 1: 写失败测试**

`src/pages/DeckPage.test.tsx`：

```tsx
import { beforeEach } from 'vitest'
import { expect, test, vi } from 'vitest'
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

beforeEach(async () => { await db.delete() })

test('swipeAction 阈值边界', () => {
  expect(swipeAction(-80)).toBe('left')
  expect(swipeAction(80)).toBe('right')
  expect(swipeAction(-79)).toBeNull()
  expect(swipeAction(79)).toBeNull()
  expect(swipeAction(0)).toBeNull()
})

test('按书序出卡：做 → 弹层 → 做一次 → 下一张 + 行状态 todo', async () => {
  render(<DeckPage onOpenEntry={() => {}} />)
  expect(screen.getByText('戒烟')).toBeTruthy()
  fireEvent.click(screen.getByText('做', { selector: 'button' }))
  fireEvent.click(await screen.findByText('做一次（进清单）'))
  expect(await screen.findByText('运动')).toBeTruthy()
  expect((await repo.getAllUserEntries())[0]).toMatchObject({ id: '01-01', status: 'todo' })
})

test('不做 → rejected → 下一张', async () => {
  render(<DeckPage onOpenEntry={() => {}} />)
  fireEvent.click(screen.getByText('不做'))
  expect(await screen.findByText('运动')).toBeTruthy()
  expect((await repo.getUserEntriesByStatus('rejected')).map(r => r.id)).toEqual(['01-01'])
})

test('全部评估完 → 空状态', async () => {
  await repo.decideTodo('01-01'); await repo.decideHabit('01-02'); await repo.rejectEntry('02-01')
  render(<DeckPage onOpenEntry={() => {}} />)
  expect(await screen.findByText(/全部评估完了/)).toBeTruthy()
})

test('每日一读卡片渲染且点开详情', async () => {
  const opened: string[] = []
  render(<DeckPage onOpenEntry={id => opened.push(id)} />)
  expect(await screen.findByText('每日一读')).toBeTruthy()
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/DeckPage.test.tsx`
Expected: FAIL — `swipeAction` 未导出 / 「做」按钮不存在

- [ ] **Step 3: 实现（重写 `src/pages/DeckPage.tsx`）**

```tsx
import { useEffect, useState } from 'preact/hooks'
import { book } from '../content/book'
import type { ContentEntry } from '../content/types'
import { useUserEntries } from '../db/use-user'
import { decideHabit, decideTodo, getDailyRead, getRecentDailyReadIds, rejectEntry, setDailyRead } from '../db/repo'
import { pickDailyRead } from '../domain/daily-read'
import { todayStr } from '../domain/dates'

export function swipeAction(dx: number, threshold = 80): 'left' | 'right' | null {
  if (dx <= -threshold) return 'left'
  if (dx >= threshold) return 'right'
  return null
}

function Card({ entry, onLeft, onRight }: { entry: ContentEntry; onLeft: () => void; onRight: () => void }) {
  const [dx, setDx] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  const up = () => {
    const a = swipeAction(dx)
    setStartX(null); setDx(0)
    if (a === 'left') onLeft()
    if (a === 'right') onRight()
  }
  return (
    <div class="card" data-testid="deck-card" style={{ transform: `translateX(${dx}px)` }}
      onPointerDown={e => setStartX(e.clientX)}
      onPointerMove={e => { if (startX !== null) setDx(e.clientX - startX) }}
      onPointerUp={up} onPointerLeave={up}>
      <div class="card-top">
        <span class="muted">{book.sections.find(s => s.id === entry.sectionId)?.title}</span>
        <span class="badge">{entry.evidenceGrade}</span>
      </div>
      <h3 class="card-title">{entry.title}</h3>
      <p class="plain">{entry.plainSpeak}</p>
      <div class="actions">
        <button class="btn" onClick={onLeft}>不做</button>
        <button class="btn btn-primary" onClick={onRight}>做</button>
      </div>
    </div>
  )
}

export function DeckPage({ onOpenEntry }: { onOpenEntry: (id: string) => void }) {
  const { rows, reload, ready } = useUserEntries()
  const decided = new Set(rows.map(r => r.id))
  const current = book.entries.find(e => !decided.has(e.id)) ?? null
  const [sheet, setSheet] = useState<ContentEntry | null>(null)
  const [daily, setDaily] = useState<string | null>(null)

  useEffect(() => {
    if (!ready) return
    ;(async () => {
      const today = todayStr()
      let row = await getDailyRead(today)
      if (!row) {
        const recent = await getRecentDailyReadIds(30)
        const candidates = book.entries.filter(e => !decided.has(e.id)).map(e => e.id)
        const id = pickDailyRead(today, candidates, book.entries.map(e => e.id), [...recent])
        await setDailyRead(today, id)
        row = { date: today, entryId: id }
      }
      setDaily(row.entryId)
    })()
  }, [ready])

  const dailyEntry = daily ? book.entries.find(e => e.id === daily) : undefined

  return (
    <section class="page">
      <div class="progress">已评估 {rows.length}/{book.entries.length}</div>
      {dailyEntry && (
        <div class="daily card" onClick={() => onOpenEntry(dailyEntry.id)}>
          <div class="muted">每日一读</div>
          <div class="card-title">{dailyEntry.title}</div>
        </div>
      )}
      {current ? (
        <Card entry={current}
          onLeft={async () => { await rejectEntry(current.id); reload() }}
          onRight={() => setSheet(current)} />
      ) : (
        <div class="empty">全部评估完了。去「清单」和「打卡」看看。</div>
      )}
      {sheet && (
        <div class="sheet-backdrop" onClick={() => setSheet(null)}>
          <div class="sheet" onClick={e => e.stopPropagation()}>
            <button class="btn btn-primary" onClick={async () => { await decideTodo(sheet.id); setSheet(null); reload() }}>做一次（进清单）</button>
            <button class="btn" onClick={async () => { await decideHabit(sheet.id); setSheet(null); reload() }}>要重复（设为打卡）</button>
          </div>
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/pages/DeckPage.test.tsx`
Expected: PASS 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/pages && git commit -m "feat: 挑页——书序滑卡 deck/决策弹层/进度/空态/每日一读"
```

---

### Task 8: 清单页（待做/已完成/删除）

**Files:**
- Modify: `src/pages/ListPage.tsx`（整体重写）
- Test: `src/pages/ListPage.test.tsx`

**Interfaces:**
- Consumes: `book`、`useUserEntries`、`completeEntry/undoComplete/deleteEntry`
- Produces: 无（叶子页面）

- [ ] **Step 1: 写失败测试**

`src/pages/ListPage.test.tsx`：

```tsx
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

beforeEach(async () => { await db.delete() })

test('待做列表打勾 → done 进折叠区，撤销回来', async () => {
  await repo.decideTodo('01-01')
  render(<ListPage onOpenEntry={() => {}} />)
  fireEvent.click(await screen.findByLabelText('完成 戒烟'))
  expect(await screen.findByText('已完成（1）')).toBeTruthy()
  expect((await repo.getAllUserEntries())[0].status).toBe('done')
  fireEvent.click(screen.getByLabelText('撤销 戒烟'))
  expect((await repo.getAllUserEntries())[0].status).toBe('todo')
})

test('删除 → 回未评估（无行）', async () => {
  await repo.decideTodo('01-02')
  render(<ListPage onOpenEntry={() => {}} />)
  fireEvent.click(await screen.findByText('删除'))
  expect(await repo.getAllUserEntries()).toHaveLength(0)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/ListPage.test.tsx`
Expected: FAIL — 找不到「完成 戒烟」

- [ ] **Step 3: 实现（重写 `src/pages/ListPage.tsx`）**

```tsx
import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'
import { completeEntry, deleteEntry, undoComplete } from '../db/repo'

export function ListPage({ onOpenEntry }: { onOpenEntry: (id: string) => void }) {
  const { rows, reload } = useUserEntries()
  const status = (id: string) => rows.find(r => r.id === id)?.status
  const todos = book.entries.filter(e => status(e.id) === 'todo')
  const dones = book.entries.filter(e => status(e.id) === 'done')
  return (
    <section class="page">
      <h2>清单</h2>
      {todos.length === 0 && dones.length === 0 && <div class="empty">清单是空的。去「挑」里决策。</div>}
      <ul class="rows">
        {todos.map(e => (
          <li class="row" key={e.id}>
            <input type="checkbox" aria-label={`完成 ${e.title}`} checked={false}
              onInput={async () => { await completeEntry(e.id); reload() }} />
            <span class="row-title" onClick={() => onOpenEntry(e.id)}>{e.title}</span>
            <button class="btn" onClick={async () => { await deleteEntry(e.id); reload() }}>删除</button>
          </li>
        ))}
      </ul>
      <details class="done-box" open={todos.length === 0 && dones.length > 0}>
        <summary>已完成（{dones.length}）</summary>
        <ul class="rows">
          {dones.map(e => (
            <li class="row" key={e.id}>
              <input type="checkbox" aria-label={`撤销 ${e.title}`} checked={true}
                onInput={async () => { await undoComplete(e.id); reload() }} />
              <span class="row-title">{e.title}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/pages/ListPage.test.tsx`
Expected: PASS 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/pages && git commit -m "feat: 清单页——打勾完成/撤销/折叠已完成/删除回未评估"
```

---

### Task 9: 打卡页（每日打勾 + 连续天数）

**Files:**
- Modify: `src/pages/HabitsPage.tsx`（整体重写）
- Test: `src/pages/HabitsPage.test.tsx`

**Interfaces:**
- Consumes: `book`、`useUserEntries`、`toggleCheckIn/getCheckInDates`、`computeStreak`、`todayStr`
- Produces: 无

- [ ] **Step 1: 写失败测试**

`src/pages/HabitsPage.test.tsx`：

```tsx
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

beforeEach(async () => { await db.delete() })

test('显示习惯与连续天数；今日打卡切换', async () => {
  await repo.decideHabit('01-01')
  const today = todayStr()
  await repo.toggleCheckIn('01-01', addDays(today, -1))
  render(<HabitsPage onOpenEntry={() => {}} />)
  expect(await screen.findByText('戒烟')).toBeTruthy()
  expect(screen.getByText(/连续 1 天/)).toBeTruthy() // 今天未打，数到昨天
  fireEvent.click(screen.getByLabelText(`打卡 戒烟`))
  expect(await screen.findByText(/连续 2 天/)).toBeTruthy()
  expect((await repo.getCheckInDates('01-01'))).toHaveLength(2)
  fireEvent.click(screen.getByLabelText(`打卡 戒烟`))
  expect(await screen.findByText(/连续 1 天/)).toBeTruthy() // 取消今天，回到昨天
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/HabitsPage.test.tsx`
Expected: FAIL — 找不到「戒烟」

- [ ] **Step 3: 实现（重写 `src/pages/HabitsPage.tsx`）**

```tsx
import { useEffect, useState } from 'preact/hooks'
import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'
import { getCheckInDates, toggleCheckIn } from '../db/repo'
import { computeStreak } from '../domain/streak'
import { todayStr } from '../domain/dates'

export function HabitsPage({ onOpenEntry }: { onOpenEntry: (id: string) => void }) {
  const { rows, reload } = useUserEntries()
  const habits = book.entries.filter(e => rows.find(r => r.id === e.id)?.status === 'habit')
  const today = todayStr()
  const [dates, setDates] = useState<Record<string, string[]>>({})

  const loadDates = async () => {
    const d: Record<string, string[]> = {}
    for (const h of habits) d[h.id] = await getCheckInDates(h.id)
    setDates(d)
  }
  useEffect(() => { loadDates() }, [habits.map(h => h.id).join(',')])

  return (
    <section class="page">
      <h2>打卡</h2>
      {habits.length === 0 && <div class="empty">还没有要重复做的事。在「挑」里选「要重复」。</div>}
      <ul class="rows">
        {habits.map(h => {
          const row = rows.find(r => r.id === h.id)!
          const checked = dates[h.id]?.includes(today) ?? false
          return (
            <li class="row" key={h.id}>
              <input type="checkbox" aria-label={`打卡 ${h.title}`} checked={checked}
                onInput={async () => { await toggleCheckIn(h.id, today); await loadDates(); reload() }} />
              <span class="row-title" onClick={() => onOpenEntry(h.id)}>{h.title}</span>
              <span class="streak">连续 {computeStreak(dates[h.id] ?? [], row.decidedAt, today)} 天</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/pages/HabitsPage.test.tsx`
Expected: PASS 1 test

- [ ] **Step 5: Commit**

```bash
git add src/pages && git commit -m "feat: 打卡页——每日打勾/取消 + 连续天数（decidedAt 锚定）"
```

---

### Task 10: 浏览页 + 条目详情（搜索/收藏/状态操作）

**Files:**
- Create: `src/db/use-favorites.ts`
- Modify: `src/pages/BrowsePage.tsx`（重写）、`src/pages/EntryDetail.tsx`（重写）
- Test: `src/pages/BrowsePage.test.tsx`

**Interfaces:**
- Consumes: `book`、`filterEntries`、repo 全套
- Produces: `useFavorites(): { ids: Set<string>; reload: () => void }`（`src/db/use-favorites.ts`）

- [ ] **Step 1: 写失败测试**

`src/pages/BrowsePage.test.tsx`：

```tsx
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

beforeEach(async () => { await db.delete() })

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
  expect(screen.getByText('戒烟')).toBeTruthy()
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/BrowsePage.test.tsx`
Expected: FAIL — `../db/use-favorites` 不存在

- [ ] **Step 3: 实现**

`src/db/use-favorites.ts`：

```ts
import { useEffect, useState } from 'preact/hooks'
import { getFavoriteIds } from './repo'

export function useFavorites(): { ids: Set<string>; reload: () => void } {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const reload = () => { getFavoriteIds().then(setIds) }
  useEffect(reload, [])
  return { ids, reload }
}
```

`src/pages/BrowsePage.tsx`（重写）：

```tsx
import { useState } from 'preact/hooks'
import { book } from '../content/book'
import { filterEntries } from '../domain/search'
import { useFavorites } from '../db/use-favorites'
import type { ContentEntry } from '../content/types'

export function BrowsePage({ onOpenEntry }: { onOpenEntry: (id: string) => void }) {
  const [q, setQ] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const { ids: favIds } = useFavorites()
  let list: ContentEntry[] = filterEntries(book.entries, q)
  if (favOnly) list = list.filter(e => favIds.has(e.id))
  const bySection = new Map<string, ContentEntry[]>()
  for (const e of list) {
    const arr = bySection.get(e.sectionId) ?? []
    arr.push(e)
    bySection.set(e.sectionId, arr)
  }
  return (
    <section class="page">
      <input class="searchbox" placeholder="搜索标题/说人话/收益"
        value={q} onInput={e => setQ((e.target as HTMLInputElement).value)} />
      <label class="fav-toggle">
        <input type="checkbox" aria-label="只看收藏" checked={favOnly} onInput={() => setFavOnly(!favOnly)} />只看收藏
      </label>
      {list.length === 0 && <div class="empty">没有匹配的条目</div>}
      {[...bySection.entries()].map(([sid, es]) => (
        <div class="section-block" key={sid}>
          <h3>{book.sections.find(s => s.id === sid)?.title}（{es.length}）</h3>
          <ul class="rows">
            {es.map(e => (
              <li class="row" key={e.id} onClick={() => onOpenEntry(e.id)}>
                <span class="badge">{e.evidenceGrade}</span>
                <span class="row-title">{e.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
```

`src/pages/EntryDetail.tsx`（重写）：

```tsx
import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'
import { useFavorites } from '../db/use-favorites'
import { convertTo, decideHabit, decideTodo, rejectEntry, setFavorite } from '../db/repo'

export function EntryDetail({ entryId, onClose }: { entryId: string; onClose: () => void }) {
  const e = book.entries.find(x => x.id === entryId)
  const { rows, reload } = useUserEntries()
  const { ids: favIds, reload: reloadFav } = useFavorites()
  if (!e) return null
  const row = rows.find(r => r.id === entryId)
  const fav = favIds.has(entryId)
  const act = async (fn: () => Promise<void>) => { await fn(); await reload(); await reloadFav() }
  return (
    <div class="detail-backdrop" onClick={onClose}>
      <div class="detail" onClick={ev => ev.stopPropagation()}>
        <div class="card-top">
          <span class="muted">{book.sections.find(s => s.id === e.sectionId)?.title}</span>
          <button class="star" data-testid="fav" aria-label="收藏" onClick={() => act(() => setFavorite(entryId, !fav))}>{fav ? '★' : '☆'}</button>
        </div>
        <h3>{e.title}</h3>
        <p class="badge">证据 {e.evidenceGrade}{e.meta ? ` · 钱=${e.meta.money ?? '?'} 时间=${e.meta.time ?? '?'} 毅力=${e.meta.willpower ?? '?'} 收益=${e.meta.gain ?? '?'}` : ''}</p>
        {e.plainSpeak && <p><b>说人话：</b>{e.plainSpeak}</p>}
        {e.cost && <p><b>成本：</b>{e.cost}</p>}
        {e.benefit && <p><b>收益：</b>{e.benefit}</p>}
        {e.note && <p><b>备注：</b>{e.note}</p>}
        {e.source && <p class="muted"><b>来源：</b>{e.source}</p>}
        <div class="actions">
          {!row && <>
            <button class="btn btn-primary" onClick={() => act(() => decideTodo(entryId))}>做一次</button>
            <button class="btn" onClick={() => act(() => decideHabit(entryId))}>要重复</button>
            <button class="btn" onClick={() => act(() => rejectEntry(entryId))}>不做</button>
          </>}
          {row?.status === 'todo' && <>
            <button class="btn" onClick={() => act(() => convertTo(entryId, 'habit'))}>改为打卡</button>
            <button class="btn" onClick={() => act(() => rejectEntry(entryId))}>不做</button>
          </>}
          {row?.status === 'habit' && <>
            <button class="btn" onClick={() => act(() => convertTo(entryId, 'todo'))}>改为清单</button>
            <button class="btn" onClick={() => act(() => rejectEntry(entryId))}>不做</button>
          </>}
          {row?.status === 'done' && <span class="muted">已完成</span>}
          <button class="btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + 全量回归**

Run: `npx vitest run src/pages/BrowsePage.test.tsx` → PASS 4 tests
Run: `npx vitest run` → 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src && git commit -m "feat: 浏览页+详情——分组/搜索/只看收藏/全字段/状态操作"
```

---

### Task 11: 设置页（不做列表/恢复 + 导出导入备份）

**Files:**
- Modify: `src/pages/SettingsPage.tsx`（整体重写）
- Test: `src/pages/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: `book`、`useUserEntries`、`restoreEntry/exportData/importData`（含 `Backup` 类型）
- Produces: 无

- [ ] **Step 1: 写失败测试**

`src/pages/SettingsPage.test.tsx`：

```tsx
import { beforeEach, expect, test, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/preact'
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

beforeEach(async () => { await db.delete() })

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
  await db.delete()
  render(<SettingsPage />)
  const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' })
  fireEvent.input(screen.getByLabelText('导入备份'), { target: { files: [file] } })
  await screen.findByText('不做（0）')
  expect(await repo.getFavoriteIds()).toEqual(new Set(['01-01']))
  expect((await repo.getAllUserEntries())[0].status).toBe('habit')
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`
Expected: FAIL — 找不到「恢复」

- [ ] **Step 3: 实现（重写 `src/pages/SettingsPage.tsx`）**

```tsx
import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'
import { exportData, importData, restoreEntry } from '../db/repo'
import type { Backup } from '../db/repo'

export function SettingsPage() {
  const { rows, reload } = useUserEntries()
  const rejected = book.entries.filter(e => rows.find(r => r.id === e.id)?.status === 'rejected')

  const onExport = async () => {
    const blob = new Blob([JSON.stringify(await exportData())], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `livebetter-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const onImport = async (file: File) => {
    await importData(JSON.parse(await file.text()) as Backup)
    reload()
  }

  return (
    <section class="page">
      <h2>设置</h2>
      <h3>不做（{rejected.length}）</h3>
      <ul class="rows">
        {rejected.map(e => (
          <li class="row" key={e.id}>
            <span class="row-title">{e.title}</span>
            <button class="btn" onClick={async () => { await restoreEntry(e.id); reload() }}>恢复</button>
          </li>
        ))}
      </ul>
      <h3>数据</h3>
      <div class="actions">
        <button class="btn" onClick={onExport}>导出备份</button>
        <label class="btn">
          导入备份
          <input type="file" accept="application/json" aria-label="导入备份" style="display:none"
            onInput={e => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) onImport(f) }} />
        </label>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/pages/SettingsPage.test.tsx`
Expected: PASS 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/pages && git commit -m "feat: 设置页——不做列表恢复 + 备份导出/导入"
```

---

### Task 12: PWA（manifest + SW + 更新提示）与构建

**Files:**
- Modify: `vite.config.ts`、`src/main.tsx`、`tsconfig.json`（types 数组加 `"vite-plugin-pwa/client"`）
- Install: `vite-plugin-pwa`（devDependency）

**Interfaces:**
- Consumes: 已入库的 `public/icons/icon-192.png`、`public/icons/icon-512.png`
- Produces: 可安装、可离线的生产构建（`dist/` + sw.js + manifest.webmanifest）

- [ ] **Step 1: 安装依赖并改配置**

Run: `npm i -D vite-plugin-pwa`

`vite.config.ts`（重写）：

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    preact(),
    VitePWA({
      base: './',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'LiveBetter 高性价比人生指南',
        short_name: 'LiveBetter',
        start_url: './',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#228b22',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,json}'] },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: './tests/setup.ts' },
})
```

`tsconfig.json` 的 `"types"` 改为 `["vite/client", "vite-plugin-pwa/client"]`。

`src/main.tsx`（重写）：

```tsx
import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import './styles.css'

registerSW({
  onNeedRefresh() {
    const toast = document.createElement('div')
    toast.className = 'update-toast'
    const text = document.createElement('span')
    text.textContent = '有新版本'
    const btn = document.createElement('button')
    btn.className = 'btn btn-primary'
    btn.textContent = '刷新'
    btn.onclick = () => location.reload()
    toast.append(text, btn)
    document.body.appendChild(toast)
  },
})

render(<App />, document.getElementById('app')!)
```

- [ ] **Step 2: 全量测试不回归 + 生产构建**

Run: `npx vitest run`
Expected: 全部 PASS
Run: `npm run build`
Expected: 构建成功，输出含 `dist/sw.js`、`dist/manifest.webmanifest`、`dist/index.html`、icons 与 JS/CSS 资产

- [ ] **Step 3: 预览验证 PWA 资产**

Run: `npx vite preview --port 4173`，浏览器检查：`http://localhost:4173/manifest.webmanifest` 返回 JSON；`http://localhost:4173/sw.js` 非空；DevTools → Application → Service Workers 已激活。

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: PWA——manifest/预缓存/自动更新提示"
```

---

### Task 13: README、全链路冒烟与部署

**Files:**
- Modify: `README.md`（整体重写）

**Interfaces:**
- Consumes: 全部
- Produces: 部署在 GitHub Pages 的可用站点（需用户提供 repo）

- [ ] **Step 1: 重写 README**

```markdown
# LiveBetter

《高性价比人生指南》自用离线 PWA：滑卡决定做不做——做一次的进清单，要重复的设为打卡。数据全在本机 IndexedDB，飞行模式可用。

## 开发

- `npm install`
- `npm run dev` — 本地开发
- `npm test` — 全部测试
- `npm run build:content` — 重新从上游拉取 book/*.md 生成 src/data/entries.json（需网络与 git；内容更新后执行并提交）
- `npm run build && npm run preview` — 生产构建预览

## 部署（GitHub Pages）

1. 在 GitHub 建公开仓库（如 `yourname/livebetter`），把本仓库推上去。
2. `npm run deploy`（gh-pages 把 dist/ 推到 gh-pages 分支）。
3. 仓库 Settings → Pages → Source 选 `gh-pages` 分支。
4. 手机 Chrome 打开 `https://yourname.github.io/livebetter/` → 「添加到主屏幕」。
5. 真机验证：开飞行模式打开 App，全部功能可用。

## 数据与备份

决策/打卡/收藏存浏览器 IndexedDB；「设置 → 导出备份」得到 JSON，换机或清数据前先导出，「导入备份」恢复。打卡记录是不可变历史（见 docs/adr/0002）。

## 内容来源与许可

条目内容来自 [eternity4719/HowToLiveBetter](https://github.com/eternity4719/HowToLiveBetter)（CC-BY-4.0，解析时 commit 记录于 entries.json 的 version 字段）。本项目代码 MIT。
```

- [ ] **Step 2: 全量验证**

Run: `npx vitest run` → 全部 PASS
Run: `npm run build:content` → `OK entries=6xx …`（顺带刷新内容）
Run: `npm run build` → 成功

- [ ] **Step 3: 浏览器全链路冒烟（dev server）**

`npm run dev` 后在浏览器过一遍：挑页滑卡（鼠标拖拽卡片区）→ 做 → 弹层选做一次/要重复 → 清单打勾/撤销/删除 → 打卡连续天数 → 浏览搜索/收藏/只看收藏 → 详情各状态按钮 → 设置恢复不做 + 导出/导入 → 每日一读点击进详情。

- [ ] **Step 4: 部署（用户动作）**

向用户要 repo 地址 → `git remote add origin <url> && git push -u origin main` → `npm run deploy` → Pages 设置 gh-pages 分支 → 手机安装验证离线。

- [ ] **Step 5: Commit**

```bash
git add README.md && git commit -m "docs: README——开发/更新/部署/备份/署名"
```

---

## 计划自审记录（写完已跑）

1. **Spec 覆盖**：spec §数据管线→Task 2/3；§数据模型四表→Task 4；状态机全转换→Task 4 测试 + Task 7-11 UI；§页面五条→Task 6-11；§离线部署→Task 12/13；§测试策略→各任务；拷1-拷6→Task 4（收藏独立表/无补签/decidedAt）、Task 7（书序/每日一读去重）、Task 10（互转）、Task 11（恢复/备份）。
2. **占位符扫描**：无 TBD/TODO；Task 6 最小页面是「可渲染的真实增量」，随后续任务重写，非未完成交付。
3. **类型一致性**：`ContentEntry/Book/UserEntry/CheckIn/DailyRead/Favorite/Backup`、repo 函数名、`useUserEntries/useFavorites`、页面 props `{ onOpenEntry }`、`swipeAction` 在各任务间已核对一致。
