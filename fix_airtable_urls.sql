-- Fix Expired Airtable Image URLs
-- This script updates pets with expired Airtable URLs to NULL
-- so they will show placeholders instead of 410 errors

-- Option 1: Set to NULL (will show placeholder)
UPDATE pets 
SET image_url = NULL 
WHERE image_url LIKE '%airtableusercontent.com%';

-- Check how many were updated
SELECT COUNT(*) as updated_count FROM pets WHERE image_url IS NULL;

-- Optional: See remaining pets with images
SELECT id, name, breed, 
       CASE WHEN image_url IS NOT NULL THEN 'Has Image' ELSE 'No Image' END as image_status
FROM pets
LIMIT 20;
