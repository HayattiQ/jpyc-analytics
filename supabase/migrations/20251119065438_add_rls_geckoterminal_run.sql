alter table public.geckoterminal_runs enable row level security;

grant select on public.geckoterminal_runs to anon;

create policy "Allow anon read geckoterminal_runs"
  on public.geckoterminal_runs
  for select
  to anon
  using (true);

