-- Fix sticker storage RLS: paths are images/stickers/{profile_id}/{file}
-- foldername indices: [1]=images, [2]=stickers, [3]=profile_id

DROP POLICY IF EXISTS "Users upload own stickers" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own stickers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read stickers" ON storage.objects;

CREATE POLICY "Users upload own stickers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'images'
  AND (storage.foldername(name))[2] = 'stickers'
  AND (storage.foldername(name))[3] = (
    SELECT id::text FROM profiles
    WHERE pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
    LIMIT 1
  )
);

CREATE POLICY "Users delete own stickers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'images'
  AND (storage.foldername(name))[2] = 'stickers'
  AND (storage.foldername(name))[3] = (
    SELECT id::text FROM profiles
    WHERE pbri_id::text = split_part(auth.jwt() ->> 'email', '@', 1)
    LIMIT 1
  )
);

CREATE POLICY "Authenticated read stickers"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'images'
  AND (storage.foldername(name))[1] = 'images'
  AND (storage.foldername(name))[2] = 'stickers'
);
