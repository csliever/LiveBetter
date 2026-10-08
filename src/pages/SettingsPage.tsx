import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'
import { exportData, importData, restoreEntry } from '../db/repo'
import type { Backup } from '../db/repo'

const readAsText = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result))
  r.onerror = () => reject(r.error)
  r.readAsText(file)
})

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

const readAsText = (file: File) => new Promise<string>((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result))
  r.onerror = () => reject(r.error)
  r.readAsText(file)
})

const onImport = async (file: File) => {
  await importData(JSON.parse(await readAsText(file)) as Backup)
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
