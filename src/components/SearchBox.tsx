import { useId, useState } from 'react'
import { useNavigate } from 'react-router'
import { configError, formatYears, useSearch } from '../data.ts'

export function SearchBox({
  autoFocus = false,
  placeholder = 'Search a TV show, e.g. Breaking Bad',
}: {
  autoFocus?: boolean
  placeholder?: string
}) {
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  const search = useSearch(query)
  const results = search.status === 'ready' ? search.data : []

  const go = (id: string) => {
    setQuery('')
    setOpen(false)
    navigate(`/show/${id}`)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[Math.min(active, results.length - 1)].id)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && query.trim() !== ''

  return (
    <div className="search">
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && results.length ? `${listId}-${active}` : undefined}
        aria-label="Search TV shows"
        placeholder={configError ? 'Search unavailable' : placeholder}
        disabled={!!configError}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul className="search-results" id={listId} role="listbox">
          {search.status === 'loading' && <li className="search-empty">Searching…</li>}
          {search.status === 'error' && <li className="search-empty">Search failed: {search.error}</li>}
          {search.status === 'ready' && results.length === 0 && (
            <li className="search-empty">No matching shows</li>
          )}
          {results.map(({ id, title, start_year, end_year, rating }, i) => (
            <li
              key={id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : undefined}
              // mousedown fires before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault()
                go(id)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="search-title">{title}</span>
              <span className="search-meta">
                {formatYears(start_year, end_year)}
                {rating !== null && <> · ★ {rating.toFixed(1)}</>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
