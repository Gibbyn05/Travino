-- Push endpoints are per installation. Only the owning authenticated user can
-- register or remove a device; service-role Edge Functions read recipient tokens.
create table if not exists public.push_devices (
  expo_push_token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index if not exists push_devices_user_id on public.push_devices(user_id);
alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;
grant select, insert, update, delete on public.push_devices to authenticated;
drop policy if exists "users manage their push devices" on public.push_devices;
create policy "users manage their push devices" on public.push_devices for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The mobile app currently stores its trip payload locally/per-owner. This
-- relation records the verified friend links needed to authorize notifications.
create table if not exists public.travel_trip_memberships (
  trip_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, owner_id, member_id),
  check (owner_id <> member_id)
);
create index if not exists travel_trip_memberships_member_id on public.travel_trip_memberships(member_id);
alter table public.travel_trip_memberships enable row level security;
revoke all on public.travel_trip_memberships from anon, authenticated;
