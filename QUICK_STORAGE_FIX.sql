-- 1. Create the 'pet-photos' bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow Public View (So everyone can see the images)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'pet-photos' );

-- 3. Allow Guest & User Uploads (For easier testing)
-- WARNING: In production, check for 'authenticated' only. For now, allow all for smooth testing.
CREATE POLICY "Allow All Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'pet-photos' );

-- 4. Allow Updates
CREATE POLICY "Allow All Updates"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'pet-photos' );
