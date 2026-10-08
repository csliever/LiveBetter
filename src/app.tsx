import { useState } from 'preact/hooks'
import { DeckPage } from './pages/DeckPage'
import { ListPage } from './pages/ListPage'
import { HabitsPage } from './pages/HabitsPage'
import { BrowsePage } from './pages/BrowsePage'
import { SettingsPage } from './pages/SettingsPage'
import { EntryDetail } from './pages/EntryDetail'

export type Tab = 'deck' | 'list' | 'habits' | 'browse' | 'settings'

export function App() {
  const [tab, setTab] = useState<Tab>('deck')
  const [detailId, setDetailId] = useState<string | null>(null)
  return (
    <div class="app">
      <header class="topbar">
        <span class="brand">LiveBetter</span>
        <button class="gear" aria-label="设置" onClick={() => setTab('settings')}>⚙</button>
      </header>
      <main>
        {tab === 'deck' && <DeckPage onOpenEntry={setDetailId} />}
        {tab === 'list' && <ListPage onOpenEntry={setDetailId} />}
        {tab === 'habits' && <HabitsPage onOpenEntry={setDetailId} />}
        {tab === 'browse' && <BrowsePage onOpenEntry={setDetailId} />}
        {tab === 'settings' && <SettingsPage />}
      </main>
      {detailId && <EntryDetail entryId={detailId} onClose={() => setDetailId(null)} />}
      <div class="tabs-wrap">
        <nav class="tabs" role="navigation">
          <button class={tab === 'deck' ? 'on' : ''} onClick={() => setTab('deck')}>挑</button>
          <button class={tab === 'list' ? 'on' : ''} onClick={() => setTab('list')}>清单</button>
          <button class={tab === 'habits' ? 'on' : ''} onClick={() => setTab('habits')}>打卡</button>
          <button class={tab === 'browse' ? 'on' : ''} onClick={() => setTab('browse')}>浏览</button>
        </nav>
      </div>
    </div>
  )
}
