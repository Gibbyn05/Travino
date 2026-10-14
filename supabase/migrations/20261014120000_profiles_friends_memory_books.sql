-- Editable user profiles, friend requests, and private-by-default memory books.
-- Memory photos use their own private bucket so a public-to-friends book never
-- grants access to trip plans, packing lists, or wishlist data.

alter table public.profiles
  add column if not exists bio text not null default '',
  add column if not exists friend_code text,
  add column if not exists memory_book_public boolean not null default false;

update public.profiles
set friend_code = upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10))
where friend_code is null;

alter table public.profiles alter column friend_code set default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
alter table public.profiles alter column friend_code set not null;
create unique index if not exists profiles_friend_code_unique on public.profiles(friend_code);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index if not exists friendships_addressee_status on public.friendships(addressee_id, status);
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;
drop policy if exists "participants read their friendship rows" on public.friendships;
create policy "participants read their friendship rows" on public.friendships for select to authenticated
  using (auth.uid() in (requester_id, addressee_id));

create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and auth.uid() in (a, b)
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;
revoke all on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;

create or replace function public.ensure_my_profile(p_display_name text default 'Traveler')
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  insert into public.profiles(id, display_name)
  values (auth.uid(), coalesce(nullif(trim(p_display_name), ''), 'Traveler'))
  on conflict (id) do update
    set display_name = case when nullif(trim(p_display_name), '') is null then public.profiles.display_name else excluded.display_name end;
  select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'bio', p.bio,
    'friend_code', p.friend_code, 'memory_book_public', p.memory_book_public)
  into result from public.profiles p where p.id = auth.uid();
  return result;
end;
$$;
revoke all on function public.ensure_my_profile(text) from public, anon;
grant execute on function public.ensure_my_profile(text) to authenticated;

create or replace function public.my_friendships()
returns table(friendship_id uuid, profile_id uuid, display_name text, friend_code text,
  bio text, memory_book_public boolean, status text, direction text)
language sql stable security definer set search_path = public as $$
  select f.id, p.id, p.display_name, p.friend_code, p.bio, p.memory_book_public, f.status,
    case when f.addressee_id = auth.uid() then 'incoming' else 'outgoing' end
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by (f.status = 'pending') desc, f.created_at desc;
$$;
revoke all on function public.my_friendships() from public, anon;
grant execute on function public.my_friendships() to authenticated;

create or replace function public.add_friend_by_code(p_friend_code text)
returns void language plpgsql security definer set search_path = public as $$
declare target uuid; existing_status text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select id into target from public.profiles where upper(friend_code) = upper(trim(p_friend_code));
  if target is null then raise exception 'No profile matches that friend code'; end if;
  if target = auth.uid() then raise exception 'You cannot add your own profile'; end if;
  select status into existing_status from public.friendships where requester_id = auth.uid() and addressee_id = target;
  if existing_status = 'accepted' then raise exception 'You are already friends'; end if;
  if existing_status = 'pending' then raise exception 'Friend request already sent'; end if;
  update public.friendships set status = 'accepted', accepted_at = now()
    where requester_id = target and addressee_id = auth.uid() and status = 'pending';
  if not found then
    insert into public.friendships(requester_id, addressee_id) values (auth.uid(), target);
  end if;
end;
$$;
revoke all on function public.add_friend_by_code(text) from public, anon;
grant execute on function public.add_friend_by_code(text) to authenticated;

create or replace function public.respond_to_friend_request(p_friendship_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_accept then
    update public.friendships set status = 'accepted', accepted_at = now()
      where id = p_friendship_id and addressee_id = auth.uid() and status = 'pending';
  else
    delete from public.friendships where id = p_friendship_id and addressee_id = auth.uid() and status = 'pending';
  end if;
  if not found then raise exception 'Friend request is no longer available'; end if;
end;
$$;
revoke all on function public.respond_to_friend_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_friend_request(uuid, boolean) to authenticated;

create or replace function public.remove_friend(p_profile_id uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.friendships f where f.status = 'accepted'
    and ((f.requester_id = auth.uid() and f.addressee_id = p_profile_id)
      or (f.addressee_id = auth.uid() and f.requester_id = p_profile_id));
$$;
revoke all on function public.remove_friend(uuid) from public, anon;
grant execute on function public.remove_friend(uuid) to authenticated;

create table if not exists public.memory_book_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  object_path text not null unique,
  trip_title text not null default '',
  city text not null default '',
  country text not null default '',
  taken_on date,
  caption text not null default '',
  created_at timestamptz not null default now(),
  check (split_part(object_path, '/', 1) = user_id::text)
);
create index if not exists memory_book_entries_user_country_date on public.memory_book_entries(user_id, country, taken_on desc);
alter table public.memory_book_entries enable row level security;
revoke all on public.memory_book_entries from anon;
grant select, insert, update, delete on public.memory_book_entries to authenticated;

drop policy if exists "profiles are readable by signed-in users" on public.profiles;
drop policy if exists "users read own or connected profiles" on public.profiles;
create policy "users read own or connected profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.friendships f where auth.uid() in (f.requester_id, f.addressee_id)
      and (f.requester_id = id or f.addressee_id = id)
  ));

drop policy if exists "friend book reads" on public.memory_book_entries;
drop policy if exists "owners manage their book entries" on public.memory_book_entries;
create policy "friend book reads" on public.memory_book_entries for select to authenticated
  using (user_id = auth.uid() or (exists (
    select 1 from public.profiles p where p.id = user_id and p.memory_book_public = true
  ) and public.are_friends(auth.uid(), user_id)));
create policy "owners manage their book entries" on public.memory_book_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('memory-book', 'memory-book', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic']::text[])
on conflict (id) do update set public = false;

drop policy if exists "memory book owner reads images" on storage.objects;
drop policy if exists "memory book friends read shared images" on storage.objects;
drop policy if exists "memory book owner uploads images" on storage.objects;
drop policy if exists "memory book owner deletes images" on storage.objects;
create policy "memory book friends read shared images" on storage.objects for select to authenticated
  using (bucket_id = 'memory-book' and (
    (storage.foldername(name))[1] = auth.uid()::text or (
      exists (select 1 from public.profiles p where p.id::text = (storage.foldername(name))[1] and p.memory_book_public = true)
      and public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  ));
create policy "memory book owner uploads images" on storage.objects for insert to authenticated
  with check (bucket_id = 'memory-book' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "memory book owner deletes images" on storage.objects for delete to authenticated
  using (bucket_id = 'memory-book' and (storage.foldername(name))[1] = auth.uid()::text);
