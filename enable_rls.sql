
-- Re-enable RLS for security
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- Ensure policy allows public read
DROP POLICY IF EXISTS "Public Read Pets" ON pets;
CREATE POLICY "Public Read Pets" ON pets FOR SELECT USING (true);
