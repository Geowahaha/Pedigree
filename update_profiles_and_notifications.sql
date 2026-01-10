-- Add new columns to profiles if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS experience_points INTEGER DEFAULT 0;

-- Profile access control (idempotent)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read profiles" ON profiles;
    CREATE POLICY "Public read profiles" ON profiles FOR SELECT
    USING (true);

    DROP POLICY IF EXISTS "Users update own profile" ON profiles;
    CREATE POLICY "Users update own profile" ON profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
    CREATE POLICY "Users insert own profile" ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

    DROP POLICY IF EXISTS "Admins manage profiles" ON profiles;
    CREATE POLICY "Admins manage profiles" ON profiles FOR ALL
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
END $$;

-- Create avatar bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public Read Avatars
CREATE POLICY "Public Read Avatars" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'user-avatars' );

-- Policy: User Upload Own Avatar
CREATE POLICY "User Upload Avatar" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'user-avatars' );

-- User Notification System
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'system', 'breeding', 'puppy', 'promo'
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB, -- For generic links or data
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for Notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
ON public.user_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can insert notifications for users (e.g., system wide or specific)
-- Or triggers
CREATE POLICY "Admins send notifications"
ON public.user_notifications FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
