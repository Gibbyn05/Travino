-- Upsert trenger SELECT, INSERT og UPDATE på storage.objects.

drop policy if exists "profile avatar owner reads" on storage.objects;
create policy "profile avatar owner reads"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "memory book owner updates images" on storage.objects;
create policy "memory book owner updates images"
on storage.objects for update to authenticated
using (
  bucket_id = 'memory-book'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'memory-book'
  and (storage.foldername(name))[1] = auth.uid()::text
);
