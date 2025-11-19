-- GeckoTerminal 由来のプール情報を保持するテーブル
create table if not exists public.geckoterminal_pools (
  id text primary key,
  network_id text not null,
  address text not null,
  name text,
  dex text,
  base_token_id text,
  quote_token_id text,
  pool_created_at timestamptz,
  tvl_usd double precision not null default 0,
  base_token_price_usd double precision not null default 0,
  quote_token_price_usd double precision not null default 0,
  price_change_24h double precision not null default 0,
  volume_24h_usd double precision not null default 0,
  fetched_at timestamptz not null default now()
);

create unique index if not exists geckoterminal_pools_network_address_idx
  on public.geckoterminal_pools (network_id, address);

create index if not exists geckoterminal_pools_base_token_idx
  on public.geckoterminal_pools (base_token_id);

create index if not exists geckoterminal_pools_quote_token_idx
  on public.geckoterminal_pools (quote_token_id);
