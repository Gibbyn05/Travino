-- Reisefølge: shared trip data. Run in Supabase SQL editor or via the Supabase CLI.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.trips (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120), destination_city text not null, country text not null,
  start_date date not null, end_date date not null, cover_image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(), primary key (trip_id, user_id)
);
create table public.activities (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null, starts_at timestamptz not null, ends_at timestamptz, location text, note text,
  participant_ids uuid[] not null default '{}', created_by uuid not null references public.profiles(id), created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create table public.packing_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null, title text not null, assigned_to uuid references public.profiles(id) on delete set null,
  completed boolean not null default false, completed_at timestamptz, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null, category text not null check (category in ('restaurant', 'beach', 'activity', 'viewpoint', 'other')),
  note text, location text, link text, image_url text, planned_activity_id uuid references public.activities(id) on delete set null,
  created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);
create table public.wishlist_votes (
  wishlist_item_id uuid not null references public.wishlist_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(),
  primary key (wishlist_item_id, user_id)
);
create table public.memories (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete set null, photo_path text not null, taken_on date,
  location text, caption text, created_by uuid not null references public.profiles(id), created_at timestamptz not null default now()
);

create index activities_trip_starts on public.activities(trip_id, starts_at);
create index packing_items_trip_category on public.packing_items(trip_id, category);
create index memories_trip_created on public.memories(trip_id, created_at desc);

-- Security-definer membership check avoids a recursive trip_members policy.
create or replace function public.is_trip_member(target_trip uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.trip_members where trip_id = target_trip and user_id = auth.uid());
$$;
revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.activities enable row level security;
alter table public.packing_items enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.wishlist_votes enable row level security;
alter table public.memories enable row level security;

create policy "profiles are readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "users update their profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "users create their profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "members read trips" on public.trips for select to authenticated using (public.is_trip_member(id));
create policy "users create owned trips" on public.trips for insert to authenticated with check (owner_id = auth.uid());
create policy "members update trips" on public.trips for update to authenticated using (public.is_trip_member(id)) with check (public.is_trip_member(id));
create policy "owners delete trips" on public.trips for delete to authenticated using (owner_id = auth.uid());
create policy "members read membership" on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
create policy "owners manage members" on public.trip_members for all to authenticated using (exists(select 1 from public.trips where id = trip_id and owner_id = auth.uid())) with check (exists(select 1 from public.trips where id = trip_id and owner_id = auth.uid()));

create policy "members access activities" on public.activities for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members access packing" on public.packing_items for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members access wishes" on public.wishlist_items for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members access memories" on public.memories for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members vote" on public.wishlist_votes for all to authenticated using (exists(select 1 from public.wishlist_items w where w.id = wishlist_item_id and public.is_trip_member(w.trip_id))) with check (user_id = auth.uid() and exists(select 1 from public.wishlist_items w where w.id = wishlist_item_id and public.is_trip_member(w.trip_id)));

-- Create a private "trip-media" Storage bucket, then apply these policies.
create policy "trip members read media" on storage.objects for select to authenticated using (bucket_id = 'trip-media' and public.is_trip_member((storage.foldername(name))[1]::uuid));
create policy "trip members upload media" on storage.objects for insert to authenticated with check (bucket_id = 'trip-media' and public.is_trip_member((storage.foldername(name))[1]::uuid));
create policy "trip members delete media" on storage.objects for delete to authenticated using (bucket_id = 'trip-media' and public.is_trip_member((storage.foldername(name))[1]::uuid));
