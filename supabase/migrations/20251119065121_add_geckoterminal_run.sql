create table if not exists public.geckoterminal_runs (
  id bigserial primary key,
  page integer not null default 1,
  networks text[] not null default '{}',
  triggered_at timestamptz not null default now()
);

comment on table public.geckoterminal_runs is 'GeckoTerminal同期の実行履歴';

create index if not exists geckoterminal_runs_triggered_at_idx
  on public.geckoterminal_runs (triggered_at desc);

alter table public.geckoterminal_pools
  add column if not exists run_id bigint references public.geckoterminal_runs (id);

create index if not exists geckoterminal_pools_run_id_idx
  on public.geckoterminal_pools (run_id);
