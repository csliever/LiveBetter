import { useEffect, useState } from 'preact/hooks'
import { getFavoriteIds } from './repo'

export function useFavorites(): { ids: Set<string>; reload: () => void } {
  const [ids, setIds] = useState<Set<string>>(new Set())
  const reload = () => { getFavoriteIds().then(setIds) }
  useEffect(reload, [])
  return { ids, reload }
}
