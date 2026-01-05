
-- TEMPORARY: Allow all operations for migration
ALTER TABLE pets DISABLE ROW LEVEL SECURITY;

-- (Or if you prefer to keep RLS enabled but allow updates)
-- CREATE POLICY "Allow All Updates" ON pets FOR UPDATE USING (true) WITH CHECK (true);
