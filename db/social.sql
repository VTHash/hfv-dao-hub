create table if not exists social_posts (
  id bigserial primary key,
  project text not null, -- e.g., "Aave DAO" or "SingularityNET"
  platform text not null, -- "twitter" | "discord" | "rss" | "blog"
  title text,
  url text,
  ts timestamptz not null default now()
);

-- helpful indexes
create index if not exists idx_social_ts on social_posts(ts desc);
create index if not exists idx_social_project_ts on social_posts(project, ts desc);