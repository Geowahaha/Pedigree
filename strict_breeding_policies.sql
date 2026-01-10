-- ============================================================================
-- STRICT BREEDING POLICIES
-- Purpose: align RLS with approval flow, remove legacy/overly-permissive rules
-- Safe: does NOT change table structure, only RLS policies
-- ============================================================================

-- Ensure RLS is enabled
ALTER TABLE public.breeding_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeding_reservations ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts (strict reset)
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'breeding_matches'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.breeding_matches', r.policyname);
    END LOOP;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'breeding_reservations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.breeding_reservations', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- BREEDING_MATCHES (approval flow)
-- ============================================================================

-- Public can see only approved matches
CREATE POLICY "Public read approved breeding matches"
ON public.breeding_matches FOR SELECT
USING (approval_status = 'approved' OR approval_status IS NULL);

-- Participants (requester or sire/dam owner) + admins can see all statuses
CREATE POLICY "Participants read own matches"
ON public.breeding_matches FOR SELECT
TO authenticated
USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- Create: requester must own the dam (admin override)
CREATE POLICY "Owners create matches"
ON public.breeding_matches FOR INSERT
TO authenticated
WITH CHECK (
    (
        requested_by = auth.uid()
        AND EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- Update: requester or sire/dam owner (admin override)
CREATE POLICY "Owners update matches"
ON public.breeding_matches FOR UPDATE
TO authenticated
USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
)
WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- Delete: requester or sire/dam owner (admin override)
CREATE POLICY "Owners delete matches"
ON public.breeding_matches FOR DELETE
TO authenticated
USING (
    requested_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- ============================================================================
-- BREEDING_RESERVATIONS (only approved pairs)
-- ============================================================================

-- Read: reserver, sire/dam owner, or admin
CREATE POLICY "Participants read reservations"
ON public.breeding_reservations FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- Create: only for approved matches + self
CREATE POLICY "Users create reservations for approved matches"
ON public.breeding_reservations FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.breeding_matches bm
        WHERE bm.sire_id = breeding_reservations.sire_id
          AND bm.dam_id = breeding_reservations.dam_id
          AND (bm.approval_status = 'approved' OR bm.approval_status IS NULL)
          AND (bm.status IS NULL OR bm.status <> 'failed')
    )
);

-- Update: reserver, sire/dam owner, or admin
CREATE POLICY "Participants update reservations"
ON public.breeding_reservations FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- Delete: reserver, sire/dam owner, or admin
CREATE POLICY "Participants delete reservations"
ON public.breeding_reservations FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.sire_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.pets p WHERE p.id = breeding_reservations.dam_id AND p.owner_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('breeding_matches', 'breeding_reservations')
ORDER BY tablename, policyname;
