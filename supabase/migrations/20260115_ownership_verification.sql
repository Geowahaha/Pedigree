-- ============================================
-- Pet Ownership Verification System
-- Migration: 2026-01-15
-- ============================================

-- 1. Add ownership columns to pets table
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS ownership_status TEXT DEFAULT 'verified',
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS claim_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_evidence JSONB;

-- Add comment
COMMENT ON COLUMN pets.ownership_status IS 'verified, waiting_owner, pending_claim, disputed';

-- 2. Create ownership_claims table
CREATE TABLE IF NOT EXISTS ownership_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE NOT NULL,
    claimant_id UUID REFERENCES profiles(id) NOT NULL,
    claim_type TEXT NOT NULL, -- 'original_owner', 'new_owner', 'breeder'
    evidence TEXT, -- Description
    evidence_files JSONB DEFAULT '[]'::jsonb, -- Photos, documents
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pet_id, claimant_id) -- One claim per user per pet
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ownership_claims_status ON ownership_claims(status);
CREATE INDEX IF NOT EXISTS idx_ownership_claims_pet ON ownership_claims(pet_id);
CREATE INDEX IF NOT EXISTS idx_ownership_claims_claimant ON ownership_claims(claimant_id);

-- Enable Row Level Security
ALTER TABLE ownership_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ownership_claims
CREATE POLICY "Users can view their own claims"
    ON ownership_claims FOR SELECT
    USING (auth.uid() = claimant_id);

CREATE POLICY "Users can create claims"
    ON ownership_claims FOR INSERT
    WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Admins can view all claims"
    ON ownership_claims FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
        )
    );

CREATE POLICY "Admins can update claims"
    ON ownership_claims FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() 
            AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
        )
    );

-- 3. Create claim_messages table
CREATE TABLE IF NOT EXISTS claim_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_id UUID REFERENCES ownership_claims(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES profiles(id) NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_claim_messages_claim ON claim_messages(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_messages_created ON claim_messages(created_at);

-- Enable Row Level Security
ALTER TABLE claim_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for claim_messages
CREATE POLICY "Claim participants can view messages"
    ON claim_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ownership_claims oc
            WHERE oc.id = claim_id
            AND (
                oc.claimant_id = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
                )
            )
        )
    );

CREATE POLICY "Claim participants can send messages"
    ON claim_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ownership_claims oc
            WHERE oc.id = claim_id
            AND (
                oc.claimant_id = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
                )
            )
        )
    );

-- 4. Create function to update pet ownership after approval
CREATE OR REPLACE FUNCTION approve_ownership_claim(
    claim_id_param UUID,
    admin_id_param UUID,
    admin_notes_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    claim_record ownership_claims;
    result JSONB;
BEGIN
    -- Check if admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = admin_id_param 
        AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Get claim details
    SELECT * INTO claim_record
    FROM ownership_claims
    WHERE id = claim_id_param;

    IF claim_record IS NULL THEN
        RAISE EXCEPTION 'Claim not found';
    END IF;

    IF claim_record.status != 'pending' THEN
        RAISE EXCEPTION 'Claim already processed';
    END IF;

    -- Update pet ownership
    UPDATE pets
    SET 
        owner_id = claim_record.claimant_id,
        ownership_status = 'verified',
        claimed_by = claim_record.claimant_id,
        claim_date = NOW()
    WHERE id = claim_record.pet_id;

    -- Update claim status
    UPDATE ownership_claims
    SET 
        status = 'approved',
        reviewed_by = admin_id_param,
        admin_notes = admin_notes_param,
        updated_at = NOW()
    WHERE id = claim_id_param;

    -- Return success
    result := jsonb_build_object(
        'success', true,
        'claim_id', claim_id_param,
        'pet_id', claim_record.pet_id,
        'new_owner_id', claim_record.claimant_id
    );

    RETURN result;
END;
$$;

-- 5. Create function to reject ownership claim
CREATE OR REPLACE FUNCTION reject_ownership_claim(
    claim_id_param UUID,
    admin_id_param UUID,
    admin_notes_param TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    claim_record ownership_claims;
    result JSONB;
BEGIN
    -- Check if admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = admin_id_param 
        AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
    ) THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    -- Get claim details
    SELECT * INTO claim_record
    FROM ownership_claims
    WHERE id = claim_id_param;

    IF claim_record IS NULL THEN
        RAISE EXCEPTION 'Claim not found';
    END IF;

    -- Update claim status
    UPDATE ownership_claims
    SET 
        status = 'rejected',
        reviewed_by = admin_id_param,
        admin_notes = admin_notes_param,
        updated_at = NOW()
    WHERE id = claim_id_param;

    -- Reset pet ownership status if this was the only claim
    UPDATE pets
    SET ownership_status = 'waiting_owner'
    WHERE id = claim_record.pet_id
    AND NOT EXISTS (
        SELECT 1 FROM ownership_claims
        WHERE pet_id = claim_record.pet_id
        AND status = 'pending'
        AND id != claim_id_param
    );

    -- Return success
    result := jsonb_build_object(
        'success', true,
        'claim_id', claim_id_param,
        'pet_id', claim_record.pet_id
    );

    RETURN result;
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION approve_ownership_claim TO authenticated;
GRANT EXECUTE ON FUNCTION reject_ownership_claim TO authenticated;

-- 7. Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ownership_claims_updated_at 
    BEFORE UPDATE ON ownership_claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- END OF MIGRATION
-- ============================================
