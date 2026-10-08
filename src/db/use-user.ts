import { useEffect, useState } from 'preact/hooks'
import { getAllUserEntries } from './repo'
import type { UserEntry } from './db'

export function useUserEntries(): { rows: UserEntry[]; reload: () => void; ready: boolean } {
  const [rows, setRows] = useState<UserEntry[]>([])
  const [ready, setReady] = useState(false)
  const reload = () => { getAllUserEntries().then(r => { setRows(r); setReady(true) }) }
  useEffect(reload, [])
  return { rows, reload, ready }
}
