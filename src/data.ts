import { useEffect, useState } from 'react'
import type { IndexEntry, SearchIndex, ShowData } from './types.ts'

const DATA_URL = `${import.meta.env.BASE_URL}data/`

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: T }

const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined
  if (!p) {
    p = fetch(url).then((res) => {
      if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : `HTTP ${res.status}`)
      return res.json() as Promise<T>
    })
    p.catch(() => cache.delete(url))
    cache.set(url, p)
  }
  return p
}

function useJson<T>(url: string | null): Loadable<T> {
  const [state, setState] = useState<{ url: string | null; value: Loadable<T> }>({
    url,
    value: { status: 'loading' },
  })
  useEffect(() => {
    if (!url) return
    let cancelled = false
    fetchJson<T>(url).then(
      (data) => !cancelled && setState({ url, value: { status: 'ready', data } }),
      (err: Error) => !cancelled && setState({ url, value: { status: 'error', error: err.message } }),
    )
    return () => {
      cancelled = true
    }
  }, [url])
  return state.url === url ? state.value : { status: 'loading' }
}

export const useSearchIndex = () => useJson<SearchIndex>(`${DATA_URL}index.json`)

export const useShow = (id: string | undefined) =>
  useJson<ShowData>(id && /^tt\d+$/.test(id) ? `${DATA_URL}shows/${id}.json` : null)

/** Poster from TVmaze (free, no key, CORS enabled). Optional — returns null on any failure. */
export function usePoster(imdbId: string | undefined): string | null {
  const [poster, setPoster] = useState<{ id?: string; url: string | null }>({ url: null })
  useEffect(() => {
    if (!imdbId) return
    let cancelled = false
    fetchJson<{ image?: { medium?: string } | null }>(
      `https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`,
    ).then(
      (show) => !cancelled && setPoster({ id: imdbId, url: show?.image?.medium ?? null }),
      () => !cancelled && setPoster({ id: imdbId, url: null }),
    )
    return () => {
      cancelled = true
    }
  }, [imdbId])
  return poster.id === imdbId ? poster.url : null
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const normalizedTitles = new WeakMap<IndexEntry[], string[]>()

/** Ranks by match quality, then by popularity (the index is pre-sorted by votes). */
export function searchShows(shows: IndexEntry[], query: string, limit = 8): IndexEntry[] {
  const q = normalize(query)
  if (!q) return []
  let titles = normalizedTitles.get(shows)
  if (!titles) normalizedTitles.set(shows, (titles = shows.map((s) => normalize(s[1]))))

  const scored: { entry: IndexEntry; score: number }[] = []
  for (let i = 0; i < shows.length; i++) {
    const t = titles[i]
    let score = 0
    if (t === q) score = 4
    else if (t.startsWith(q)) score = 3
    else if (t.includes(' ' + q)) score = 2
    else if (t.includes(q)) score = 1
    if (score) scored.push({ entry: shows[i], score })
  }
  // Stable sort keeps the vote ordering within each score tier
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((s) => s.entry)
}

export const formatYears = (start: number | null, end: number | null) =>
  start ? (end && end !== start ? `${start}–${end}` : end ? `${start}` : `${start}–`) : ''

export const formatVotes = (v: number) =>
  v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v}`
