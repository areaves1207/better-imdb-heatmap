import { useEffect, useState } from 'react'
import { SearchBox } from '../../src/components/SearchBox.tsx'
import { ThemeToggle } from '../../src/components/ThemeToggle.tsx'
import { formatVotes, formatYears, useShow } from '../../src/data.ts'
import { PALETTES, usePalette, type Palette } from '../../src/palette.ts'
import { PopupHeatmap } from './PopupHeatmap.tsx'
import {
  addRecent,
  readRecent,
  readStored,
  readLayout,
  readView,
  seasonKey,
  writeLayout,
  writeStored,
  writeView,
  type RecentShow,
  type SeasonLayout,
} from './storage.ts'

const SITE_URL = 'https://heatmap.aidanreaves.com'

export function Popup() {
  // Reopens wherever it was last closed (see readView); the back button returns to the start page
  const [initialView] = useState(readView)
  const [showId, setShowIdState] = useState<string | null>(initialView.showId)
  // The saved episode is reopened once; shows opened later in this session start on their grid
  const [restoreEpisode, setRestoreEpisode] = useState<string | null>(initialView.episodeId)

  const setShowId = (id: string | null) => {
    setShowIdState(id)
    setRestoreEpisode(null)
    writeView({ showId: id, episodeId: null })
  }

  return (
    <div className="popup">
      <header className="bar">
        <a className="logo" href={SITE_URL} target="_blank" rel="noreferrer" title="Open heatmap.aidanreaves.com">
          <img src="icons/icon-128.png" alt="IMDb Heatmap" width={26} height={26} />
        </a>
        <SearchBox onSelect={setShowId} autoFocus={showId === null} placeholder="Search a show…" />
        <ThemeToggle />
      </header>

      <main className="content">
        {showId ? (
          <ShowView
            key={showId}
            id={showId}
            initialEpisodeId={restoreEpisode}
            onBack={() => setShowId(null)}
          />
        ) : (
          <Home onSelect={setShowId} />
        )}
        <p className="credit">Information courtesy of IMDb (imdb.com). Used with permission.</p>
      </main>
    </div>
  )
}

function Home({ onSelect }: { onSelect: (id: string) => void }) {
  const [recent] = useState<RecentShow[]>(readRecent)

  if (recent.length === 0) {
    return <p className="empty">Search for the show you're watching to see how every episode rates.</p>
  }

  return (
    <section>
      <h2 className="section-title">Recent</h2>
      <ul className="recent">
        {recent.map((s) => (
          <li key={s.id}>
            <button type="button" onClick={() => onSelect(s.id)}>
              <span className="recent-title">{s.title}</span>
              <span className="recent-meta">
                {formatYears(s.startYear, s.endYear)}
                {s.rating !== null && ` · ★ ${s.rating.toFixed(1)}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function ShowView({
  id,
  initialEpisodeId,
  onBack,
}: {
  id: string
  initialEpisodeId: string | null
  onBack: () => void
}) {
  const show = useShow(id)
  const [palette, setPalette] = usePalette()
  // Seasons across the top unless the user has switched to Left (remembered for every show)
  const [layout, setLayout] = useState<SeasonLayout>(() => readLayout() ?? 'top')

  // Remember shows as they're opened, for the start page's recent grid
  useEffect(() => {
    if (show.status !== 'ready') return
    const s = show.data
    addRecent({ id: s.id, title: s.title, startYear: s.startYear, endYear: s.endYear, rating: s.rating })
  }, [show])

  const header = (title: React.ReactNode, meta?: React.ReactNode) => (
    <div className="show-head">
      <button type="button" className="back" onClick={onBack} aria-label="Back to start" title="Back">
        ←
      </button>
      <div className="show-text">
        <h1>{title}</h1>
        {meta && <p className="show-meta">{meta}</p>}
      </div>
    </div>
  )

  if (show.status === 'loading') return header('Loading…')
  if (show.status === 'error') return header("Couldn't load this show", show.error)

  const s = show.data
  const stored = readStored(seasonKey(id))
  const chooseLayout = (l: SeasonLayout) => {
    setLayout(l)
    writeLayout(l)
  }

  return (
    <>
      {header(
        s.title,
        <>
          {formatYears(s.startYear, s.endYear)}
          {s.rating !== null && (
            <>
              {' · '}
              <strong>★ {s.rating.toFixed(1)}</strong> ({formatVotes(s.votes)})
            </>
          )}
        </>,
      )}

      <div className="controls">
        <label className="control">
          Colors
          <select value={palette} onChange={(e) => setPalette(e.target.value as Palette)}>
            {PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="control">
          Seasons
          <div className="segmented" role="group" aria-label="Where seasons go">
            <button type="button" aria-pressed={layout === 'top'} onClick={() => chooseLayout('top')}>
              Top
            </button>
            <button type="button" aria-pressed={layout === 'left'} onClick={() => chooseLayout('left')}>
              Left
            </button>
          </div>
        </div>
      </div>

      <PopupHeatmap
        seasons={s.seasons}
        initialSeason={stored ? Number(stored) : null}
        onSeasonChange={(n) => writeStored(seasonKey(id), n === null ? null : String(n))}
        initialEpisodeId={initialEpisodeId}
        onEpisodeChange={(episodeId) => writeView({ showId: id, episodeId })}
        byColumns={layout === 'top'}
      />
    </>
  )
}
