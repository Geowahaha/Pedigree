DO $$
DECLARE
    -- Rename variables to avoid ambiguity with column names
    target_match_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    
    -- IDs of the DUPLICATE pets to remove
    dup_sire_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    dup_dam_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    
    real_sire_id UUID;
    real_dam_id UUID;
BEGIN
    -- 1. DELETE the duplicates and associated match data
    -- Explicitly specify table column vs variable
    DELETE FROM breeding_reviews WHERE breeding_reviews.match_id = target_match_id;
    DELETE FROM breeding_matches WHERE breeding_matches.id = target_match_id;
    DELETE FROM pets WHERE pets.id IN (dup_sire_id, dup_dam_id);

    -- 2. FIND the original pets (Searching by name)
    SELECT id INTO real_sire_id FROM pets WHERE name ILIKE '%Boontum%' OR name ILIKE '%บุญทุ่ม%' LIMIT 1;
    SELECT id INTO real_dam_id FROM pets WHERE name ILIKE '%Boonnum%' OR name ILIKE '%บุญนำ%' LIMIT 1;

    -- 3. RE-CREATE the match using the REAL pets
    IF real_sire_id IS NOT NULL AND real_dam_id IS NOT NULL THEN
        INSERT INTO breeding_matches (id, sire_id, dam_id, match_date, due_date, status)
        VALUES (target_match_id, real_sire_id, real_dam_id, CURRENT_DATE, CURRENT_DATE + 63, 'confirmed');

        -- Restore the reviews linked to this new valid match
        INSERT INTO breeding_reviews (match_id, user_name, comment, rating)
        VALUES 
            (target_match_id, 'Somsak K.', 'น่าตื่นเต้นจังเลย นี่คือรูปน้องหมาที่บ้านก็ลูกของคู่นี้มันยอดเยี่ยมมาก จิตประสาทดีมาก รู้ประสา', 5),
            (target_match_id, 'Jenny T.', 'ใครได้คู้นี้ไปไม่ผิดหวังแน่นอน Quality breeding match!', 5);
            
        RAISE NOTICE '✅ Successfully linked REAL Boontum (ID: %) and Boonnum (ID: %)', real_sire_id, real_dam_id;
    ELSE
        RAISE NOTICE '⚠️ Could not find original Boontum/Boonnum. Cleaning up duplicates only.';
    END IF;
END $$;
