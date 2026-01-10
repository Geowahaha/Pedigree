-- ============================================================================
-- PET SOCIAL FEATURES (Facebook-style)
-- Adds Comments, Likes, and View Counts to Pets
-- ============================================================================

-- 1. PET VIEW COUNTS
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. PET LIKES (Thumbtack/Heart)
CREATE TABLE IF NOT EXISTS public.pet_likes (
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (pet_id, user_id)
);

-- 3. PET COMMENTS (Community Talk)
CREATE TABLE IF NOT EXISTS public.pet_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES public.pet_comments(id) ON DELETE CASCADE, -- For replies
    is_approved BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. RLS POLICIES (Security)

-- Enable RLS
ALTER TABLE public.pet_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_comments ENABLE ROW LEVEL SECURITY;

-- LIKES: Everyone can view, Auth can toggle
CREATE POLICY "Public view likes" ON pet_likes FOR SELECT USING (true);
CREATE POLICY "Auth toggle likes" ON pet_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth remove likes" ON pet_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- COMMENTS: Everyone can view, Auth can post
CREATE POLICY "Public view approved comments" ON pet_comments FOR SELECT USING (is_approved = true);
CREATE POLICY "Users view own comments" ON pet_comments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Auth post comments" ON pet_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth delete own comments" ON pet_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

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

-- 5. HELPER FUNCTION: Increment View Count
-- Safe increment function to avoid race conditions
CREATE OR REPLACE FUNCTION increment_pet_view(target_pet_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.pets
  SET view_count = view_count + 1
  WHERE id = target_pet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_pet_comments_pet_id ON public.pet_comments(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_likes_pet_id ON public.pet_likes(pet_id);

-- 7. NOTIFICATIONS FOR COMMENTS (Optional but cool)
-- When someone comments on your pet, you get a notification
CREATE OR REPLACE FUNCTION notify_pet_comment()
RETURNS TRIGGER AS $$
DECLARE
    owner_uuid UUID;
    pet_name_text TEXT;
BEGIN
    -- Get pet owner and name
    SELECT owner_id, name INTO owner_uuid, pet_name_text FROM public.pets WHERE id = NEW.pet_id;
    
    -- If commenter is not owner, send notification
    IF owner_uuid IS NOT NULL AND owner_uuid != NEW.user_id THEN
        INSERT INTO public.user_notifications (user_id, type, title, message, payload)
        VALUES (
            owner_uuid, 
            'social_comment', 
            'New Comment', 
            'Someone commented on ' || pet_name_text, 
            jsonb_build_object('pet_id', NEW.pet_id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_pet_comment ON public.pet_comments;
CREATE TRIGGER on_pet_comment
    AFTER INSERT ON public.pet_comments
    FOR EACH ROW EXECUTE FUNCTION notify_pet_comment();
