create table if not exists scores (
  id serial primary key,
  player_name text not null,
  score integer not null,
  country_code text not null,
  stories integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists scores_score_idx on scores (score desc, created_at asc);
