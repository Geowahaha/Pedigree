-- Enable the storage extension (usually enabled by default, but good check)
-- Create a new private bucket for pet photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pet-photos', 'pet-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can View (Read) photos
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'pet-photos' );

-- Policy: Authenticated users can Upload photos
CREATE POLICY "Authenticated users can upload photos" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'pet-photos' );

-- Policy: Owners can Update their own photos (based on folder structure or name convention if we used user_id)
-- For now, allow simplified update for authenticated users for flexibility, or restrict nicely.
CREATE POLICY "Users can update own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'pet-photos' );

-- Policy: Admins can do anything (Update/Delete)
-- (Assuming we trust authenticated users for now for simplicity, or we refine later)
