-- Add verification status columns to pets table
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS father_verified_status text DEFAULT 'pending' CHECK (father_verified_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS mother_verified_status text DEFAULT 'pending' CHECK (mother_verified_status IN ('pending', 'verified', 'rejected'));

-- Ensure user_notifications table exists (based on usage in database.ts)
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on user_notifications if not already enabled
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for user_notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'Users can view their own notifications'
    ) THEN
        CREATE POLICY "Users can view their own notifications" ON user_notifications
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_notifications' AND policyname = 'System can insert notifications'
    ) THEN
        CREATE POLICY "System can insert notifications" ON user_notifications
        FOR INSERT WITH CHECK (true); -- Ideally restrictive, but for MVP allow inserts
    END IF;
END $$;
