// Small wrappers around the popup's localStorage (each extension has its own).

export interface RecentShow {
  id: string
  title: string
  startYear: number | null
  endYear: number | null
  rating: number | null
}

const RECENT_KEY = 'recentShows'
const MAX_RECENT = 6

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // storage blocked: nothing is remembered, which is fine
  }
}

export function readRecent(): RecentShow[] {
  try {
    const list = JSON.parse(readStored(RECENT_KEY) ?? '[]')
    return Array.isArray(list) ? list.slice(0, MAX_RECENT) : []
  } catch {
    return []
  }
}

/** Moves the show to the front of the recent list (most recent first, at most 6). */
export function addRecent(show: RecentShow) {
  const list = [show, ...readRecent().filter((s) => s.id !== show.id)].slice(0, MAX_RECENT)
  writeStored(RECENT_KEY, JSON.stringify(list))
}

/** Which season was selected for a show, so reopening the popup keeps it. */
export const seasonKey = (showId: string) => `season:${showId}`

/**
 * Seasons layout chosen with the toggle: 'top' = seasons across the top, 'left' = seasons down the
 * left. null = never changed, so the default (top) applies.
 */
export type SeasonLayout = 'top' | 'left'
const LAYOUT_KEY = 'seasonLayout'

export function readLayout(): SeasonLayout | null {
  const v = readStored(LAYOUT_KEY)
  return v === 'top' || v === 'left' ? v : null
}

export function writeLayout(layout: SeasonLayout) {
  writeStored(LAYOUT_KEY, layout)
}

/**
 * Where the popup was when it closed: the open show (null = start page) and the episode in the
 * large view (null = the grid/list). Chrome closes popups without warning, so this is saved on
 * every change rather than on close.
 */
export interface PopupView {
  showId: string | null
  episodeId: string | null
}

const VIEW_KEY = 'popupView'

export function readView(): PopupView {
  try {
    const v = JSON.parse(readStored(VIEW_KEY) ?? 'null')
    return { showId: v?.showId ?? null, episodeId: v?.episodeId ?? null }
  } catch {
    return { showId: null, episodeId: null }
  }
}

export function writeView(view: PopupView) {
  writeStored(VIEW_KEY, JSON.stringify(view))
}
