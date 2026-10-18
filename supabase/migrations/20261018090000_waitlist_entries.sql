create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  name text check (name is null or char_length(name) between 1 and 80),
  email text not null check (email = lower(email) and char_length(email) between 5 and 320 and position('@' in email) > 1),
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_entries_email_key on public.waitlist_entries (lower(email));

alter table public.waitlist_entries enable row level security;

revoke all on table public.waitlist_entries from anon, authenticated;
grant insert on table public.waitlist_entries to anon, authenticated;

drop policy if exists "Visitors can join the waitlist" on public.waitlist_entries;
drop policy if exists "Signed-in visitors can join the waitlist" on public.waitlist_entries;

create policy "Visitors can join the waitlist"
  on public.waitlist_entries
  for insert
  to anon
  with check (true);

create policy "Signed-in visitors can join the waitlist"
  on public.waitlist_entries
  for insert
  to authenticated
  with check (true);
