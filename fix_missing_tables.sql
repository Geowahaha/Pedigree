-- ============================================================================
-- FIX MISSING TABLES (Saved Carts)
-- Resolves 404/406 Error on saved_carts
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. Create saved_carts table if it's missing or broken
CREATE TABLE IF NOT EXISTS public.saved_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id) -- One cart per user
);

-- 2. Verify RLS
ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

-- 3. Create Policy (Users manage own cart)
DROP POLICY IF EXISTS "Users manage own cart" ON saved_carts;

CREATE POLICY "Users manage own cart"
ON saved_carts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. Grant Permissions (Fixes 406/401)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_carts TO authenticated;
GRANT SELECT ON public.saved_carts TO anon; -- Allow anon to try (will fail gracefully or read generic)

-- 5. Fix review relationships (just in case)
ALTER TABLE public.user_reviews 
DROP CONSTRAINT IF EXISTS user_reviews_reviewer_id_fkey,
ADD CONSTRAINT user_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id);

ALTER TABLE public.user_reviews 
DROP CONSTRAINT IF EXISTS user_reviews_target_user_id_fkey,
ADD CONSTRAINT user_reviews_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.profiles(id);

-- 6. Grant Permissions on Reviews
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_reviews TO authenticated;
GRANT SELECT ON public.user_reviews TO anon;
