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
