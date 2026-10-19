-- A Level 10 badge is public only to accepted friends through my_friendships().
-- The qualifying trip data remains in each user's private travel state.

alter table public.profiles add column if not exists legend_badge boolean not null default false;

drop function if exists public.my_friendships();
create function public.my_friendships()
returns table(friendship_id uuid, profile_id uuid, display_name text, username text, friend_code text,
  avatar_url text, bio text, memory_book_public boolean, legend_badge boolean, status text, direction text)
language sql stable security definer set search_path = public as $$
  select f.id, p.id, p.display_name, p.username, p.friend_code, p.avatar_url, p.bio,
    p.memory_book_public, p.legend_badge, f.status,
    case when f.addressee_id = auth.uid() then 'incoming' else 'outgoing' end
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by (f.status = 'pending') desc, f.created_at desc;
$$;
revoke all on function public.my_friendships() from public, anon;
grant execute on function public.my_friendships() to authenticated;
