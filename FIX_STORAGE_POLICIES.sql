-- 1. Ensure the bucket is public (Update existing bucket)
UPDATE storage.buckets
SET public = true
WHERE id = 'pet-photos';

-- 2. Drop old policies to avoid conflicts (Clean slate)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow All Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public View" ON storage.objects;

-- 3. Re-create Policy: Everyone can View (Read)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'pet-photos' );

-- 4. Re-create Policy: Allow Uploads (Authenticated OR Anon for testing)
CREATE POLICY "Allow All Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'pet-photos' );
