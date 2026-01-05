-- ============================================================================
-- ENABLE REALTIME FOR SOCIAL FEATURES
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable publication for pet_likes and pet_comments
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'pet_comments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE pet_comments;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'pet_likes'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE pet_likes;
    END IF;
END $$;

-- Verify
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
