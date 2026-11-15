import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { Heatmap } from '../components/Heatmap.tsx'
import { formatVotes, formatYears, usePoster, useShow } from '../data.ts'

export function ShowPage() {
  const { id } = useParams()
  const show = useShow(id)
  const poster = usePoster(show.status === 'ready' ? show.data.id : undefined)

  useEffect(() => {
    document.title = show.status === 'ready' ? `${show.data.title} · IMDb Heatmap` : 'IMDb Heatmap'
  }, [show])

  if (show.status === 'loading') return <p className="status">Loading…</p>
  if (show.status === 'error')
    return (
      <div className="status">
        <p>
          {show.error === 'Not found'
            ? "We don't have episode ratings for this show. It may have too few votes to be included."
            : `Couldn't load this show (${show.error}).`}
        </p>
        <Link to="/">Back to search</Link>
      </div>
    )

  const s = show.data
  const episodes = s.seasons.flatMap((x) => x.episodes)
  const best = episodes.reduce((a, b) => (b.rating > a.rating ? b : a))
  const worst = episodes.reduce((a, b) => (b.rating < a.rating ? b : a))
  const seasonOf = (epId: string) => s.seasons.find((x) => x.episodes.some((e) => e.id === epId))!.number

  return (
    <article className="show">
      <header className="show-header">
        {poster && <img className="poster" src={poster} alt="" width={105} height={148} />}
        <div>
          <h1>{s.title}</h1>
          <p className="show-meta">
            {formatYears(s.startYear, s.endYear)}
            {s.rating !== null && (
              <>
                {' · '}
                <strong>★ {s.rating.toFixed(1)}</strong> ({formatVotes(s.votes)} votes)
              </>
            )}
            {' · '}
            {s.seasons.length} season{s.seasons.length === 1 ? '' : 's'}, {episodes.length} rated episodes
            {' · '}
            <a href={`https://www.imdb.com/title/${s.id}/`} target="_blank" rel="noreferrer">
              IMDb page
            </a>
          </p>
          <p className="show-meta">
            Best: S{seasonOf(best.id)}E{best.n} “{best.title}” ({best.rating.toFixed(1)}) · Worst: S
            {seasonOf(worst.id)}E{worst.n} “{worst.title}” ({worst.rating.toFixed(1)})
          </p>
        </div>
      </header>
      <Heatmap key={s.id} seasons={s.seasons} />
    </article>
  )
}
