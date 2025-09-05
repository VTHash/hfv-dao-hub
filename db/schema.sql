create table if not exists proposals (
  id text primary key,
  source text not null, -- snapshot | tally | onchain
  org text,
  title text,
  body text,
  status text,
  link text,
  start_ts timestamptz,
  end_ts timestamptz,
  created_at timestamptz default now()
);

create table if not exists votes (
  id bigserial primary key,
  proposal_id text references proposals(id) on delete cascade,
  voter bytea,
  weight numeric,
  direction text,
  tx_hash bytea,
  ts timestamptz default now()
);

create table if not exists safe_tx (
  id bigserial primary key,
  safe_address bytea not null,
  tx_hash bytea,
  to_address bytea,
  token_address bytea,
  method text,
  value_usd numeric,
  ts timestamptz default now()
);

create table if not exists lp_events (
  id bigserial primary key,
  pair bytea not null,
  evt text not null, -- swap | mint | burn | sync
  amount0 numeric,
  amount1 numeric,
  sender bytea,
  receiver bytea,
  tx_hash bytea,
  ts timestamptz default now()
);

create table if not exists staking_events (
  id bigserial primary key,
  contract bytea not null,
  evt text not null, -- Staked | Unstaked | Claimed
  user bytea,
  amount numeric,
  duration integer,
  tx_hash bytea,
  ts timestamptz default now()
);

create table if not exists ai_summaries (
  id bigserial primary key,
  entity_type text not null, -- proposal | safe_tx | lp_summary | staking_summary
  entity_id text not null,
  summary text,
  tags text[],
  created_at timestamptz default now()
);

create table if not exists alerts (
  id bigserial primary key,
  kind text not null, -- gov_hot | treasury_move | lp_spike | stake_change
  subject text not null,
  severity text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists social_posts(
    id bigserial primary key, project text
    not null, title text, url text, ts timestamptz not null default now()
);