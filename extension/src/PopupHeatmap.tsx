import { useState } from 'react'
import { formatVotes } from '../../src/data.ts'
import { BINS, binFor } from '../../src/scale.ts'
import type { Episode, Season } from '../../src/types.ts'
import { EpisodeDetail } from './EpisodeDetail.tsx'

// Compact heatmap for the popup. Season averages are always shown; click a season label to see
// just that season as a list, and click an episode for its large view.

interface Props {
  seasons: Season[]
  initialSeason: number | null
  onSeasonChange: (season: number | null) => void
  /** Episode to reopen in the large view (the popup remembers it across closes) */
  initialEpisodeId: string | null
  onEpisodeChange: (episodeId: string | null) => void
  /** true = seasons across the top, false = seasons down the left */
  byColumns: boolean
}

interface Tip {
  season: number
  ep: Episode
  x: number
  y: number
  below: boolean
}

const TIP_HALF_WIDTH = 104

const average = (eps: Episode[]) => eps.reduce((s, e) => s + e.rating, 0) / eps.length

export function PopupHeatmap({
  seasons,
  initialSeason,
  onSeasonChange,
  initialEpisodeId,
  onEpisodeChange,
  byColumns,
}: Props) {
  const [selected, setSelected] = useState<number | null>(() =>
    seasons.some((s) => s.number === initialSeason) ? initialSeason : null,
  )
  const [tip, setTip] = useState<Tip | null>(null)

  // Every episode in watch order, for previous/next in the large view
  const flat = seasons.flatMap((s) => s.episodes.map((ep) => ({ season: s.number, ep })))
  const [detailIdx, setDetailIdx] = useState<number | null>(() => {
    const idx = initialEpisodeId ? flat.findIndex((x) => x.ep.id === initialEpisodeId) : -1
    return idx >= 0 ? idx : null
  })
  const indexOf = (ep: Episode) => flat.findIndex((x) => x.ep.id === ep.id)

  const selectSeason = (n: number | null) => {
    setSelected(n)
    setTip(null)
    onSeasonChange(n)
  }

  const showDetail = (idx: number) => {
    setDetailIdx(idx)
    setTip(null)
    onEpisodeChange(flat[idx].ep.id)
    // opening from far down a long list: bring the large view into sight
    document.querySelector('.content')?.scrollTo({ top: 0 })
    // stepping past the end of the selected season moves the selection along with it
    if (selected !== null && flat[idx].season !== selected) selectSeason(flat[idx].season)
  }

  if (detailIdx !== null && flat[detailIdx]) {
    const { season, ep } = flat[detailIdx]
    return (
      <EpisodeDetail
        season={season}
        ep={ep}
        seasonAvg={average(seasons.find((s) => s.number === season)!.episodes)}
        hasPrev={detailIdx > 0}
        hasNext={detailIdx < flat.length - 1}
        onPrev={() => showDetail(detailIdx - 1)}
        onNext={() => showDetail(detailIdx + 1)}
        onClose={() => {
          setDetailIdx(null)
          onEpisodeChange(null)
        }}
      />
    )
  }

  const one = selected !== null ? seasons.find((s) => s.number === selected) : undefined

  if (one) {
    return (
      <>
        <div className="season-bar">
          <span>
            <strong>Season {one.number}</strong> · avg {average(one.episodes).toFixed(1)}
          </span>
          <button type="button" className="link-btn" onClick={() => selectSeason(null)}>
            All seasons
          </button>
        </div>
        <ol className="season-list">
          {one.episodes.map((ep) => {
            const bin = binFor(ep.rating)
            return (
              <li key={ep.id}>
                <button type="button" onClick={() => showDetail(indexOf(ep))}>
                  <span className="sl-code">E{ep.n}</span>
                  <span className={`sl-score${bin.darkFill ? ' on-dark' : ''}`} style={{ background: bin.fill }}>
                    {ep.rating.toFixed(1)}
                  </span>
                  <span className="sl-title">{ep.title || 'Untitled episode'}</span>
                  <span className="sl-votes">{formatVotes(ep.votes)}</span>
                </button>
              </li>
            )
          })}
        </ol>
        <Legend />
      </>
    )
  }

  const maxEpisodes = Math.max(...seasons.map((s) => s.episodes.length))
  const episodeIdx = Array.from({ length: maxEpisodes }, (_, i) => i)

  const cell = (season: Season, i: number) => {
    const ep = season.episodes[i]
    if (!ep) return <div key={`${season.number}-${i}`} className="cell empty" aria-hidden />
    const bin = binFor(ep.rating)
    return (
      <button
        key={ep.id}
        type="button"
        className={`cell${bin.darkFill ? ' on-dark' : ''}`}
        style={{ background: bin.fill }}
        aria-label={`Season ${season.number} episode ${ep.n}, ${ep.title}: ${ep.rating.toFixed(1)}`}
        onMouseEnter={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const vw = document.documentElement.clientWidth
          const x = Math.min(Math.max(r.left + r.width / 2, TIP_HALF_WIDTH), vw - TIP_HALF_WIDTH)
          const below = r.top < 90
          setTip({ season: season.number, ep, x, y: below ? r.bottom : r.top, below })
        }}
        onMouseLeave={() => setTip(null)}
        onClick={() => showDetail(indexOf(ep))}
      >
        {ep.rating.toFixed(1)}
      </button>
    )
  }

  const avgCell = (season: Season) => (
    <div key={`avg-${season.number}`} className="cell avg" title={`Season ${season.number} average`}>
      {average(season.episodes).toFixed(1)}
    </div>
  )

  const seasonLabel = (s: Season, axis: 'col' | 'row') => (
    <button
      key={`label-${s.number}`}
      type="button"
      className={`axis ${axis} season-btn`}
      title={`Show only season ${s.number}`}
      onClick={() => selectSeason(s.number)}
    >
      S{s.number}
    </button>
  )

  const gridStyle = byColumns
    ? { gridTemplateColumns: `auto repeat(${seasons.length}, var(--cell-w))` }
    : { gridTemplateColumns: `auto repeat(${maxEpisodes + 1}, var(--cell-w))` }

  return (
    <>
      <div className="heatmap-scroll">
        <div className="heatmap" style={gridStyle}>
          <div className="corner" />
          {byColumns ? (
            <>
              {seasons.map((s) => seasonLabel(s, 'col'))}
              {episodeIdx.map((i) => [
                <div key={`e${i}`} className="axis row">
                  E{i + 1}
                </div>,
                ...seasons.map((s) => cell(s, i)),
              ])}
              <div className="axis row">Avg</div>
              {seasons.map(avgCell)}
            </>
          ) : (
            <>
              {episodeIdx.map((i) => (
                <div key={`e${i}`} className="axis col">
                  E{i + 1}
                </div>
              ))}
              <div className="axis col">Avg</div>
              {seasons.map((s) => [seasonLabel(s, 'row'), ...episodeIdx.map((i) => cell(s, i)), avgCell(s)])}
            </>
          )}
        </div>
      </div>
      <Legend />

      {tip && (
        <div className={`tooltip${tip.below ? ' below' : ''}`} role="tooltip" style={{ left: tip.x, top: tip.y }}>
          <div className="tooltip-head">
            S{tip.season} · E{tip.ep.n}
          </div>
          <div className="tooltip-title">{tip.ep.title}</div>
          <div className="tooltip-stats">
            <strong>{tip.ep.rating.toFixed(1)}</strong> · {formatVotes(tip.ep.votes)} votes
          </div>
        </div>
      )}
    </>
  )
}

function Legend() {
  return (
    <div className="legend" aria-label="Rating color scale">
      {[...BINS].reverse().map((b) => (
        <span key={b.label} className="legend-item">
          <span className="legend-swatch" style={{ background: b.fill }} />
          {b.label}
        </span>
      ))}
    </div>
  )
}
