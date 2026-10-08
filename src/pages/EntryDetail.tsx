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
        {e.source && <p class="muted source"><b>来源：</b><LinkifySource text={e.source} /></p>}
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

function LinkifySource({ text }: { text: string }) {
  const parts = text.split(/(<https?:\/\/[^>]+>)/g)
  return (
    <>
      {parts.map((p, i) => p.startsWith('<http')
        ? <a key={i} href={p.slice(1, -1)} target="_blank" rel="noopener noreferrer">{p.slice(1, -1)}</a>
        : p)}
    </>
  )
}
