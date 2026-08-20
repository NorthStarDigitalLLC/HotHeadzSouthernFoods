-- 005-storage-media-bucket.sql
--
-- Creates the storage bucket the Menu Studio uploads backgrounds into.
--
-- Run this in the SQL editor of the NorthStar/BHI Supabase project
-- (fkisefambrcyxjrwrplb) — the same project the other database/*.sql files
-- target. It is safe to run more than once.
--
-- Why this exists: api/menu-save.js proxies uploads to NorthStar's
-- /api/hotheadz-menu, which PUTs the image to
--   {SUPABASE_URL}/storage/v1/object/media/hotheadz/backgrounds/<file>.jpg
-- and hands back the matching /object/public/media/... URL. Nothing had ever
-- created the "media" bucket, so every background upload came back with
-- "Bucket not found" and the studio could only offer the built-in background.
--
-- The bucket must be PUBLIC: the studio renders the saved picture onto a
-- <canvas> from that public URL, and a private bucket would both break the
-- preview and taint the canvas so "Download image" would stop working.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MB, matching the limit the upload API enforces
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = true,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Writes arrive with the service role key, which bypasses RLS, so no insert
-- policy is required for the Menu Studio itself. This read policy simply makes
-- the bucket behave consistently for any client-side code that lists objects
-- rather than fetching a known public URL.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename  = 'objects'
      and policyname = 'Public read for media bucket'
  ) then
    create policy "Public read for media bucket"
      on storage.objects for select
      using (bucket_id = 'media');
  end if;
end $$;

-- Verify: this should return one row with public = true.
-- select id, public, file_size_limit from storage.buckets where id = 'media';
