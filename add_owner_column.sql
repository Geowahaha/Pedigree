
-- Add owner_name column to store "House/Breeder" name from Airtable
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Disable RLS temporarily to allow the migration script to update this new column
ALTER TABLE pets DISABLE ROW LEVEL SECURITY;
