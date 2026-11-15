import { useEffect, useRef, useState } from 'react'
import type { Episode, Season } from '../types.ts'
import { BINS, binFor } from '../scale.ts'
import { formatVotes } from '../data.ts'
import { PALETTES, usePalette, type Palette } from '../palette.ts'

type Orientation = 'seasons-columns' | 'seasons-rows'

interface Hover {
  season: number
  ep: Episode
  /** Tooltip anchor in viewport coordinates */
  x: number
  y: number
  /** Show the tooltip under the cell (when there's no room above) */
  below: boolean
  /** Opened by a tap: a second tap on the same cell follows the link */
  touch: boolean
}

const TOOLTIP_HALF_WIDTH = 138 // half of max-width 260 + margin

const average = (eps: Episode[]) => eps.reduce((s, e) => s + e.rating, 0) / eps.length

export function Heatmap({ seasons }: { seasons: Season[] }) {
  const maxEpisodes = Math.max(...seasons.map((s) => s.episodes.length))
  // Long-running shows (many short seasons) read better with seasons as rows
  const [orientation, setOrientation] = useState<Orientation>(
    seasons.length > maxEpisodes ? 'seasons-rows' : 'seasons-columns',
  )
  const [showAverages, setShowAverages] = useState(true)
  const [palette, setPalette] = usePalette()
  const [hover, setHover] = useState<Hover | null>(null)
  const lastPointer = useRef<string>('mouse')

  // A tapped tooltip stays open until you tap elsewhere or scroll
  const touchTip = hover?.touch ?? false
  useEffect(() => {
    if (!touchTip) return
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && (e.target as Element).closest?.('a.cell')) return
      setHover(null)
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [touchTip])

  const byColumns = orientation === 'seasons-columns'
  const episodeIdx = Array.from({ length: maxEpisodes }, (_, i) => i)

  const cell = (season: Season, i: number) => {
    const ep = season.episodes[i]
    if (!ep) return <div key={`${season.number}-${i}`} className="cell empty" aria-hidden />
    const bin = binFor(ep.rating)
    const label = `Season ${season.number} episode ${ep.n}, ${ep.title}: ${ep.rating.toFixed(1)} from ${ep.votes.toLocaleString()} votes`
    const showTip = (el: HTMLElement, touch: boolean) => {
      const r = el.getBoundingClientRect()
      const vw = document.documentElement.clientWidth
      // keep the tooltip on screen near the left/right edges of a phone
      const x = Math.min(Math.max(r.left + r.width / 2, TOOLTIP_HALF_WIDTH), vw - TOOLTIP_HALF_WIDTH)
      const below = r.top < 110
      setHover({ season: season.number, ep, x, y: below ? r.bottom : r.top, below, touch })
    }
    return (
      <a
        key={ep.id}
        className={`cell${bin.darkFill ? ' on-dark' : ''}${hover?.ep.id === ep.id ? ' active' : ''}`}
        style={{ background: bin.fill }}
        href={`https://www.imdb.com/title/${ep.id}/`}
        target="_blank"
        rel="noreferrer"
        aria-label={label}
        onPointerDown={(e) => (lastPointer.current = e.pointerType)}
        // pointer (not mouse) events, so a tap doesn't fake a hover
        onPointerEnter={(e) => e.pointerType === 'mouse' && showTip(e.currentTarget, false)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
        onFocus={(e) => e.currentTarget.matches(':focus-visible') && showTip(e.currentTarget, false)}
        onBlur={() => !touchTip && setHover(null)}
        onClick={(e) => {
          // On touch screens the first tap previews the episode, the second opens IMDb
          if (lastPointer.current !== 'mouse' && hover?.ep.id !== ep.id) {
            e.preventDefault()
            showTip(e.currentTarget, true)
          }
        }}
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
        <label className="toggle">
          Colors
          <select
            className="palette-select"
            value={palette}
            onChange={(e) => setPalette(e.target.value as Palette)}
          >
            {PALETTES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
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
        <div
          className={`tooltip${hover.below ? ' below' : ''}`}
          role="tooltip"
          style={{ left: hover.x, top: hover.y }}
        >
          <div className="tooltip-head">
            S{hover.season} · E{hover.ep.n}
          </div>
          <div className="tooltip-title">{hover.ep.title}</div>
          <div className="tooltip-stats">
            <strong>{hover.ep.rating.toFixed(1)}</strong> · {formatVotes(hover.ep.votes)} votes
          </div>
          {hover.touch && <div className="tooltip-hint">Tap again to open on IMDb</div>}
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
