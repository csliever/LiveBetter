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
