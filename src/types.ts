// Shapes returned by the Supabase functions in supabase/schema.sql.

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

/** Returned by get_show(): a show with all its seasons and episodes */
export interface ShowData {
  id: string
  title: string
  startYear: number | null
  endYear: number | null
  rating: number | null
  votes: number
  seasons: Season[]
}

/** A row of the shows table, returned by search_shows() and popular_shows() */
export interface ShowSummary {
  id: string
  title: string
  start_year: number | null
  end_year: number | null
  rating: number | null
  votes: number
}
