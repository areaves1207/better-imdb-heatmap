import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import { SearchBox } from '../components/SearchBox.tsx'
import { formatYears, usePopularShows } from '../data.ts'

export function HomePage() {
  const popular = usePopularShows()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'IMDb Heatmap'
  }, [])

  return (
    <div className="home">
      <section className="hero">
        <h1>IMDb Heatmaps</h1>
        <p>Search a TV show to see a heatmap of its IMDb episode ratings</p>
        <SearchBox autoFocus onSelect={(id) => navigate(`/show/${id}`)} />
      </section>

      <section>
        <h2>Most rated shows</h2>
        {popular.status === 'loading' && <p className="status">Loading…</p>}
        {popular.status === 'error' && <p className="status">Couldn't load shows ({popular.error}).</p>}
        {popular.status === 'ready' && (
          <ul className="popular">
            {popular.data.map(({ id, title, start_year, end_year, rating }) => (
              <li key={id}>
                <Link to={`/show/${id}`}>
                  <span className="popular-title">{title}</span>
                  <span className="popular-meta">
                    {formatYears(start_year, end_year)}
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
