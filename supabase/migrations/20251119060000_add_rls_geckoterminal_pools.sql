-- Enable RLS and allow anon role to read-only access
alter table public.geckoterminal_pools enable row level security;

grant select on public.geckoterminal_pools to anon;

create policy "Allow anon read geckoterminal_pools"
  on public.geckoterminal_pools
  for select
  to anon
  using (true);
