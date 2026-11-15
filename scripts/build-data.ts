/**
 * Downloads IMDb's non-commercial datasets and turns them into small static JSON files:
 *   public/data/index.json          search index of every included show
 *   public/data/shows/<id>.json     per-show seasons × episodes with ratings
 *
 * Usage: npm run data
 * Env:   MIN_SERIES_VOTES (default 1000)  drop shows with fewer IMDb votes than this
 *        MIN_EPISODES     (default 2)     drop shows with fewer rated episodes than this
 *        FORCE_DOWNLOAD=1                 ignore the local download cache
 */
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import path from 'node:path'
import type { Episode, IndexEntry, SearchIndex, ShowData } from '../src/types.ts'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE_DIR = path.join(ROOT, '.cache')
const OUT_DIR = path.join(ROOT, 'public', 'data')
const BASE_URL = 'https://datasets.imdbws.com/'
const MAX_CACHE_AGE_MS = 20 * 60 * 60 * 1000

const MIN_SERIES_VOTES = Number(process.env.MIN_SERIES_VOTES ?? 1000)
const MIN_EPISODES = Number(process.env.MIN_EPISODES ?? 2)
const FORCE = process.env.FORCE_DOWNLOAD === '1'

const SERIES_TYPES = new Set(['tvSeries', 'tvMiniSeries'])

function log(msg: string) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`)
}

async function download(file: string): Promise<string> {
  const dest = path.join(CACHE_DIR, file)
  if (!FORCE && existsSync(dest) && Date.now() - statSync(dest).mtimeMs < MAX_CACHE_AGE_MS) {
    log(`cached   ${file}`)
    return dest
  }
  log(`download ${file}`)
  const res = await fetch(BASE_URL + file)
  if (!res.ok || !res.body) throw new Error(`Failed to download ${file}: HTTP ${res.status}`)
  const tmp = dest + '.part'
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp))
  await rm(dest, { force: true })
  await rename(tmp, dest)
  return dest
}

/** Streams a gzipped TSV, calling onRow with the split columns (header skipped). */
async function readTsv(file: string, onRow: (cols: string[]) => void): Promise<number> {
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  })
  let count = 0
  let header = true
  for await (const line of lines) {
    if (header) {
      header = false
      continue
    }
    onRow(line.split('\t'))
    count++
  }
  return count
}

const num = (s: string): number | null => (s === '\\N' || s === '' ? null : Number(s))

async function main() {
  await mkdir(CACHE_DIR, { recursive: true })
  const [ratingsFile, episodesFile, basicsFile] = await Promise.all([
    download('title.ratings.tsv.gz'),
    download('title.episode.tsv.gz'),
    download('title.basics.tsv.gz'),
  ])

  // 1. Ratings for everything: tconst -> [rating, votes]
  const ratings = new Map<string, [number, number]>()
  let n = await readTsv(ratingsFile, ([id, avg, votes]) => {
    ratings.set(id, [Number(avg), Number(votes)])
  })
  log(`ratings  ${n.toLocaleString()} rows`)

  // 2. Episodes that have a rating and a season/episode number, grouped by parent show
  const episodesByShow = new Map<string, Map<number, Episode[]>>()
  const episodeById = new Map<string, Episode>()
  n = await readTsv(episodesFile, ([id, parent, season, episode]) => {
    const r = ratings.get(id)
    const s = num(season)
    const e = num(episode)
    if (!r || s === null || e === null) return
    const ep: Episode = { n: e, id, title: '', rating: r[0], votes: r[1] }
    let seasons = episodesByShow.get(parent)
    if (!seasons) episodesByShow.set(parent, (seasons = new Map()))
    let list = seasons.get(s)
    if (!list) seasons.set(s, (list = []))
    list.push(ep)
    episodeById.set(id, ep)
  })
  log(`episodes ${n.toLocaleString()} rows, ${episodeById.size.toLocaleString()} rated`)

  // 3. Titles: series metadata + episode titles
  const series = new Map<string, { title: string; start: number | null; end: number | null }>()
  n = await readTsv(basicsFile, ([id, type, primaryTitle, , , start, end]) => {
    if (type === 'tvEpisode') {
      const ep = episodeById.get(id)
      if (ep) ep.title = primaryTitle
    } else if (SERIES_TYPES.has(type) && episodesByShow.has(id)) {
      series.set(id, { title: primaryTitle, start: num(start), end: num(end) })
    }
  })
  log(`basics   ${n.toLocaleString()} rows, ${series.size.toLocaleString()} series with rated episodes`)

  // 4. Write output
  await rm(OUT_DIR, { recursive: true, force: true })
  await mkdir(path.join(OUT_DIR, 'shows'), { recursive: true })

  const index: IndexEntry[] = []
  let bytes = 0
  for (const [id, meta] of series) {
    const [rating, votes] = ratings.get(id) ?? [null, 0]
    if (votes < MIN_SERIES_VOTES) continue
    const seasonMap = episodesByShow.get(id)!
    const epCount = [...seasonMap.values()].reduce((sum, l) => sum + l.length, 0)
    if (epCount < MIN_EPISODES) continue

    const show: ShowData = {
      id,
      title: meta.title,
      startYear: meta.start,
      endYear: meta.end,
      rating,
      votes,
      seasons: [...seasonMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([number, episodes]) => ({ number, episodes: episodes.sort((a, b) => a.n - b.n) })),
    }
    const json = JSON.stringify(show)
    bytes += json.length
    await writeFile(path.join(OUT_DIR, 'shows', `${id}.json`), json)
    index.push([id, meta.title, meta.start, meta.end, votes, rating])
  }

  index.sort((a, b) => b[4] - a[4])
  const searchIndex: SearchIndex = { generated: new Date().toISOString(), shows: index }
  const indexJson = JSON.stringify(searchIndex)
  await writeFile(path.join(OUT_DIR, 'index.json'), indexJson)

  log(
    `wrote ${index.length.toLocaleString()} shows (${(bytes / 1e6).toFixed(1)} MB), ` +
      `index ${(indexJson.length / 1e6).toFixed(2)} MB`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
