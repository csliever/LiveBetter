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
  const flush = () => {
    if (cur) entries.push(cur)
    cur = null
  }
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
