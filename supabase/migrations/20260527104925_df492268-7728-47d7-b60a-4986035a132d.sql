-- Remove overly permissive public write policies on the character-portraits bucket.
DROP POLICY IF EXISTS "Anyone can upload character portraits" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update character portraits" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete character portraits" ON storage.objects;

-- SELECT (read) policy remains in place so portraits stay viewable via public URLs.
-- Writes now require the service role (used by the generate-character-portrait edge function),
-- which bypasses RLS and is not exposed to the client.