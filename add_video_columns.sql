-- Add video support columns to pets table
-- Run this in Supabase SQL Editor

-- Add video_url column (stores direct video links or social media URLs)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add media_type column (image, video)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image';

-- Add source column (internal, tiktok, youtube, instagram)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal';

-- Add external_link column (original source URL)
ALTER TABLE pets ADD COLUMN IF NOT EXISTS external_link TEXT;

-- Create index for faster queries on media type
CREATE INDEX IF NOT EXISTS idx_pets_media_type ON pets(media_type);

-- Update existing pets with video_url from description JSON if applicable
-- This is a one-time migration
UPDATE pets 
SET 
  video_url = (description::jsonb ->> 'video_url'),
  media_type = COALESCE((description::jsonb ->> 'media_type'), 'image'),
  source = COALESCE((description::jsonb ->> 'source'), 'internal'),
  external_link = (description::jsonb ->> 'external_link')
WHERE 
  description IS NOT NULL 
  AND description LIKE '{%'
  AND video_url IS NULL;

COMMENT ON COLUMN pets.video_url IS 'URL for video content (mp4, YouTube, TikTok, Instagram)';
COMMENT ON COLUMN pets.media_type IS 'Type of media: image or video';
COMMENT ON COLUMN pets.source IS 'Source platform: internal, tiktok, youtube, instagram';
COMMENT ON COLUMN pets.external_link IS 'Original external link if imported from social media';
