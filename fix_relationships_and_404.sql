-- ==============================================================================
-- FIX RELATIONSHIPS FOR POSTGREST
-- ==============================================================================
-- Supabase PostgREST needs explicit foreign keys to "public" tables to auto-detect
-- relationships in queries like `ownership_history(..., new_owner:profiles(...))`.
-- Currently, these tables point to `auth.users`, which is in a hidden schema.
-- We will add an additional FK constraint to `public.profiles` to enable the join.

-- 1. Fix Ownership History
ALTER TABLE public.ownership_history
    DROP CONSTRAINT IF EXISTS ownership_history_previous_owner_id_fkey, -- Drop old auth.users FKs if strictly necessary, but actually we can just add new ones or rely on profiles being 1:1
    DROP CONSTRAINT IF EXISTS ownership_history_new_owner_id_fkey;

-- Re-add FKs pointing to public.profiles (which cascade deletes when auth.users is deleted anyway usually)
-- Note: We assume public.profiles.id is the same as auth.users.id
ALTER TABLE public.ownership_history
    ADD CONSTRAINT ownership_history_previous_owner_id_profiles_fkey
    FOREIGN KEY (previous_owner_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;

ALTER TABLE public.ownership_history
    ADD CONSTRAINT ownership_history_new_owner_id_profiles_fkey
    FOREIGN KEY (new_owner_id)
    REFERENCES public.profiles(id)
    ON DELETE SET NULL;


-- 2. Fix User Reviews
ALTER TABLE public.user_reviews
    DROP CONSTRAINT IF EXISTS user_reviews_reviewer_id_fkey,
    DROP CONSTRAINT IF EXISTS user_reviews_target_user_id_fkey;

ALTER TABLE public.user_reviews
    ADD CONSTRAINT user_reviews_reviewer_id_profiles_fkey
    FOREIGN KEY (reviewer_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

ALTER TABLE public.user_reviews
    ADD CONSTRAINT user_reviews_target_user_id_profiles_fkey
    FOREIGN KEY (target_user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;


-- 3. Create missing 'saved_carts' table to stop 404s
CREATE TABLE IF NOT EXISTS public.saved_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users manage their own cart" ON saved_carts;
    CREATE POLICY "Users manage their own cart" ON saved_carts
        FOR ALL
        USING (auth.uid() = user_id);
END $$;
