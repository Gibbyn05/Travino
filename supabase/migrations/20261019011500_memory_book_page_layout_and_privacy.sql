-- Per-book visibility replaces the old all-or-nothing profile flag.
-- Existing books inherit the owner's former default once, then each book can
-- be changed independently from the shelf.

alter table public.memory_book_entries
  add column if not exists trip_id text not null default '',
  add column if not exists book_public boolean not null default false;

update public.memory_book_entries entry
set book_public = profile.memory_book_public
from public.profiles profile
where entry.user_id = profile.id
  and entry.trip_id = '';

update public.memory_book_entries
set trip_id = trip_title
where trip_id = '';

create index if not exists memory_book_entries_user_trip_visibility
  on public.memory_book_entries(user_id, trip_id, book_public, taken_on desc);

alter table public.memory_book_entries enable row level security;
grant select, insert, update, delete on public.memory_book_entries to authenticated;

drop policy if exists "friend book reads" on public.memory_book_entries;
create policy "friend book reads" on public.memory_book_entries for select to authenticated
  using (
    user_id = auth.uid()
    or (book_public = true and public.are_friends(auth.uid(), user_id))
  );

drop policy if exists "memory book friends read shared images" on storage.objects;
create policy "memory book friends read shared images" on storage.objects for select to authenticated
  using (
    bucket_id = 'memory-book'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.memory_book_entries entry
        where entry.object_path = name
          and entry.book_public = true
          and public.are_friends(auth.uid(), entry.user_id)
      )
    )
  );
