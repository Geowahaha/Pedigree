
-- 1. Add missing columns to pets table (Fixes Error 400)
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS for_sale BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS medical_history TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;

-- Add index for is_public to speed up queries
CREATE INDEX IF NOT EXISTS idx_pets_is_public ON pets(is_public);


-- 2. Create 'pets' Storage Bucket (Fixes Image Upload Error)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pets', 'pets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage Policies (Allow Public Read & Upload)
-- Reset policies for 'pets' bucket to avoid conflicts
DROP POLICY IF EXISTS "Public Access Pets" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Pets" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Pets" ON storage.objects;

-- Allow everyone to view images
CREATE POLICY "Public Access Pets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'pets' );

-- Allow uploads (Usually restrict to authenticated, but for migration allow wide)
CREATE POLICY "Allow Upload Pets"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'pets' );

-- Allow updates
CREATE POLICY "Allow Update Pets"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'pets' );

