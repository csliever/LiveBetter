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
