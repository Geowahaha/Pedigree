-- Enable Realtime for Chat Messages so "popups" (live updates) work
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Enable Realtime for Notifications too (optional but good UI)
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- Check and Fix Notification RLS to allow users to "send" notifications (chat alerts) to others
-- The previous policy was "Admins send notifications". We need to allow users to trigger them too for chats.
DROP POLICY IF EXISTS "Admins send notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users and Admins send notifications" ON user_notifications;

CREATE POLICY "Users and Admins send notifications"
ON public.user_notifications FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow any auth user to generate a notification (spam risk in prod, fine for MVP)
