-- Migration: Ownership Claims RLS Policies
-- Date: 2026-01-20
-- Purpose: Enable secure access to ownership_claims table with proper RLS policies

-- ============================================
-- 0. Create ownership_claims table (if not exists)
-- ============================================

-- Ensure uuid extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ownership_claims table
CREATE TABLE IF NOT EXISTS ownership_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
    claimant_id UUID REFERENCES profiles(id) NOT NULL,
    claim_type TEXT NOT NULL, -- 'original_owner', 'new_owner', 'breeder'
    evidence TEXT, -- Description
    evidence_files JSONB DEFAULT '[]'::jsonb, -- Photos, documents
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pet_id, claimant_id) -- One claim per user per pet
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ownership_claims_status ON ownership_claims(status);
CREATE INDEX IF NOT EXISTS idx_ownership_claims_pet ON ownership_claims(pet_id);
CREATE INDEX IF NOT EXISTS idx_ownership_claims_claimant ON ownership_claims(claimant_id);

COMMENT ON TABLE ownership_claims IS 'Stores ownership verification claims submitted by users';


-- ============================================
-- 1. Helper Function: Check if user is admin
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS 'Helper function to check if current user has admin privileges';


-- ============================================
-- 2. Disable existing RLS (to recreate policies)
-- ============================================

ALTER TABLE ownership_claims DISABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own claims" ON ownership_claims;
DROP POLICY IF EXISTS "Users can create claims" ON ownership_claims;
DROP POLICY IF EXISTS "Admins can view all claims" ON ownership_claims;
DROP POLICY IF EXISTS "Admins can update claims" ON ownership_claims;
DROP POLICY IF EXISTS "users_can_create_claims" ON ownership_claims;
DROP POLICY IF EXISTS "users_can_view_own_claims" ON ownership_claims;
DROP POLICY IF EXISTS "admins_can_view_all_claims" ON ownership_claims;
DROP POLICY IF EXISTS "admins_can_update_claims" ON ownership_claims;
DROP POLICY IF EXISTS "admins_can_delete_claims" ON ownership_claims;


-- ============================================
-- 3. Enable RLS on ownership_claims
-- ============================================

ALTER TABLE ownership_claims ENABLE ROW LEVEL SECURITY;


-- ============================================
-- 4. RLS Policies for ownership_claims
-- ============================================

-- Policy: Users can create their own ownership claims
CREATE POLICY "users_can_create_claims"
ON ownership_claims
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = claimant_id);

COMMENT ON POLICY "users_can_create_claims" ON ownership_claims IS 
  'Allows authenticated users to create ownership claims for themselves';


-- Policy: Users can view their own claims
CREATE POLICY "users_can_view_own_claims"
ON ownership_claims
FOR SELECT
TO authenticated
USING (auth.uid() = claimant_id);

COMMENT ON POLICY "users_can_view_own_claims" ON ownership_claims IS 
  'Allows users to view their own ownership claims';


-- Policy: Admins can view all claims
CREATE POLICY "admins_can_view_all_claims"
ON ownership_claims
FOR SELECT
TO authenticated
USING (is_admin());

COMMENT ON POLICY "admins_can_view_all_claims" ON ownership_claims IS 
  'Allows admin users to view all ownership claims for moderation';


-- Policy: Admins can update claim status
CREATE POLICY "admins_can_update_claims"
ON ownership_claims
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

COMMENT ON POLICY "admins_can_update_claims" ON ownership_claims IS 
  'Allows admin users to update ownership claims (approve/reject)';


-- Policy: Admins can delete claims (if needed)
CREATE POLICY "admins_can_delete_claims"
ON ownership_claims
FOR DELETE
TO authenticated
USING (is_admin());

COMMENT ON POLICY "admins_can_delete_claims" ON ownership_claims IS 
  'Allows admin users to delete invalid or spam claims';


-- ============================================
-- 5. RLS Policies for claim_messages (if exists)
-- ============================================

-- Check if table exists first
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claim_messages') THEN
    
    -- Enable RLS
    ALTER TABLE claim_messages ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Users can view messages for their claims
    CREATE POLICY "users_can_view_claim_messages"
    ON claim_messages
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM ownership_claims
        WHERE ownership_claims.id = claim_messages.claim_id
        AND ownership_claims.claimant_id = auth.uid()
      )
      OR is_admin()
    );
    
    -- Policy: Users and admins can send messages
    CREATE POLICY "users_can_send_claim_messages"
    ON claim_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = sender_id
      AND (
        EXISTS (
          SELECT 1 FROM ownership_claims
          WHERE ownership_claims.id = claim_messages.claim_id
          AND ownership_claims.claimant_id = auth.uid()
        )
        OR is_admin()
      )
    );
    
  END IF;
END $$;


-- ============================================
-- 6. Grant necessary permissions
-- ============================================

-- Grant usage on sequences (if any)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;


-- ============================================
-- 7. Refresh schema cache (if needed)
-- ============================================

NOTIFY pgrst, 'reload schema';


-- ============================================
-- Success Message
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Ownership claims RLS policies have been applied.';
  RAISE NOTICE 'Users can now create and view their own claims.';
  RAISE NOTICE 'Admins can manage all claims.';
END $$;
