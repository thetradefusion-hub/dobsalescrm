-- ============================================================
-- 017_template_media_storage.sql
--
-- Public bucket for WhatsApp template header media (image / video /
-- document). Meta fetches these URLs when sending templates that
-- require a HEADER media parameter (#132012 without it).
--
-- Path convention:
--   template-media/{auth.uid()}/{timestamp}-{filename}
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'template-media',
  'template-media',
  TRUE,
  16777216, -- 16 MB (covers WhatsApp image + video header limits)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/3gpp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Template media is publicly readable" ON storage.objects;
CREATE POLICY "Template media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-media');

DROP POLICY IF EXISTS "Users can upload their own template media" ON storage.objects;
CREATE POLICY "Users can upload their own template media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own template media" ON storage.objects;
CREATE POLICY "Users can update their own template media"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'template-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own template media" ON storage.objects;
CREATE POLICY "Users can delete their own template media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'template-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
