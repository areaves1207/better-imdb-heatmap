import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { ShowData, ShowSummary } from './types.ts'

// Public values: the anon/publishable key can only read, thanks to the RLS policies in
// supabase/schema.sql. They're set in .env (committed).
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined

export const configError =
  !SUPABASE_URL || !SUPABASE_KEY ? 'VITE_SUPABASE_URL and VITE_SUPABASE_KEY are not set in .env' : null

const supabase = configError ? null : createClient(SUPABASE_URL!, SUPABASE_KEY!)

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T }

// Results are cached for the session so going back to a show is instant
const cache = new Map<string, Promise<unknown>>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined
  if (!p) {
    p = load()
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error(configError!)
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

/** Runs load(key) whenever key changes; null key means "nothing to load". */
function useQuery<T>(key: string | null, load: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<{ key: string | null; value: Loadable<T> }>({
    key,
    value: { status: 'loading' },
  })
  useEffect(() => {
    if (key === null) return
    let cancelled = false
    cached(key, load).then(
      (data) => !cancelled && setState({ key, value: { status: 'ready', data } }),
      (err: Error) => !cancelled && setState({ key, value: { status: 'error', error: err.message } }),
    )
    return () => {
      cancelled = true
    }
    // load is derived from key, so key alone decides when to refetch
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state.value : { status: 'loading' }
}

export function useShow(id: string | undefined): Loadable<ShowData> {
  const valid = id && /^tt\d+$/.test(id) ? id : null
  const result = useQuery(valid && `show:${valid}`, async () => {
    const show = await rpc<ShowData | null>('get_show', { show_id: valid })
    if (!show) throw new Error('Not found')
    return show
  })
  return valid ? result : { status: 'error', error: 'Not found' }
}

export const usePopularShows = () =>
  useQuery('popular', () => rpc<ShowSummary[]>('popular_shows', { max_results: 24 }))

export const useRefreshedAt = () =>
  useQuery('refreshed', async () => {
    if (!supabase) throw new Error(configError!)
    const { data, error } = await supabase.from('data_refresh').select('refreshed_at').maybeSingle()
    if (error) throw new Error(error.message)
    return data ? new Date(data.refreshed_at as string) : null
  })

/** Debounced search: waits until typing pauses for 150 ms before querying. */
export function useSearch(query: string): Loadable<ShowSummary[]> {
  const trimmed = query.trim()
  const [debounced, setDebounced] = useState(trimmed)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(trimmed), 150)
    return () => clearTimeout(t)
  }, [trimmed])
  const result = useQuery(debounced ? `search:${debounced.toLowerCase()}` : null, () =>
    rpc<ShowSummary[]>('search_shows', { q: debounced, max_results: 8 }),
  )
  if (!trimmed) return { status: 'ready', data: [] }
  return debounced === trimmed ? result : { status: 'loading' }
}

/** Poster from TVmaze (free, no key, CORS enabled). Optional: returns null on any failure. */
export function usePoster(imdbId: string | undefined): string | null {
  const result = useQuery(imdbId ? `poster:${imdbId}` : null, async () => {
    const res = await fetch(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`)
    if (!res.ok) return null
    const show = (await res.json()) as { image?: { medium?: string } | null }
    return show?.image?.medium ?? null
  })
  return result.status === 'ready' ? result.data : null
}

export const formatYears = (start: number | null, end: number | null) =>
  start ? (end && end !== start ? `${start}–${end}` : end ? `${start}` : `${start}–`) : ''

export const formatVotes = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v}`
