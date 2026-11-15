import { Link, Route, Routes, useLocation } from 'react-router'
import { SearchBox } from './components/SearchBox.tsx'
import { useSearchIndex } from './data.ts'
import { HomePage } from './pages/HomePage.tsx'
import { ShowPage } from './pages/ShowPage.tsx'

export default function App() {
  const { pathname } = useLocation()
  const index = useSearchIndex()
  const onHome = pathname === '/'

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden />
          Episode Heatmap
        </Link>
        {!onHome && <SearchBox />}
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/show/:id" element={<ShowPage />} />
          <Route
            path="*"
            element={
              <p className="status">
                Page not found. <Link to="/">Go home</Link>
              </p>
            }
          />
        </Routes>
      </main>

      <footer className="footer">
        <p>
          Information courtesy of IMDb (
          <a href="https://www.imdb.com" target="_blank" rel="noreferrer">
            https://www.imdb.com
          </a>
          ). Used with permission. Posters from{' '}
          <a href="https://www.tvmaze.com" target="_blank" rel="noreferrer">
            TVmaze
          </a>
          .
        </p>
        {index.status === 'ready' && (
          <p>Ratings updated {new Date(index.data.generated).toLocaleDateString()}.</p>
        )}
      </footer>
    </div>
  )
}
