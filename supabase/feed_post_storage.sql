-- Storage RLS for feed post images in images bucket
-- Path: images/feed/{pbri_id}/{post_id}/{file}

drop policy if exists "feed_images_select_public" on storage.objects;
create policy "feed_images_select_public"
  on storage.objects for select
  using (bucket_id = 'images' and (storage.foldername(name))[1] = 'feed');

drop policy if exists "feed_images_insert_own" on storage.objects;
create policy "feed_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'feed'
    and (storage.foldername(name))[2] = split_part(auth.jwt() ->> 'email', '@', 1)
  );

drop policy if exists "feed_images_delete_own" on storage.objects;
create policy "feed_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'images'
    and (storage.foldername(name))[1] = 'feed'
    and (storage.foldername(name))[2] = split_part(auth.jwt() ->> 'email', '@', 1)
  );
