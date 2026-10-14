-- Group reactions for wishlist ideas imported from a shared trip invite.
create table if not exists public.travel_wishlist_reactions (
  trip_id text not null,
  wish_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  reaction text not null check (reaction in ('like', 'meh', 'dislike')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, wish_id, user_id)
);

create index if not exists travel_wishlist_reactions_trip_wish
  on public.travel_wishlist_reactions (trip_id, wish_id);

alter table public.travel_wishlist_reactions enable row level security;
revoke all on public.travel_wishlist_reactions from anon;
grant select, insert, update, delete on public.travel_wishlist_reactions to authenticated;

-- Membership records are written by the trusted trip-notifications function.
-- SECURITY DEFINER allows this check to work while client access to that table
-- remains revoked.
create or replace function public.can_access_travel_trip(target_trip_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.travel_trip_memberships membership
    where membership.trip_id = target_trip_id
      and (membership.owner_id = auth.uid() or membership.member_id = auth.uid())
  );
$$;

revoke all on function public.can_access_travel_trip(text) from public;
grant execute on function public.can_access_travel_trip(text) to authenticated;

drop policy if exists "trip members read wishlist reactions" on public.travel_wishlist_reactions;
create policy "trip members read wishlist reactions"
  on public.travel_wishlist_reactions for select to authenticated
  using (public.can_access_travel_trip(trip_id));

drop policy if exists "members create own wishlist reactions" on public.travel_wishlist_reactions;
create policy "members create own wishlist reactions"
  on public.travel_wishlist_reactions for insert to authenticated
  with check (user_id = auth.uid() and public.can_access_travel_trip(trip_id));

drop policy if exists "members update own wishlist reactions" on public.travel_wishlist_reactions;
create policy "members update own wishlist reactions"
  on public.travel_wishlist_reactions for update to authenticated
  using (user_id = auth.uid() and public.can_access_travel_trip(trip_id))
  with check (user_id = auth.uid() and public.can_access_travel_trip(trip_id));

drop policy if exists "members delete own wishlist reactions" on public.travel_wishlist_reactions;
create policy "members delete own wishlist reactions"
  on public.travel_wishlist_reactions for delete to authenticated
  using (user_id = auth.uid() and public.can_access_travel_trip(trip_id));
