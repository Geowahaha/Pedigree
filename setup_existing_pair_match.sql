-- Link Existing Boontum & Boonnum to a Breeding Record
DO $$
DECLARE
    -- These variables will hold the IDs of the REAL pets found in the database
    real_sire_id UUID;
    real_dam_id UUID;
    
    -- New ID for the breeding match (we can keep this stable)
    match_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
BEGIN
    -- 1. Find the REAL 'Boontum' (Sire)
    -- We assume the name contains 'Boontum' or 'บุญทุ่ม'
    SELECT id INTO real_sire_id 
    FROM pets 
    WHERE name ILIKE '%Boontum%' OR name ILIKE '%บุญทุ่ม%'
    LIMIT 1;

    -- 2. Find the REAL 'Boonnum' (Dam)
    SELECT id INTO real_dam_id 
    FROM pets 
    WHERE name ILIKE '%Boonnum%' OR name ILIKE '%บุญนำ%'
    LIMIT 1;

    -- 3. Validation: Stop if not found
    IF real_sire_id IS NULL OR real_dam_id IS NULL THEN
        RAISE EXCEPTION 'Could not find existing Boontum or Boonnum in the database. Please check the exact names.';
    END IF;

    -- 4. Create the Breeding Match using the FOUND IDs
    INSERT INTO breeding_matches (id, sire_id, dam_id, match_date, due_date, status, description)
    VALUES (
        match_id,
        real_sire_id,
        real_dam_id,
        CURRENT_DATE, 
        CURRENT_DATE + 63, 
        'confirmed',
        'Official breeding match for Boontum and Boonnum.'
    )
    ON CONFLICT (id) DO UPDATE SET
        sire_id = EXCLUDED.sire_id,
        dam_id = EXCLUDED.dam_id;

    -- 5. Add Mock Reviews (Social Proof) to this match
    -- Ensure reviews reference the correct match_id
    DELETE FROM breeding_reviews WHERE match_id = match_id; -- Clear old ones to prevent duplicates

    INSERT INTO breeding_reviews (match_id, user_name, comment, rating)
    VALUES 
        (match_id, 'Somsak K.', 'น่าตื่นเต้นจังเลย นี่คือรูปน้องหมาที่บ้านก็ลูกของคู่นี้มันยอดเยี่ยมมาก จิตประสาทดีมาก รู้ประสา', 5),
        (match_id, 'Jenny T.', 'ใครได้คู้นี้ไปไม่ผิดหวังแน่นอน Quality breeding match!', 5);
        
    RAISE NOTICE 'Linked existing Boontum (ID: %) and Boonnum (ID: %) to new breeding match.', real_sire_id, real_dam_id;

END $$;
