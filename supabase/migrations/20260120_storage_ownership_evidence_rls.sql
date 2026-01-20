-- Migration: Storage RLS for ownership-evidence bucket
-- Date: 2026-01-20
-- Purpose: Enable authenticated users to upload ownership evidence files

-- ============================================
-- Storage Policies for ownership-evidence
-- ============================================

-- Policy: Allow authenticated users to insert files
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Allow authenticated uploads',
  'ownership-evidence',
  '(bucket_id = ''ownership-evidence'')'::text
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Alternative approach using CREATE POLICY (if above doesn't work)
-- Enable RLS on storage.objects (should already be enabled)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own files" ON storage.objects;
DROP POLICY IF EXISTS "Owner and admin can read" ON storage.objects;
DROP POLICY IF EXISTS "Owner can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Owner and admin can delete" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage ownership evidence" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Policy: Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ownership-evidence');

-- Policy: Only owner and admins can read files (PRODUCTION SECURE)
CREATE POLICY "Owner and admin can read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ownership-evidence' 
  AND (
    owner = auth.uid()  -- Owner can see their files
    OR is_admin()       -- Admins can see all files
  )
);

-- Policy: Only owner can update their files
CREATE POLICY "Owner can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'ownership-evidence' AND owner = auth.uid())
WITH CHECK (bucket_id = 'ownership-evidence' AND owner = auth.uid());

-- Policy: Owner and admin can delete files
CREATE POLICY "Owner and admin can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ownership-evidence' 
  AND (owner = auth.uid() OR is_admin())
);


-- ============================================
-- Verification
-- ============================================

-- Check if policies were created
DO $$
BEGIN
  RAISE NOTICE 'Storage policies created successfully!';
  RAISE NOTICE 'Bucket: ownership-evidence';
  RAISE NOTICE 'Users can now upload ownership evidence files.';
END $$;
