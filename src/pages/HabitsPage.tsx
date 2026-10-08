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
