-- ─────────────────────────────────────────
-- 003_storage_buckets.sql
-- Creates the storage buckets needed for
-- avatar uploads and gallery/timeline images
-- ─────────────────────────────────────────

-- Avatars bucket (public – everyone can see profile pictures)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Gallery bucket (public – used for gallery images AND timeline images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery',
  'gallery',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- RLS policies for avatars bucket
-- ─────────────────────────────────────────

-- Anyone authenticated can read avatars
CREATE POLICY "avatars_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

-- Any authenticated user can upload/overwrite avatars
CREATE POLICY "avatars_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- Any authenticated user can update/replace avatars
CREATE POLICY "avatars_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

-- ─────────────────────────────────────────
-- RLS policies for gallery bucket
-- ─────────────────────────────────────────

-- Anyone authenticated can read gallery files
CREATE POLICY "gallery_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'gallery');

-- Any authenticated user can upload to gallery
CREATE POLICY "gallery_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'gallery');

-- Any authenticated user can update gallery files
CREATE POLICY "gallery_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'gallery');
