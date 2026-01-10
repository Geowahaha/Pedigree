-- Ensure storage bucket 'pet-photos' exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pet-photos' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'pet-photos' );

-- Allow owners to update/delete their own files (optional, but good practice)
CREATE POLICY "Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'pet-photos' AND auth.uid() = owner );

-- Fix 'pets' bucket just in case
INSERT INTO storage.buckets (id, name, public)
VALUES ('pets', 'pets', true)
ON CONFLICT (id) DO UPDATE SET public = true;
