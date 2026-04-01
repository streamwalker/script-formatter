
-- Create character-portraits storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('character-portraits', 'character-portraits', true);

-- Allow anyone to read
CREATE POLICY "Character portraits are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'character-portraits');

-- Allow anyone to upload (no auth required for this app)
CREATE POLICY "Anyone can upload character portraits"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'character-portraits');

-- Allow anyone to update character portraits
CREATE POLICY "Anyone can update character portraits"
ON storage.objects FOR UPDATE
USING (bucket_id = 'character-portraits');

-- Allow anyone to delete character portraits
CREATE POLICY "Anyone can delete character portraits"
ON storage.objects FOR DELETE
USING (bucket_id = 'character-portraits');
