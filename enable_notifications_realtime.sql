-- ============================================================================
-- ENABLE REALTIME FOR NOTIFICATIONS AND CHAT (SAFE VERSION)
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable Realtime for user_notifications table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;
    END IF;
END $$;

-- Enable Realtime for chat_messages table (if not already added)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
END $$;

-- Verify the tables are added
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('user_notifications', 'chat_messages');
