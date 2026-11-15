/**
 * Downloads IMDb's non-commercial datasets, joins them, and loads the result into Postgres
 * (Supabase). See supabase/schema.sql for the tables.
 *
 * Usage: npm run data
 * Env:   SUPABASE_DB_URL  (required unless DRY_RUN=1) Postgres connection string. Use the
 *                         Supabase *session pooler* URI. Locally, put it in .env.local.
 *        DRY_RUN=1                        build everything but skip the database load
 *        MIN_SERIES_VOTES (default 1000)  drop shows with fewer IMDb votes than this
 *        MIN_EPISODES     (default 2)     drop shows with fewer rated episodes than this
 *        FORCE_DOWNLOAD=1                 ignore the local download cache
 */
import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs'
import { mkdir, rename, rm } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'
import path from 'node:path'
import pg from 'pg'
import { from as copyFrom } from 'pg-copy-streams'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE_DIR = path.join(ROOT, '.cache')
const BASE_URL = 'https://datasets.imdbws.com/'
const MAX_CACHE_AGE_MS = 20 * 60 * 60 * 1000

// Secrets for local runs live in .env.local (gitignored). In CI they come from GitHub secrets.
try {
  process.loadEnvFile(path.join(ROOT, '.env.local'))
} catch {
  // no .env.local — fine
}

const DB_URL = process.env.SUPABASE_DB_URL
const DRY_RUN = process.env.DRY_RUN === '1'
const MIN_SERIES_VOTES = Number(process.env.MIN_SERIES_VOTES ?? 1000)
const MIN_EPISODES = Number(process.env.MIN_EPISODES ?? 2)
const FORCE = process.env.FORCE_DOWNLOAD === '1'

const SERIES_TYPES = new Set(['tvSeries', 'tvMiniSeries'])

interface EpisodeRow {
  id: string
  season: number
  episode: number
  title: string
  rating: number
  votes: number
}

interface ShowRow {
  id: string
  title: string
  startYear: number | null
  endYear: number | null
  rating: number | null
  votes: number
  episodes: EpisodeRow[]
}

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

/** Downloads and joins the datasets into the list of shows to publish. */
async function buildShows(): Promise<ShowRow[]> {
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
  const episodesByShow = new Map<string, EpisodeRow[]>()
  const episodeById = new Map<string, EpisodeRow>()
  n = await readTsv(episodesFile, ([id, parent, season, episode]) => {
    const r = ratings.get(id)
    const s = num(season)
    const e = num(episode)
    if (!r || s === null || e === null) return
    const ep: EpisodeRow = { id, season: s, episode: e, title: '', rating: r[0], votes: r[1] }
    let list = episodesByShow.get(parent)
    if (!list) episodesByShow.set(parent, (list = []))
    list.push(ep)
    episodeById.set(id, ep)
  })
  log(`episodes ${n.toLocaleString()} rows, ${episodeById.size.toLocaleString()} rated`)

  // 3. Titles: series metadata + episode titles
  const shows: ShowRow[] = []
  n = await readTsv(basicsFile, ([id, type, primaryTitle, , , start, end]) => {
    if (type === 'tvEpisode') {
      const ep = episodeById.get(id)
      if (ep) ep.title = primaryTitle
      return
    }
    if (!SERIES_TYPES.has(type)) return
    const episodes = episodesByShow.get(id)
    const [rating, votes] = ratings.get(id) ?? [null, 0]
    if (!episodes || episodes.length < MIN_EPISODES || votes < MIN_SERIES_VOTES) return
    shows.push({ id, title: primaryTitle, startYear: num(start), endYear: num(end), rating, votes, episodes })
  })
  log(`basics   ${n.toLocaleString()} rows`)
  return shows
}

/** Escapes one value for Postgres COPY text format. */
function copyValue(v: string | number | null): string {
  if (v === null) return '\\N'
  if (typeof v === 'number') return String(v)
  return v.replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r')
}

async function copyInto(client: pg.Client, target: string, rows: Iterable<(string | number | null)[]>) {
  function* lines() {
    for (const row of rows) yield row.map(copyValue).join('\t') + '\n'
  }
  await pipeline(Readable.from(lines()), client.query(copyFrom(`copy ${target} from stdin`)))
}

/**
 * Replaces all data in one transaction. Postgres keeps serving the previous data to
 * visitors until COMMIT, and if anything fails the whole load is rolled back.
 */
async function loadDatabase(shows: ShowRow[]) {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DB_URL!)
  const client = new pg.Client({
    connectionString: DB_URL,
    // Supabase requires TLS. Its certificate isn't in Node's default CA list, so we encrypt
    // without verifying the chain.
    ssl: local ? false : { rejectUnauthorized: false },
  })
  await client.connect()
  try {
    await client.query('set statement_timeout = 0')
    await client.query('begin')
    await client.query('delete from episodes')
    await client.query('delete from shows')
    log('db       old rows deleted (not yet committed)')

    await copyInto(
      client,
      'shows (id, title, start_year, end_year, rating, votes)',
      shows.map((s) => [s.id, s.title, s.startYear, s.endYear, s.rating, s.votes]),
    )
    log(`db       copied ${shows.length.toLocaleString()} shows`)

    let epCount = 0
    await copyInto(
      client,
      'episodes (id, show_id, season, episode, title, rating, votes)',
      (function* () {
        for (const s of shows)
          for (const e of s.episodes) {
            epCount++
            yield [e.id, s.id, e.season, e.episode, e.title, e.rating, e.votes]
          }
      })(),
    )
    log(`db       copied ${epCount.toLocaleString()} episodes`)

    await client.query(
      `insert into data_refresh (id, refreshed_at) values (1, now())
       on conflict (id) do update set refreshed_at = excluded.refreshed_at`,
    )
    await client.query('commit')
    log('db       committed')
  } catch (err) {
    await client.query('rollback').catch(() => {})
    throw err
  }

  // Outside the transaction: let Postgres reuse the deleted rows' space and refresh planner
  // stats. The data is already committed, so a failure here is only a warning.
  try {
    await client.query('vacuum analyze shows')
    await client.query('vacuum analyze episodes')
    const { rows } = await client.query(
      `select pg_size_pretty(pg_total_relation_size('shows') + pg_total_relation_size('episodes')) as size`,
    )
    log(`db       vacuumed; tables now use ${rows[0].size}`)
  } catch (err) {
    console.warn('vacuum failed (data is loaded fine):', (err as Error).message)
  }
  await client.end()
}

async function main() {
  if (!DB_URL && !DRY_RUN) {
    throw new Error('SUPABASE_DB_URL is not set. Add it to .env.local, or run with DRY_RUN=1.')
  }
  const shows = await buildShows()
  const episodes = shows.reduce((sum, s) => sum + s.episodes.length, 0)
  log(`built    ${shows.length.toLocaleString()} shows, ${episodes.toLocaleString()} episodes`)
  if (DRY_RUN) {
    log('DRY_RUN=1, skipping database load')
    return
  }
  await loadDatabase(shows)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
