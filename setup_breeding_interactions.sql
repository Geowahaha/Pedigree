-- =====================================================
-- Breeding Market - Social Features & Reservations
-- =====================================================

-- 1. RESERVATION QUEUE
-- Stores user interest in a specific puppy limit from a breeding pair
CREATE TABLE IF NOT EXISTS breeding_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sire_id UUID REFERENCES pets(id) NOT NULL,
    dam_id UUID REFERENCES pets(id) NOT NULL,
    user_id UUID REFERENCES profiles(id),
    user_contact TEXT, -- Email or Phone number provided by user
    user_note TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'contacted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE breeding_reservations ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id);

CREATE INDEX IF NOT EXISTS breeding_reservations_user_id_idx ON breeding_reservations(user_id);

-- 2. CHAT REQUESTS
-- Since we don't have a full real-time chat system yet, this logs a "Connection Request"
-- The system or owner can then reach out via email/phone.
CREATE TABLE IF NOT EXISTS breeding_chat_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sire_id UUID REFERENCES pets(id), -- Context: Chatting about this sire...
    dam_id UUID REFERENCES pets(id), -- ...or this pair
    owner_name TEXT, -- The owner being contacted
    visitor_contact TEXT, -- The person wanting to chat
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. REPORTS
-- To report issues with specific matches (incorrect lineage, fake photos, etc)
CREATE TABLE IF NOT EXISTS breeding_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sire_id UUID REFERENCES pets(id),
    dam_id UUID REFERENCES pets(id),
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS (Row Level Security) - Optional but recommended
-- For now we enable it but allow public insert for the MVP demo to work without auth
ALTER TABLE breeding_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_chat_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (Apply for reservation / Request chat)
CREATE POLICY "Allow public insert reservations" ON breeding_reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert chat" ON breeding_chat_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert reports" ON breeding_reports FOR INSERT WITH CHECK (true);

-- Allow public read just for demo purposes (in production, restrict to own data)
CREATE POLICY "Allow public read reservations" ON breeding_reservations FOR SELECT USING (true);

-- Admin override: manage all pending/records
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin manage reservations" ON breeding_reservations;
    CREATE POLICY "Admin manage reservations" ON breeding_reservations FOR ALL
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
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin manage chat requests" ON breeding_chat_requests;
    CREATE POLICY "Admin manage chat requests" ON breeding_chat_requests FOR ALL
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
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin manage reports" ON breeding_reports;
    CREATE POLICY "Admin manage reports" ON breeding_reports FOR ALL
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
END $$;
