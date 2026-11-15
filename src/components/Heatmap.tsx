import { useState } from 'react'
import type { Episode, Season } from '../types.ts'
import { BINS, binFor } from '../scale.ts'
import { formatVotes } from '../data.ts'

type Orientation = 'seasons-columns' | 'seasons-rows'

interface Hover {
  season: number
  ep: Episode
  x: number
  y: number
}

const average = (eps: Episode[]) => eps.reduce((s, e) => s + e.rating, 0) / eps.length

export function Heatmap({ seasons }: { seasons: Season[] }) {
  const maxEpisodes = Math.max(...seasons.map((s) => s.episodes.length))
  // Long-running shows (many short seasons) read better with seasons as rows
  const [orientation, setOrientation] = useState<Orientation>(
    seasons.length > maxEpisodes ? 'seasons-rows' : 'seasons-columns',
  )
  const [showAverages, setShowAverages] = useState(true)
  const [hover, setHover] = useState<Hover | null>(null)

  const byColumns = orientation === 'seasons-columns'
  const episodeIdx = Array.from({ length: maxEpisodes }, (_, i) => i)

  const cell = (season: Season, i: number) => {
    const ep = season.episodes[i]
    if (!ep) return <div key={`${season.number}-${i}`} className="cell empty" aria-hidden />
    const bin = binFor(ep.rating)
    const label = `Season ${season.number} episode ${ep.n}, ${ep.title}: ${ep.rating.toFixed(1)} from ${ep.votes.toLocaleString()} votes`
    const showTip = (el: HTMLElement) => {
      const r = el.getBoundingClientRect()
      setHover({ season: season.number, ep, x: r.left + r.width / 2, y: r.top })
    }
    return (
      <a
        key={ep.id}
        className={`cell${bin.darkFill ? ' on-dark' : ''}`}
        style={{ background: bin.fill }}
        href={`https://www.imdb.com/title/${ep.id}/`}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        onMouseEnter={(e) => showTip(e.currentTarget)}
        onFocus={(e) => showTip(e.currentTarget)}
        onMouseLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
      >
        {ep.rating.toFixed(1)}
      </a>
    )
  }

  const avgCell = (season: Season) => {
    const avg = average(season.episodes)
    return (
      <div key={`avg-${season.number}`} className="cell avg" title={`Season ${season.number} average`}>
        {avg.toFixed(1)}
      </div>
    )
  }

  // Grid: one header track + one track per episode (+ averages) along one axis, seasons along the other
  const extra = showAverages ? 1 : 0
  const gridStyle = byColumns
    ? { gridTemplateColumns: `auto repeat(${seasons.length}, var(--cell-w))` }
    : { gridTemplateColumns: `auto repeat(${maxEpisodes + extra}, var(--cell-w))` }

  return (
    <div className="heatmap-wrap">
      <div className="heatmap-controls">
        <div className="segmented" role="group" aria-label="Layout">
          <button aria-pressed={byColumns} onClick={() => setOrientation('seasons-columns')}>
            Seasons as columns
          </button>
          <button aria-pressed={!byColumns} onClick={() => setOrientation('seasons-rows')}>
            Seasons as rows
          </button>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showAverages} onChange={(e) => setShowAverages(e.target.checked)} />
          Season averages
        </label>
      </div>

      <div className="heatmap-scroll">
        <div className="heatmap" style={gridStyle}>
          {byColumns ? (
            <>
              <div className="corner" />
              {seasons.map((s) => (
                <div key={s.number} className="axis col">S{s.number}</div>
              ))}
              {episodeIdx.map((i) => (
                <Row key={i} label={`E${i + 1}`}>
                  {seasons.map((s) => cell(s, i))}
                </Row>
              ))}
              {showAverages && <Row label="Avg">{seasons.map(avgCell)}</Row>}
            </>
          ) : (
            <>
              <div className="corner" />
              {episodeIdx.map((i) => (
                <div key={i} className="axis col">E{i + 1}</div>
              ))}
              {showAverages && <div className="axis col">Avg</div>}
              {seasons.map((s) => (
                <Row key={s.number} label={`S${s.number}`}>
                  {episodeIdx.map((i) => cell(s, i))}
                  {showAverages && avgCell(s)}
                </Row>
              ))}
            </>
          )}
        </div>
      </div>

      <Legend />

      {hover && (
        <div className="tooltip" role="tooltip" style={{ left: hover.x, top: hover.y }}>
          <div className="tooltip-head">
            S{hover.season} · E{hover.ep.n}
          </div>
          <div className="tooltip-title">{hover.ep.title}</div>
          <div className="tooltip-stats">
            <strong>{hover.ep.rating.toFixed(1)}</strong> · {formatVotes(hover.ep.votes)} votes
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="axis row">{label}</div>
      {children}
    </>
  )
}

function Legend() {
  return (
    <div className="legend" aria-label="Rating color scale">
      <span className="legend-end">Worse</span>
      {[...BINS].reverse().map((b) => (
        <span key={b.label} className="legend-item">
          <span className="legend-swatch" style={{ background: b.fill }} />
          {b.label}
        </span>
      ))}
      <span className="legend-end">Better</span>
    </div>
  )
}
