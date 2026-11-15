import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { formatYears, searchShows, useSearchIndex } from '../data.ts'

export function SearchBox({ autoFocus = false }: { autoFocus?: boolean }) {
  const index = useSearchIndex()
  const navigate = useNavigate()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(false)

  const results = useMemo(
    () => (index.status === 'ready' ? searchShows(index.data.shows, query) : []),
    [index, query],
  )

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
      go(results[active][0])
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
        placeholder={index.status === 'error' ? 'Search unavailable' : 'Search a TV show, e.g. Breaking Bad'}
        disabled={index.status === 'error'}
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
          {index.status === 'loading' && <li className="search-empty">Loading shows…</li>}
          {index.status === 'ready' && results.length === 0 && (
            <li className="search-empty">No matching shows</li>
          )}
          {results.map(([id, title, start, end, , rating], i) => (
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
                {formatYears(start, end)}
                {rating !== null && <> · ★ {rating.toFixed(1)}</>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
