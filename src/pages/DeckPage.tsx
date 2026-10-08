import { book } from '../content/book'
import { useUserEntries } from '../db/use-user'

export function DeckPage(_props: { onOpenEntry: (id: string) => void }) {
  const { rows } = useUserEntries()
  return (
    <section class="page">
      <div class="progress">已评估 {rows.length}/{book.entries.length}</div>
    </section>
  )
}
