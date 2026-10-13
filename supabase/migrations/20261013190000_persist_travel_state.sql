-- Durable app state for the current mobile client. This is deliberately separate
-- from the normalized travel tables so it can be applied even if an older migration failed.
create table if not exists public.travel_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.travel_states enable row level security;

drop policy if exists "users read their travel state" on public.travel_states;
drop policy if exists "users create their travel state" on public.travel_states;
drop policy if exists "users update their travel state" on public.travel_states;

create policy "users read their travel state" on public.travel_states
  for select to authenticated using (user_id = auth.uid());
create policy "users create their travel state" on public.travel_states
  for insert to authenticated with check (user_id = auth.uid());
create policy "users update their travel state" on public.travel_states
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
