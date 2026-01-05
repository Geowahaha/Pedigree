-- ============================================================================
-- UPGRADE CHAT SCHEMA FOR RICH MESSAGES
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add columns for rich messages (Pet Cards, Images, etc.)
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text', -- 'text', 'pet_card', 'image'
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'chat_messages';
