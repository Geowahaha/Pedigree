-- Rollback Migration: Ownership Claims RLS Policies
-- Date: 2026-01-20
-- Purpose: Rollback RLS policies for ownership_claims table
-- WARNING: Use only if migration fails or needs to be reverted

-- ============================================
-- 1. Drop RLS Policies for claim_messages
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'claim_messages') THEN
    
    DROP POLICY IF EXISTS "users_can_send_claim_messages" ON claim_messages;
    DROP POLICY IF EXISTS "users_can_view_claim_messages" ON claim_messages;
    
    -- Optionally disable RLS (be careful in production!)
    -- ALTER TABLE claim_messages DISABLE ROW LEVEL SECURITY;
    
  END IF;
END $$;


-- ============================================
-- 2. Drop RLS Policies for ownership_claims
-- ============================================

DROP POLICY IF EXISTS "admins_can_delete_claims" ON ownership_claims;
DROP POLICY IF EXISTS "admins_can_update_claims" ON ownership_claims;
DROP POLICY IF EXISTS "admins_can_view_all_claims" ON ownership_claims;
DROP POLICY IF EXISTS "users_can_view_own_claims" ON ownership_claims;
DROP POLICY IF EXISTS "users_can_create_claims" ON ownership_claims;

-- Optionally disable RLS (be careful in production!)
-- ALTER TABLE ownership_claims DISABLE ROW LEVEL SECURITY;


-- ============================================
-- 3. Drop Helper Function
-- ============================================

DROP FUNCTION IF EXISTS is_admin();


-- ============================================
-- 4. Refresh schema cache
-- ============================================

NOTIFY pgrst, 'reload schema';


-- ============================================
-- Rollback Complete
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Rollback completed successfully!';
  RAISE NOTICE 'RLS policies have been removed from ownership_claims.';
  RAISE NOTICE 'WARNING: Table may be accessible to all users if RLS is disabled.';
  RAISE NOTICE 'Consider re-applying policies or implementing alternative security.';
END $$;
