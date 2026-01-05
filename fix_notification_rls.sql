-- ============================================================================
-- FIX NOTIFICATION READ STATUS
-- Run this in Supabase SQL Editor to fix the issue where notifications 
-- come back as "unread" after logout.
-- ============================================================================

-- 1. ENABLE ROW LEVEL SECURITY (Just in case)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 2. DROP OLD POLICIES (Start fresh to be safe)
DROP POLICY IF EXISTS "Users view their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users update their own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users manage their own notifications" ON user_notifications;

-- 3. CREATE NEW ROBUST POLICIES

-- Policy: Users can SEE their own notifications
CREATE POLICY "Users view their own notifications"
ON user_notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can UPDATE (Mark as Read) their own notifications
-- This was likely missing or restricted!
CREATE POLICY "Users update their own notifications"
ON user_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: System/Users can INSERT notifications (needed for sending messages)
-- We allow users to insert notifications for OTHERS (sending a chat alert)
CREATE POLICY "Users insert notifications"
ON user_notifications FOR INSERT
TO authenticated
WITH CHECK (true); 
-- Note: In a stricter system we might restrict WHO you can notify, 
-- but for Chat/MVP, allowing auth users to send notifications is standard.

-- 4. VERIFY POLICY STATUS
SELECT 
    '✅ Notification Policies Fixed' as status,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'user_notifications';
