-- =====================================================
-- Breeding Market - Social Features & Reservations
-- =====================================================

-- 1. RESERVATION QUEUE
-- Stores user interest in a specific puppy limit from a breeding pair
CREATE TABLE IF NOT EXISTS breeding_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sire_id UUID REFERENCES pets(id) NOT NULL,
    dam_id UUID REFERENCES pets(id) NOT NULL,
    user_contact TEXT, -- Email or Phone number provided by user
    user_note TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'contacted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
