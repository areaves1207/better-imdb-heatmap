// Shapes of the generated files in public/data. Shared by the build script and the app.

export interface Episode {
  /** Episode number within the season */
  n: number
  /** IMDb id, e.g. tt0959621 */
  id: string
  title: string
  rating: number
  votes: number
}

export interface Season {
  number: number
  episodes: Episode[]
}

export interface ShowData {
  id: string
  title: string
  startYear: number | null
  endYear: number | null
  rating: number | null
  votes: number
  seasons: Season[]
}

/** [id, title, startYear, endYear, votes, rating] — tuple keeps the search index small */
export type IndexEntry = [string, string, number | null, number | null, number, number | null]

export interface SearchIndex {
  generated: string
  shows: IndexEntry[]
}
