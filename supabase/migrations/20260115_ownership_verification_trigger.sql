-- ============================================
-- Ownership Claim Pending Trigger
-- Migration: 2026-01-15
-- ============================================

CREATE OR REPLACE FUNCTION set_pet_pending_claim()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE pets
    SET ownership_status = 'pending_claim'
    WHERE id = NEW.pet_id
      AND ownership_status IN ('waiting_owner', 'pending_claim');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_pet_pending_claim ON ownership_claims;

CREATE TRIGGER set_pet_pending_claim
    AFTER INSERT ON ownership_claims
    FOR EACH ROW
    EXECUTE FUNCTION set_pet_pending_claim();

-- ============================================
-- END OF MIGRATION
-- ============================================
