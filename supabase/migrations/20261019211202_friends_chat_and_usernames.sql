-- Friends can find one another by a stable username while the existing friend
-- code remains valid. Requests must always be accepted explicitly.

alter table public.profiles add column if not exists username text;

update public.profiles
set username = lower(
  coalesce(
    nullif(trim(both '-' from regexp_replace(display_name, '[^a-zA-Z0-9]+', '-', 'g')), ''),
    'traveler'
  ) || '-' || substr(replace(id::text, '-', ''), 1, 6)
)
where username is null or trim(username) = '';

alter table public.profiles alter column username set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_username_format') then
    alter table public.profiles add constraint profiles_username_format
      check (username ~ '^[a-z0-9][a-z0-9_-]{2,39}$');
  end if;
end $$;

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

create or replace function public.ensure_my_profile(p_display_name text default 'Traveler')
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
declare clean_name text := coalesce(nullif(trim(p_display_name), ''), 'Traveler');
declare generated_username text;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  generated_username := lower(
    coalesce(nullif(trim(both '-' from regexp_replace(clean_name, '[^a-zA-Z0-9]+', '-', 'g')), ''), 'traveler')
    || '-' || substr(replace(auth.uid()::text, '-', ''), 1, 6)
  );
  insert into public.profiles(id, display_name, username)
  values (auth.uid(), clean_name, generated_username)
  on conflict (id) do update
    set display_name = excluded.display_name,
        username = coalesce(nullif(public.profiles.username, ''), excluded.username);
  select jsonb_build_object('id', p.id, 'display_name', p.display_name, 'username', p.username,
    'bio', p.bio, 'friend_code', p.friend_code, 'memory_book_public', p.memory_book_public)
  into result from public.profiles p where p.id = auth.uid();
  return result;
end;
$$;
revoke all on function public.ensure_my_profile(text) from public, anon;
grant execute on function public.ensure_my_profile(text) to authenticated;

drop function if exists public.my_friendships();
create function public.my_friendships()
returns table(friendship_id uuid, profile_id uuid, display_name text, username text, friend_code text,
  avatar_url text, bio text, memory_book_public boolean, status text, direction text)
language sql stable security definer set search_path = public as $$
  select f.id, p.id, p.display_name, p.username, p.friend_code, p.avatar_url, p.bio,
    p.memory_book_public, f.status,
    case when f.addressee_id = auth.uid() then 'incoming' else 'outgoing' end
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where auth.uid() in (f.requester_id, f.addressee_id)
  order by (f.status = 'pending') desc, f.created_at desc;
$$;
revoke all on function public.my_friendships() from public, anon;
grant execute on function public.my_friendships() to authenticated;

create or replace function public.add_friend_by_identifier(p_identifier text)
returns void language plpgsql security definer set search_path = public as $$
declare target uuid;
declare request record;
declare identifier text := lower(regexp_replace(trim(p_identifier), '^@', ''));
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  select id into target
  from public.profiles
  where lower(username) = identifier or upper(friend_code) = upper(trim(p_identifier))
  limit 1;
  if target is null then raise exception 'No profile matches that username or friend code'; end if;
  if target = auth.uid() then raise exception 'You cannot add your own profile'; end if;

  select * into request
  from public.friendships
  where (requester_id = auth.uid() and addressee_id = target)
     or (requester_id = target and addressee_id = auth.uid())
  limit 1;

  if found then
    if request.status = 'accepted' then raise exception 'You are already friends'; end if;
    if request.addressee_id = auth.uid() then
      raise exception 'This person has already sent you a request. Accept it from Friend requests.';
    end if;
    raise exception 'Friend request already sent';
  end if;

  insert into public.friendships(requester_id, addressee_id) values (auth.uid(), target);
end;
$$;
revoke all on function public.add_friend_by_identifier(text) from public, anon;
grant execute on function public.add_friend_by_identifier(text) to authenticated;

create or replace function public.add_friend_by_code(p_friend_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.add_friend_by_identifier(p_friend_code);
end;
$$;
revoke all on function public.add_friend_by_code(text) from public, anon;
grant execute on function public.add_friend_by_code(text) to authenticated;

-- Durable one-to-one messages. The client supplies client_id so retries after
-- an offline spell are idempotent rather than creating duplicate messages.
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (sender_id, client_id),
  check (sender_id <> recipient_id)
);
create index if not exists direct_messages_friendship_created on public.direct_messages(friendship_id, created_at);

alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from anon;
grant select, insert on public.direct_messages to authenticated;

drop policy if exists "friends read direct messages" on public.direct_messages;
create policy "friends read direct messages" on public.direct_messages for select to authenticated
  using (
    exists (
      select 1 from public.friendships f
      where f.id = friendship_id
        and f.status = 'accepted'
        and auth.uid() in (f.requester_id, f.addressee_id)
    )
  );

drop policy if exists "friends send direct messages" on public.direct_messages;
create policy "friends send direct messages" on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.are_friends(sender_id, recipient_id)
    and exists (
      select 1 from public.friendships f
      where f.id = friendship_id
        and f.status = 'accepted'
        and ((f.requester_id = sender_id and f.addressee_id = recipient_id)
          or (f.requester_id = recipient_id and f.addressee_id = sender_id))
    )
  );

create or replace function public.send_direct_message(
  p_friendship_id uuid,
  p_recipient_id uuid,
  p_client_id uuid,
  p_body text
)
returns public.direct_messages language plpgsql security definer set search_path = public as $$
declare sent public.direct_messages;
begin
  if auth.uid() is null then raise exception 'Sign in is required'; end if;
  if not exists (
    select 1 from public.friendships f
    where f.id = p_friendship_id
      and f.status = 'accepted'
      and ((f.requester_id = auth.uid() and f.addressee_id = p_recipient_id)
        or (f.addressee_id = auth.uid() and f.requester_id = p_recipient_id))
  ) then
    raise exception 'Messages are available only between accepted friends';
  end if;

  select * into sent from public.direct_messages
  where sender_id = auth.uid() and client_id = p_client_id;
  if found then return sent; end if;

  insert into public.direct_messages(friendship_id, sender_id, recipient_id, client_id, body)
  values (p_friendship_id, auth.uid(), p_recipient_id, p_client_id, trim(p_body))
  returning * into sent;
  return sent;
end;
$$;
revoke all on function public.send_direct_message(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.send_direct_message(uuid, uuid, uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
end $$;
