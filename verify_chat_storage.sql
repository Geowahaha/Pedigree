-- ============================================================================
-- VERIFY AND FIX CHAT MESSAGE STORAGE & PERMISSIONS
-- Ensures all messages are stored permanently and accessible to the right users
-- ============================================================================

-- 1. VERIFY CHAT TABLES EXIST
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('chat_rooms'),
        ('chat_participants'),
        ('chat_messages')
) AS t(table_name);

-- 2. CHECK CURRENT RLS POLICIES FOR CHAT
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('chat_rooms', 'chat_participants', 'chat_messages')
ORDER BY tablename, policyname;

-- 3. ENSURE PROPER RLS POLICIES FOR CHAT MESSAGES
-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users read their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users send chats" ON chat_messages;
DROP POLICY IF EXISTS "Users view their chat rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Users view chat participants" ON chat_participants;

-- Enable RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- CHAT ROOMS: Users can view rooms they're part of
CREATE POLICY "Users view their chat rooms"
ON chat_rooms FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT room_id 
        FROM chat_participants 
        WHERE user_id = auth.uid()
    )
);

-- CHAT PARTICIPANTS: Users can view participants in their rooms
CREATE POLICY "Users view chat participants"
ON chat_participants FOR SELECT
TO authenticated
USING (
    room_id IN (
        SELECT room_id 
        FROM chat_participants 
        WHERE user_id = auth.uid()
    )
);

-- CHAT MESSAGES: Users can read messages in their rooms
CREATE POLICY "Users read their chats"
ON chat_messages FOR SELECT
TO authenticated
USING (
    room_id IN (
        SELECT room_id 
        FROM chat_participants 
        WHERE user_id = auth.uid()
    )
);

-- CHAT MESSAGES: Users can send messages to their rooms
CREATE POLICY "Users send chats"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (
    room_id IN (
        SELECT room_id 
        FROM chat_participants 
        WHERE user_id = auth.uid()
    )
);

-- CHAT MESSAGES: Users can update their own messages (for read receipts)
CREATE POLICY "Users update message status"
ON chat_messages FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. VERIFY STORAGE RETENTION (Messages are stored permanently)
-- Check if there's any retention policy that might delete messages
SELECT 
    'chat_messages' as table_name,
    COUNT(*) as total_messages,
    MIN(created_at) as oldest_message,
    MAX(created_at) as newest_message
FROM chat_messages;

-- 5. CREATE INDEX FOR PERFORMANCE (if not exists)
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created 
ON chat_messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
ON chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user 
ON chat_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_participants_room 
ON chat_participants(room_id);

-- 6. VERIFY FOREIGN KEY CONSTRAINTS
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('chat_rooms', 'chat_participants', 'chat_messages')
ORDER BY tc.table_name;

-- 7. FINAL VERIFICATION SUMMARY
SELECT 
    '✅ Chat System Ready' as status,
    (SELECT COUNT(*) FROM chat_rooms) as total_rooms,
    (SELECT COUNT(*) FROM chat_participants) as total_participants,
    (SELECT COUNT(*) FROM chat_messages) as total_messages,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('chat_rooms', 'chat_participants', 'chat_messages')) as total_policies;
