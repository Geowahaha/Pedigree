-- ============================================================
-- Vet AI Profile: per-pet health profile storage
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'pet_health_profiles') THEN
        CREATE TABLE public.pet_health_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
            created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
            clinic_name TEXT,
            clinic_phone TEXT,
            vet_name TEXT,
            weight_kg NUMERIC,
            diet_summary TEXT,
            feeding_schedule TEXT,
            exercise_notes TEXT,
            allergies TEXT,
            conditions TEXT,
            medications TEXT,
            vaccines TEXT,
            deworming_schedule TEXT,
            last_checkup_date DATE,
            spay_neuter_status TEXT DEFAULT 'unknown' CHECK (spay_neuter_status IN ('unknown', 'intact', 'spayed', 'neutered')),
            reproductive_history TEXT,
            family_history_notes TEXT,
            incident_history TEXT,
            risk_flags TEXT[],
            emergency_plan TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now(),
            UNIQUE (pet_id)
        );
    ELSE
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'created_by') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'updated_by') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'clinic_name') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN clinic_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'clinic_phone') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN clinic_phone TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'vet_name') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN vet_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'weight_kg') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN weight_kg NUMERIC;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'diet_summary') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN diet_summary TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'feeding_schedule') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN feeding_schedule TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'exercise_notes') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN exercise_notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'allergies') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN allergies TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'conditions') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN conditions TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'medications') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN medications TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'vaccines') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN vaccines TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'deworming_schedule') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN deworming_schedule TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'last_checkup_date') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN last_checkup_date DATE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'spay_neuter_status') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN spay_neuter_status TEXT DEFAULT 'unknown' CHECK (spay_neuter_status IN ('unknown', 'intact', 'spayed', 'neutered'));
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'reproductive_history') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN reproductive_history TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'family_history_notes') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN family_history_notes TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'incident_history') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN incident_history TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'risk_flags') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN risk_flags TEXT[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'emergency_plan') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN emergency_plan TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_health_profiles' AND column_name = 'notes') THEN
            ALTER TABLE public.pet_health_profiles ADD COLUMN notes TEXT;
        END IF;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pet_health_profiles_updated_at') THEN
        CREATE TRIGGER update_pet_health_profiles_updated_at
        BEFORE UPDATE ON public.pet_health_profiles
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

ALTER TABLE public.pet_health_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view health profiles" ON public.pet_health_profiles;
DROP POLICY IF EXISTS "Owners can create health profiles" ON public.pet_health_profiles;
DROP POLICY IF EXISTS "Owners can update health profiles" ON public.pet_health_profiles;
DROP POLICY IF EXISTS "Owners can delete health profiles" ON public.pet_health_profiles;
DROP POLICY IF EXISTS "Admins manage health profiles" ON public.pet_health_profiles;

CREATE POLICY "Owners can view health profiles"
ON public.pet_health_profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.pets p
        WHERE p.id = pet_id
          AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role = 'admin'
    )
);

CREATE POLICY "Owners can create health profiles"
ON public.pet_health_profiles FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
        EXISTS (
            SELECT 1 FROM public.pets p
            WHERE p.id = pet_id
              AND p.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND pr.role = 'admin'
        )
    )
);

CREATE POLICY "Owners can update health profiles"
ON public.pet_health_profiles FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.pets p
        WHERE p.id = pet_id
          AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.pets p
        WHERE p.id = pet_id
          AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role = 'admin'
    )
);

CREATE POLICY "Owners can delete health profiles"
ON public.pet_health_profiles FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.pets p
        WHERE p.id = pet_id
          AND p.owner_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role = 'admin'
    )
);

CREATE POLICY "Admins manage health profiles"
ON public.pet_health_profiles FOR ALL
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_health_profiles TO authenticated;

COMMIT;
