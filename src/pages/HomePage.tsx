import { useEffect } from 'react'
import { Link } from 'react-router'
import { SearchBox } from '../components/SearchBox.tsx'
import { formatYears, useSearchIndex } from '../data.ts'

export function HomePage() {
  const index = useSearchIndex()

  useEffect(() => {
    document.title = 'Episode Heatmap'
  }, [])

  return (
    <div className="home">
      <section className="hero">
        <h1>Every episode, at a glance</h1>
        <p>Search a TV show to see a heatmap of its IMDb episode ratings, season by season.</p>
        <SearchBox autoFocus />
      </section>

      <section>
        <h2>Most rated shows</h2>
        {index.status === 'loading' && <p className="status">Loading…</p>}
        {index.status === 'error' && (
          <p className="status">
            Couldn't load show data ({index.error}). If you're running locally, run <code>npm run data</code> first.
          </p>
        )}
        {index.status === 'ready' && (
          <ul className="popular">
            {index.data.shows.slice(0, 24).map(([id, title, start, end, , rating]) => (
              <li key={id}>
                <Link to={`/show/${id}`}>
                  <span className="popular-title">{title}</span>
                  <span className="popular-meta">
                    {formatYears(start, end)}
                    {rating !== null && ` · ★ ${rating.toFixed(1)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
