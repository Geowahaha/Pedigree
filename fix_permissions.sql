-- =========================================================================
-- FIX PERMISSIONS & POLICIES (STORAGE + TABLES)
-- =========================================================================

-- 1. FIX STORAGE PERMISSIONS (Crucial for "new row violates RLS" on upload)
-- Note: Policies must be on storage.objects

-- Policy: Allow authenticated users to uplad to 'pet-documents'
CREATE POLICY "Authenticated upload pet-documents"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'pet-documents');

-- Policy: Allow public to view 'pet-documents'
CREATE POLICY "Public view pet-documents"
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'pet-documents');

-- 2. RELAX PET_DOCUMENTS TABLE RLS (For Demo)
-- Previously restricted to "owner only". Since we might not own the mock pets, we relax it.
ALTER TABLE pet_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Owners manage documents" ON pet_documents;
    DROP POLICY IF EXISTS "Auth users manage documents" ON pet_documents;
END $$;

CREATE POLICY "Auth users manage documents" ON pet_documents 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- 3. FIX CHAT PERMISSIONS
-- We need to ensure we can create rooms and participants
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage rooms" ON chat_rooms FOR ALL TO authenticated USING (true);

ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users manage participants" ON chat_participants FOR ALL TO authenticated USING (true);

-- Relax message policy
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users send chats" ON chat_messages;
    DROP POLICY IF EXISTS "Users read their chats" ON chat_messages;
END $$;

CREATE POLICY "Auth users manage messages" ON chat_messages 
FOR ALL 
TO authenticated 
USING (true);
