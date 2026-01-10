-- ============================================================================
-- FIX SOCIAL RELATIONSHIPS & 406/400 ERRORS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. DROP EXISTING TABLES to recreate with correct Foreign Keys
DROP TABLE IF EXISTS public.pet_comments CASCADE;
DROP TABLE IF EXISTS public.pet_likes CASCADE;

-- 2. RECREATE TABLES LINKED TO auth.users (Standard)
-- Note: Supabase JS Client automatically handles the join if we use public.profiles instead, 
-- but usually auth.users is safer for strict auth.
-- HOWEVER, to show "Full Name" and "Avatar", we MUST link to `public.profiles`
-- because `auth.users` data is not readable by public.

CREATE TABLE public.pet_likes (
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed from auth.users to public.profiles
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (pet_id, user_id)
);

CREATE TABLE public.pet_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Changed from auth.users to public.profiles
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.pet_comments(id) ON DELETE CASCADE,
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.pet_comments ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false;
ALTER TABLE public.pet_comments ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.pet_comments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

UPDATE public.pet_comments SET is_approved = true WHERE is_approved IS NULL;

-- 3. ENABLE RLS
ALTER TABLE public.pet_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_comments ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (Updated for profiles)

-- LIKES
CREATE POLICY "Public view likes" ON pet_likes FOR SELECT USING (true);
CREATE POLICY "Users toggle likes" ON pet_likes FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users remove likes" ON pet_likes FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

-- COMMENTS
CREATE POLICY "Public view approved comments" ON pet_comments FOR SELECT USING (is_approved = true);
CREATE POLICY "Users view own comments" ON pet_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users post comments" ON pet_comments FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comments" ON pet_comments FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage comments" ON pet_comments FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Admins manage likes" ON pet_likes FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- 5. RE-ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE pet_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE pet_likes;

-- 6. GRANT PERMISSIONS (Fixes 406/401)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_comments TO authenticated;
GRANT SELECT ON public.pet_comments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pet_likes TO authenticated;
GRANT SELECT ON public.pet_likes TO anon;
