
-- Breeding Matches: To track mating/planned litters
CREATE TABLE IF NOT EXISTS breeding_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sire_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    dam_id UUID REFERENCES pets(id) ON DELETE SET NULL,
    match_date DATE NOT NULL,
    due_date DATE, -- Approximate birth date (match_date + 63 days)
    status TEXT CHECK (status IN ('planned', 'mated', 'confirmed', 'born', 'failed')) DEFAULT 'planned',
    requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE breeding_matches ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE breeding_matches ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'approved';
ALTER TABLE breeding_matches ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE breeding_matches ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

UPDATE breeding_matches SET approval_status = 'approved' WHERE approval_status IS NULL;

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
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Matches" ON breeding_matches;
    DROP POLICY IF EXISTS "Public Read Approved Matches" ON breeding_matches;
    CREATE POLICY "Public Read Approved Matches" ON breeding_matches FOR SELECT
    USING (approval_status = 'approved');
END $$;

-- Participants and admins can read pending/rejected matches tied to them
DO $$
BEGIN
    DROP POLICY IF EXISTS "Participants Read Matches" ON breeding_matches;
    CREATE POLICY "Participants Read Matches" ON breeding_matches FOR SELECT
    USING (
        requested_by = auth.uid()
        OR EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
    );
END $$;

-- Breeders can create matches for dams they own (admins allowed)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Breeders manage matches" ON breeding_matches;
    DROP POLICY IF EXISTS "Breeders insert matches" ON breeding_matches;
    CREATE POLICY "Breeders insert matches" ON breeding_matches FOR INSERT
    WITH CHECK (
        (
            requested_by = auth.uid()
            AND EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
    );
END $$;

-- Breeders can update/delete matches tied to their pets (admins allowed)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Breeders update matches" ON breeding_matches;
    CREATE POLICY "Breeders update matches" ON breeding_matches FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
    );
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Breeders delete matches" ON breeding_matches;
    CREATE POLICY "Breeders delete matches" ON breeding_matches FOR DELETE
    USING (
        EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.sire_id AND p.owner_id = auth.uid())
        OR EXISTS (SELECT 1 FROM pets p WHERE p.id = breeding_matches.dam_id AND p.owner_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM profiles pr
            WHERE pr.id = auth.uid()
            AND pr.role = 'admin'
        )
    );
END $$;

-- Users manage their own waiting list entries
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users manage waiting lists" ON waiting_lists;
    CREATE POLICY "Users manage waiting lists" ON waiting_lists FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- Breeders can view waiting lists for their matches
DO $$
BEGIN
    DROP POLICY IF EXISTS "Breeders view waiting lists" ON waiting_lists;
    CREATE POLICY "Breeders view waiting lists" ON waiting_lists FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM breeding_matches bm
            JOIN pets p ON (p.id = bm.sire_id OR p.id = bm.dam_id)
            WHERE bm.id = waiting_lists.match_id
              AND p.owner_id = auth.uid()
        )
    );
END $$;

-- Breeders can update waiting list status for their matches
DO $$
BEGIN
    DROP POLICY IF EXISTS "Breeders update waiting lists" ON waiting_lists;
    CREATE POLICY "Breeders update waiting lists" ON waiting_lists FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM breeding_matches bm
            JOIN pets p ON (p.id = bm.sire_id OR p.id = bm.dam_id)
            WHERE bm.id = waiting_lists.match_id
              AND p.owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM breeding_matches bm
            JOIN pets p ON (p.id = bm.sire_id OR p.id = bm.dam_id)
            WHERE bm.id = waiting_lists.match_id
              AND p.owner_id = auth.uid()
        )
    );
END $$;

-- Admin can manage waiting lists
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admin manage waiting lists" ON waiting_lists;
    CREATE POLICY "Admin manage waiting lists" ON waiting_lists FOR ALL
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

-- Conversation access for participants only
DO $$
BEGIN
    DROP POLICY IF EXISTS "Participants manage conversations" ON conversations;
    CREATE POLICY "Participants manage conversations" ON conversations FOR ALL
    USING (participant1_id = auth.uid() OR participant2_id = auth.uid())
    WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());
END $$;

-- Admins can moderate all conversations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage conversations" ON conversations;
    CREATE POLICY "Admins manage conversations" ON conversations FOR ALL
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

-- Messages are visible to conversation participants
DO $$
BEGIN
    DROP POLICY IF EXISTS "Participants read messages" ON messages;
    CREATE POLICY "Participants read messages" ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM conversations c
            WHERE c.id = messages.conversation_id
              AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

    DROP POLICY IF EXISTS "Participants send messages" ON messages;
    CREATE POLICY "Participants send messages" ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1
            FROM conversations c
            WHERE c.id = messages.conversation_id
              AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );

    DROP POLICY IF EXISTS "Participants update messages" ON messages;
    CREATE POLICY "Participants update messages" ON messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM conversations c
            WHERE c.id = messages.conversation_id
              AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM conversations c
            WHERE c.id = messages.conversation_id
              AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
        )
    );
END $$;

-- Admins can moderate all messages
DO $$
BEGIN
    DROP POLICY IF EXISTS "Admins manage messages" ON messages;
    CREATE POLICY "Admins manage messages" ON messages FOR ALL
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
