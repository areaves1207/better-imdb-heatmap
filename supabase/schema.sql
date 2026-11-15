-- IMDb Heatmap schema for Supabase (Postgres).
-- Paste into the Supabase SQL Editor and run once.
--
-- Sizes with the default filter (shows with 1,000+ votes): ~12.7k shows, ~525k episodes,
-- roughly 100–150 MB including indexes. Fits the free tier (500 MB).

create extension if not exists pg_trgm;

-- One row per TV series / mini-series
create table shows (
  id          text primary key,              -- IMDb id, e.g. 'tt0903747'
  title       text not null,
  start_year  smallint,
  end_year    smallint,
  rating      numeric(3, 1),                 -- IMDb weighted average, 1.0–10.0
  votes       integer not null default 0
);

-- One row per rated episode
create table episodes (
  id       text primary key,                 -- IMDb id of the episode
  show_id  text not null references shows (id) on delete cascade,
  season   smallint not null,
  episode  smallint not null,
  title    text not null default '',
  rating   numeric(3, 1) not null,
  votes    integer not null default 0
);

-- Fetching a show's grid: all episodes of one show, in order
create index episodes_show_order_idx on episodes (show_id, season, episode);

-- Search: fast case-insensitive substring match on titles, plus popularity ordering
create index shows_title_trgm_idx on shows using gin (title gin_trgm_ops);
create index shows_votes_idx on shows (votes desc);

-- When the data was last refreshed (single row)
create table data_refresh (
  id            smallint primary key default 1 check (id = 1),
  refreshed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Read-only public access. The site uses the anon key; only the refresh job
-- (using the service_role key, which bypasses RLS) can write.
-- ---------------------------------------------------------------------------
alter table shows        enable row level security;
alter table episodes     enable row level security;
alter table data_refresh enable row level security;

create policy "public read" on shows        for select to anon, authenticated using (true);
create policy "public read" on episodes     for select to anon, authenticated using (true);
create policy "public read" on data_refresh for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- RPC functions, called from the app as supabase.rpc('search_shows', ...) etc.
-- ---------------------------------------------------------------------------

-- Search ranked by match quality, then by votes:
--   exact title (ignoring a leading "The") > match at the start of a word > anywhere
create function search_shows(q text, max_results int default 8)
returns setof shows
language sql stable
as $$
  with term as (
    -- escape LIKE wildcards in the user's input
    select lower(trim(q)) as raw,
           replace(replace(replace(trim(q), '\', '\\'), '%', '\%'), '_', '\_') as t
  )
  select s.*
  from shows s, term
  where term.t <> '' and s.title ilike '%' || term.t || '%'
  order by
    lower(s.title) in (term.raw, 'the ' || term.raw) desc,
    (s.title ilike term.t || '%' or s.title ilike '% ' || term.t || '%') desc,
    s.votes desc
  limit least(max_results, 50);
$$;

-- A whole show with its seasons and episodes as one JSON document.
-- Same shape as the app's ShowData type, and avoids the API's 1,000-row limit
-- (The Daily Show alone has ~4,000 episodes).
create function get_show(show_id text)
returns json
language sql stable
as $$
  select json_build_object(
    'id',        s.id,
    'title',     s.title,
    'startYear', s.start_year,
    'endYear',   s.end_year,
    'rating',    s.rating,
    'votes',     s.votes,
    'seasons',   coalesce((
      select json_agg(json_build_object('number', x.season, 'episodes', x.episodes) order by x.season)
      from (
        select e.season,
               json_agg(json_build_object(
                 'n', e.episode, 'id', e.id, 'title', e.title, 'rating', e.rating, 'votes', e.votes
               ) order by e.episode) as episodes
        from episodes e
        where e.show_id = s.id
        group by e.season
      ) x
    ), '[]'::json)
  )
  from shows s
  where s.id = show_id;
$$;

-- Most-voted shows for the home page
create function popular_shows(max_results int default 24)
returns setof shows
language sql stable
as $$
  select * from shows order by votes desc limit least(max_results, 100);
$$;
