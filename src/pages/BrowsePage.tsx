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
