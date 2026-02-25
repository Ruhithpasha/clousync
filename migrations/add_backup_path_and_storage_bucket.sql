-- Migration: Add backup_path column + Supabase Storage bucket for free image restore
-- Run this in your Supabase SQL Editor

-- 1. Add backup_path column to images table
--    This stores the Supabase Storage path (userId/public_id) for each image's backup copy.
--    NULL means no backup exists yet (images uploaded before this feature was added).
ALTER TABLE public.images
ADD COLUMN IF NOT EXISTS backup_path TEXT DEFAULT NULL;

-- 2. Create the storage bucket for image backups
--    This bucket stores the original image files so we can restore them if Cloudinary deletes them.
--    'public = false' means only the service role (backend) can access these files — users cannot
--    access backups directly via public URLs, keeping them secure.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'image-backups',
  'image-backups',
  false,            -- private bucket: only accessible via service role key
  52428800,         -- 50MB per file limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies: only the service role (backend) can read/write
--    The backend uses supabaseAdmin (service role key) which bypasses RLS automatically,
--    so these policies just block any direct user access.
CREATE POLICY "Service role only: upload backup" ON storage.objects FOR
INSERT
    TO service_role
WITH
    CHECK (bucket_id = 'image-backups');

CREATE POLICY "Service role only: download backup" ON storage.objects FOR
SELECT TO service_role USING (bucket_id = 'image-backups');

CREATE POLICY "Service role only: delete backup" ON storage.objects FOR DELETE TO service_role USING (bucket_id = 'image-backups');