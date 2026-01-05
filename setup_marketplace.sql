
-- Breeding Matches: To track mating/planned litters
CREATE TABLE IF NOT EXISTS breeding_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sire_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    dam_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    match_date DATE NOT NULL,
    due_date DATE, -- Approximate birth date (match_date + 63 days)
    status TEXT CHECK (status IN ('planned', 'mated', 'confirmed', 'born', 'failed')) DEFAULT 'planned',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waiting List: For users to reserve puppies from a match
CREATE TABLE IF NOT EXISTS waiting_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID REFERENCES breeding_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Link to auth.users if possible, or store contact info
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'deposited', 'completed', 'cancelled')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat System: Conversations between users (Buyer <-> Owner)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    participant1_id UUID NOT NULL, -- User 1 (e.g. Buyer)
    participant2_id UUID NOT NULL, -- User 2 (e.g. Owner)
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies (Security)
ALTER TABLE breeding_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow public read for breeding matches (so everyone can see upcoming puppies)
CREATE POLICY "Public Read Matches" ON breeding_matches FOR SELECT USING (true);

-- (More policies will be needed for writes/updates later)
