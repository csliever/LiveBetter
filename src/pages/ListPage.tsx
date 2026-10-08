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
