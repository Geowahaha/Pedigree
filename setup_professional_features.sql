
-- =========================================================================
-- PETDEGREE PROFESSIONAL SUITE - SCHEMA UPGRADE
-- FEATURES: Health Vault, Chat, Breeding Tools, History
-- =========================================================================

-- 1. PROFESSIONAL HEALTH VAULT (Documents)
CREATE TABLE IF NOT EXISTS public.pet_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'vaccination', 'medical_report', 'dna_test', 'award'
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    issue_date DATE,
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. COMMUNICATION SYSTEM (Chat)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. REPUTATION SYSTEM (Reviews)
CREATE TABLE IF NOT EXISTS public.user_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    transaction_id UUID, -- Optional link to a specific transaction/booking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. ADVANCED BREEDING TOOLS
-- Heat Cycle Tracking
CREATE TABLE IF NOT EXISTS public.heat_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Litter Management (Birth Records)
CREATE TABLE IF NOT EXISTS public.litters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dam_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    sire_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    breeder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    puppy_count INTEGER DEFAULT 0,
    deceased_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. OWNERSHIP HISTORY (Blockchain-style History)
CREATE TABLE IF NOT EXISTS public.ownership_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
    previous_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    new_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transfer_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    transfer_method TEXT, -- 'sale', 'gift', 'adoption'
    transfer_price DECIMAL(12, 2)
);

-- Buckets (if not exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pet-documents', 'pet-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS POLICIES (Idempotent)
ALTER TABLE pet_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read documents" ON pet_documents;
    CREATE POLICY "Public read documents" ON pet_documents FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Owners manage documents" ON pet_documents;
    CREATE POLICY "Owners manage documents" ON pet_documents FOR ALL USING (auth.uid() IN (SELECT owner_id FROM pets WHERE id = pet_id));
END $$;

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users read their chats" ON chat_messages;
    CREATE POLICY "Users read their chats" ON chat_messages FOR SELECT USING (
        EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.room_id = room_id AND cp.user_id = auth.uid())
    );

    DROP POLICY IF EXISTS "Users send chats" ON chat_messages;
    CREATE POLICY "Users send chats" ON chat_messages FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM chat_participants cp WHERE cp.room_id = room_id AND cp.user_id = auth.uid())
    );
END $$;

ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public read reviews" ON user_reviews;
    CREATE POLICY "Public read reviews" ON user_reviews FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Authenticated create reviews" ON user_reviews;
    CREATE POLICY "Authenticated create reviews" ON user_reviews FOR INSERT WITH CHECK (auth.role() = 'authenticated');
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_pet_documents_pet_id ON pet_documents(pet_id);
CREATE INDEX IF NOT EXISTS idx_ownership_history_pet_id ON ownership_history(pet_id);
