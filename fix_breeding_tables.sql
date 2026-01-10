-- ============================================================
-- FIX: breeding_matches table and related registration issues
-- Issue: 400 errors when creating/loading breeding matches
-- Date: 2026-01-08
-- ============================================================

-- Ensure UUID function exists (Supabase usually has pgcrypto enabled)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Check and create the breeding_matches table if it doesn't exist
-- or add missing columns

DO $$
BEGIN
    -- Create breeding_matches if not exists
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'breeding_matches') THEN
        CREATE TABLE public.breeding_matches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sire_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
            dam_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
            match_date DATE,
            due_date DATE,
            status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'mated', 'confirmed', 'born', 'failed')),
            description TEXT,
            requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
            approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            approved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Created breeding_matches table';
    ELSE
        -- Add missing columns if table exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_matches' AND column_name = 'requested_by') THEN
            ALTER TABLE public.breeding_matches ADD COLUMN requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added requested_by column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_matches' AND column_name = 'approval_status') THEN
            ALTER TABLE public.breeding_matches ADD COLUMN approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
            RAISE NOTICE 'Added approval_status column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_matches' AND column_name = 'approved_by') THEN
            ALTER TABLE public.breeding_matches ADD COLUMN approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added approved_by column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_matches' AND column_name = 'approved_at') THEN
            ALTER TABLE public.breeding_matches ADD COLUMN approved_at TIMESTAMPTZ;
            RAISE NOTICE 'Added approved_at column';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_matches' AND column_name = 'description') THEN
            ALTER TABLE public.breeding_matches ADD COLUMN description TEXT;
            RAISE NOTICE 'Added description column';
        END IF;
    END IF;
END $$;

UPDATE public.breeding_matches
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- Ensure FK points to public.profiles (fix PostgREST relationship errors)
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- requested_by -> profiles
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.breeding_matches'::regclass
      AND con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND att.attname = 'requested_by';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.breeding_matches DROP CONSTRAINT %I', constraint_name);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.breeding_matches'::regclass
          AND con.contype = 'f'
          AND con.confrelid = 'public.profiles'::regclass
          AND att.attname = 'requested_by'
    ) THEN
        EXECUTE 'ALTER TABLE public.breeding_matches ADD CONSTRAINT breeding_matches_requested_by_profiles_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;

    -- approved_by -> profiles
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.breeding_matches'::regclass
      AND con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND att.attname = 'approved_by';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.breeding_matches DROP CONSTRAINT %I', constraint_name);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.breeding_matches'::regclass
          AND con.contype = 'f'
          AND con.confrelid = 'public.profiles'::regclass
          AND att.attname = 'approved_by'
    ) THEN
        EXECUTE 'ALTER TABLE public.breeding_matches ADD CONSTRAINT breeding_matches_approved_by_profiles_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
END $$;

-- ============================================================
-- Create breeding_reservations table if not exists
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'breeding_reservations') THEN
        CREATE TABLE public.breeding_reservations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sire_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
            dam_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
            user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            user_contact TEXT,
            user_note TEXT,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'contacted', 'rejected', 'cancelled')),
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
        );
        RAISE NOTICE 'Created breeding_reservations table';
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'breeding_reservations' AND column_name = 'user_id') THEN
            ALTER TABLE public.breeding_reservations ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
            RAISE NOTICE 'Added user_id column';
        END IF;
    END IF;
END $$;

-- Ensure reservations FK points to public.profiles
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.breeding_reservations'::regclass
      AND con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND att.attname = 'user_id';

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.breeding_reservations DROP CONSTRAINT %I', constraint_name);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid
         AND att.attnum = ANY(con.conkey)
        WHERE con.conrelid = 'public.breeding_reservations'::regclass
          AND con.contype = 'f'
          AND con.confrelid = 'public.profiles'::regclass
          AND att.attname = 'user_id'
    ) THEN
        EXECUTE 'ALTER TABLE public.breeding_reservations ADD CONSTRAINT breeding_reservations_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL';
    END IF;
END $$;

-- ============================================================
-- Enable RLS and set policies
-- ============================================================
ALTER TABLE public.breeding_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeding_reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Anyone can view approved breeding matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "Users can create breeding matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "Owners can update their matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "Admin can manage all matches" ON public.breeding_matches;
DROP POLICY IF EXISTS "Admins manage matches" ON public.breeding_matches;

-- Policies for breeding_matches
CREATE POLICY "Anyone can view approved breeding matches"
ON public.breeding_matches FOR SELECT
USING (
    approval_status = 'approved' 
    OR approval_status IS NULL
    OR requested_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.pets p 
        WHERE p.id IN (sire_id, dam_id) 
        AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

CREATE POLICY "Users can create breeding matches"
ON public.breeding_matches FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND requested_by = auth.uid()
);

CREATE POLICY "Owners can update their matches"
ON public.breeding_matches FOR UPDATE
USING (
    requested_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.pets p 
        WHERE p.id IN (sire_id, dam_id) 
        AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr 
        WHERE pr.id = auth.uid() 
        AND pr.role = 'admin'
    )
)
WITH CHECK (
    requested_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.pets p 
        WHERE p.id IN (sire_id, dam_id) 
        AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr 
        WHERE pr.id = auth.uid() 
        AND pr.role = 'admin'
    )
);

CREATE POLICY "Admins manage matches"
ON public.breeding_matches FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- Policies for breeding_reservations
DROP POLICY IF EXISTS "Anyone can view reservations" ON public.breeding_reservations;
DROP POLICY IF EXISTS "Users can create reservations" ON public.breeding_reservations;
DROP POLICY IF EXISTS "Owners can update reservations" ON public.breeding_reservations;
DROP POLICY IF EXISTS "Admins manage reservations" ON public.breeding_reservations;

CREATE POLICY "Anyone can view reservations"
ON public.breeding_reservations FOR SELECT
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.pets p 
        WHERE p.id IN (sire_id, dam_id) 
        AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr 
        WHERE pr.id = auth.uid() 
        AND pr.role = 'admin'
    )
);

CREATE POLICY "Users can create reservations"
ON public.breeding_reservations FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
);

CREATE POLICY "Owners can update reservations"
ON public.breeding_reservations FOR UPDATE
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.pets p 
        WHERE p.id IN (sire_id, dam_id) 
        AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr 
        WHERE pr.id = auth.uid() 
        AND pr.role = 'admin'
    )
)
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.pets p 
        WHERE p.id IN (sire_id, dam_id) 
        AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr 
        WHERE pr.id = auth.uid() 
        AND pr.role = 'admin'
    )
);

CREATE POLICY "Admins manage reservations"
ON public.breeding_reservations FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
        AND pr.role = 'admin'
    )
);

-- ============================================================
-- Grant permissions
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breeding_matches TO authenticated;
GRANT SELECT ON public.breeding_matches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breeding_reservations TO authenticated;
GRANT SELECT ON public.breeding_reservations TO anon;

-- ============================================================
-- Verify the tables and columns
-- ============================================================
SELECT 'breeding_matches columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'breeding_matches'
ORDER BY ordinal_position;

SELECT 'breeding_reservations columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'breeding_reservations'
ORDER BY ordinal_position;

COMMIT;
