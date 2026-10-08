import { useEffect, useRef, useState } from 'preact/hooks'
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

function Card({ entry, onLeft, onRight, onOpen }: { entry: ContentEntry; onLeft: () => void; onRight: () => void; onOpen: () => void }) {
  const [dx, setDx] = useState(0)
  const [startX, setStartX] = useState<number | null>(null)
  const suppressClick = useRef(false)
  const up = () => {
    const a = swipeAction(dx)
    if (Math.abs(dx) > 8) suppressClick.current = true
    setStartX(null); setDx(0)
    if (a === 'left') onLeft()
    if (a === 'right') onRight()
  }
  return (
    <div class="card" data-testid="deck-card" style={{ transform: `translateX(${dx}px)` }}
      onPointerDown={e => setStartX(e.clientX)}
      onPointerMove={e => { if (startX !== null) setDx(e.clientX - startX) }}
      onPointerUp={up} onPointerLeave={up}
      onClick={e => {
        if (suppressClick.current) { suppressClick.current = false; return }
        if ((e.target as HTMLElement).closest('button')) return
        onOpen()
      }}>
      <div class="card-top">
        <span class={`badge badge-${entry.evidenceGrade.toLowerCase()}`}>{entry.evidenceGrade}</span>
      </div>
      <h3 class="card-title">{entry.title}</h3>
      <p class="plain">{entry.plainSpeak}</p>
      {entry.cost && <p class="cost"><b>成本：</b>{entry.cost}</p>}
      {entry.meta && (
        <div class="chips">
          <span class="chip" data-testid="meta-chip">钱 {entry.meta.money ?? '?'}</span>
          <span class="chip" data-testid="meta-chip">时间 {entry.meta.time ?? '?'}</span>
          <span class="chip" data-testid="meta-chip">毅力 {entry.meta.willpower ?? '?'}</span>
          <span class="chip" data-testid="meta-chip">收益 {entry.meta.gain ?? '?'}</span>
        </div>
      )}
      <div class="actions">
        <button class="btn" onClick={onLeft}>不做</button>
        <button class="btn btn-primary" onClick={onRight}>做</button>
      </div>
      <p class="gesture-hint muted">轻点看完整详情 · 左滑不做 · 右滑要做</p>
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
      <div class="progress-wrap"><div class="progress-bar" data-testid="progress-bar" style={{ width: `${(100 * rows.length) / book.entries.length}%` }} /></div>
      <div class="progress">已评估 {rows.length}/{book.entries.length}</div>
      {dailyEntry && (
        <div class="daily card" onClick={() => onOpenEntry(dailyEntry.id)}>
          <div class="muted">每日一读</div>
          <div class="card-title">{dailyEntry.title}</div>
        </div>
      )}
      {current ? (
        <div class="deck-area">
          {book.entries.filter(e => !decided.has(e.id) && e.id !== current.id).slice(0, 2).map(g => (
            <div class="deck-ghost" data-testid="deck-ghost" key={g.id}><div class="card-title">{g.title}</div></div>
          ))}
          <Card entry={current}
            onLeft={async () => { await rejectEntry(current.id); reload() }}
            onRight={() => setSheet(current)} onOpen={() => onOpenEntry(current.id)} />
        </div>
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
