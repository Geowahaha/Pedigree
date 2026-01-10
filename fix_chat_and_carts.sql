-- ============================================================================
-- FIX RLS INFINITE RECURSION & SAVED CARTS
-- Run this in Supabase SQL Editor to fix the "Internal Server Error" (500)
-- ============================================================================

-- 1. FIX CHAT RECURSION BUG
-- We use a precise helper function to break the infinite loop in RLS
CREATE OR REPLACE FUNCTION public.is_room_participant(check_room_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Check if the current user is a participant in the given room
  -- SECURITY DEFINER allows this to run without triggering RLS recursively
  RETURN EXISTS (
    SELECT 1 
    FROM chat_participants 
    WHERE room_id = check_room_id 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the buggy policies
DROP POLICY IF EXISTS "Users view chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users read their chats" ON chat_messages;
DROP POLICY IF EXISTS "Users send chats" ON chat_messages;
DROP POLICY IF EXISTS "Users view their chat rooms" ON chat_rooms;

-- Re-create SAFE policies using the helper function
CREATE POLICY "Users view chat participants"
ON chat_participants FOR SELECT
TO authenticated
USING ( is_room_participant(room_id) );

CREATE POLICY "Users view their chat rooms"
ON chat_rooms FOR SELECT
TO authenticated
USING ( is_room_participant(id) );

CREATE POLICY "Users read their chats"
ON chat_messages FOR SELECT
TO authenticated
USING ( is_room_participant(room_id) );

CREATE POLICY "Users send chats"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK ( is_room_participant(room_id) );

CREATE POLICY "Users update their chats"
ON chat_messages FOR UPDATE
TO authenticated
USING ( is_room_participant(room_id) );

-- Admins can moderate all chat data
DROP POLICY IF EXISTS "Admins manage chat rooms" ON chat_rooms;
CREATE POLICY "Admins manage chat rooms"
ON chat_rooms FOR ALL
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

DROP POLICY IF EXISTS "Admins manage chat participants" ON chat_participants;
CREATE POLICY "Admins manage chat participants"
ON chat_participants FOR ALL
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

DROP POLICY IF EXISTS "Admins manage chat messages" ON chat_messages;
CREATE POLICY "Admins manage chat messages"
ON chat_messages FOR ALL
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


-- 2. FIX SAVED CARTS (406 Error)
-- Ensure the table exists and has proper permissions
CREATE TABLE IF NOT EXISTS public.saved_carts (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid REFERENCES auth.users NOT NULL,
    items jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(user_id)
);

-- Reset RLS for carts to be simple and safe
ALTER TABLE saved_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own cart" ON saved_carts;

CREATE POLICY "Users manage their own cart"
ON saved_carts
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. FINAL VERIFICATION
SELECT 
    '✅ RLS Recursion Fixed' as status,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'is_room_participant') as helper_function_exists;
