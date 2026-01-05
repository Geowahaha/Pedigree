-- Rollback Script: Remove the duplicate Boontum/Boonnum records created with specific IDs
-- CAREFUL: Only remove records with the specific UUIDs we inserted, to avoid deleting original data.
-- Our script used:
-- Sire ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
-- Dam ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22
-- Match ID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33

DO $$
DECLARE
    sire_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    dam_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    match_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
BEGIN
    -- 1. Remove the mock Breeding Review records
    DELETE FROM breeding_reviews WHERE match_id = match_id;

    -- 2. Remove the mock Breeding Match record
    DELETE FROM breeding_matches WHERE id = match_id;

    -- 3. Remove the DUPLICATE Pets created by the script
    DELETE FROM pets WHERE id = sire_id;
    DELETE FROM pets WHERE id = dam_id;
    
    RAISE NOTICE 'Rollback complete. Removed duplicate Boontum/Boonnum and mock match data.';
END $$;
