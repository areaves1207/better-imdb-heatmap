import { useEffect } from 'react'
import { binFor } from '../../src/scale.ts'
import type { Episode } from '../../src/types.ts'

/** Large view of one episode: ‹ › (or ← → keys) step through episodes, Esc goes back. */
export function EpisodeDetail({
  season,
  ep,
  seasonAvg,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  season: number
  ep: Episode
  seasonAvg: number
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // leave the keys alone while typing in the search box
      if ((e.target as Element).closest?.('input, select, textarea')) return
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
      else if (e.key === 'ArrowRight' && hasNext) onNext()
      else if (e.key === 'Escape') onClose()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hasPrev, hasNext, onPrev, onNext, onClose])

  const bin = binFor(ep.rating)
  const diff = ep.rating - seasonAvg

  return (
    <section className="detail" aria-label={`Season ${season} episode ${ep.n}`}>
      <div className="detail-nav">
        <button type="button" className="detail-arrow" onClick={onPrev} disabled={!hasPrev} aria-label="Previous episode">
          ‹
        </button>
        <div className="detail-code">
          S{season} · E{ep.n}
        </div>
        <button type="button" className="detail-arrow" onClick={onNext} disabled={!hasNext} aria-label="Next episode">
          ›
        </button>
      </div>

      <h2 className="detail-title">{ep.title || 'Untitled episode'}</h2>

      <div className={`detail-score${bin.darkFill ? ' on-dark' : ''}`} style={{ background: bin.fill }}>
        {ep.rating.toFixed(1)}
      </div>

      <p className="detail-votes">{ep.votes.toLocaleString()} votes</p>
      <p className="detail-compare">
        Season avg {seasonAvg.toFixed(1)}
        {Math.abs(diff) >= 0.05 && (
          <span>
            {' '}
            ({diff > 0 ? '+' : '−'}
            {Math.abs(diff).toFixed(1)})
          </span>
        )}
      </p>

      <div className="detail-footer">
        <button type="button" className="link-btn" onClick={onClose}>
          ← Episodes
        </button>
        <a href={`https://www.imdb.com/title/${ep.id}/`} target="_blank" rel="noreferrer">
          IMDb ↗
        </a>
      </div>
    </section>
  )
}
