import { Link, Route, Routes, useLocation, useNavigate } from 'react-router'
import { SearchBox } from './components/SearchBox.tsx'
import { ThemeToggle } from './components/ThemeToggle.tsx'
import { useRefreshedAt } from './data.ts'
import { HomePage } from './pages/HomePage.tsx'
import { ShowPage } from './pages/ShowPage.tsx'

export default function App() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const refreshed = useRefreshedAt()
  const onHome = pathname === '/'

  return (
    <div className="app">
      <header className={`topbar${onHome ? '' : ' with-search'}`}>
        <Link to="/" className="brand" aria-label="IMDb Heatmap home">
          <img
            className="brand-mark"
            src={`${import.meta.env.BASE_URL}imdb-heatmap-logo.png`}
            alt=""
            width={28}
            height={28}
          />
          <span className="brand-name">IMDb Heatmap</span>
        </Link>
        {!onHome && <SearchBox placeholder="Search shows…" onSelect={(id) => navigate(`/show/${id}`)} />}
        <ThemeToggle />
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
        {refreshed.status === 'ready' && refreshed.data && (
          <p>Ratings updated {refreshed.data.toLocaleDateString()}.</p>
        )}
      </footer>
    </div>
  )
}
