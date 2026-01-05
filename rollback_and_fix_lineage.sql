-- 1. Unlink the random puppies I incorrectly assigned to Boontum (sire) and Boonnum (dam)
-- I will identify them by finding pets who have Boontum as father AND Boonnum as mother
-- and set their parents back to NULL (assuming they were orphans before my script).

DO $$
DECLARE
    boontum_id UUID;
    boonnum_id UUID;
    violin_id UUID;
    jaokhun_id UUID;
BEGIN
    -- Get IDs
    SELECT id INTO boontum_id FROM pets WHERE name ILIKE '%Boontum%' OR name ILIKE '%บุญทุ่ม%' LIMIT 1;
    SELECT id INTO boonnum_id FROM pets WHERE name ILIKE '%Boonnum%' OR name ILIKE '%บุญนำ%' LIMIT 1;
    
    -- 1. ROLLBACK: Build the "undo" logic
    IF boontum_id IS NOT NULL AND boonnum_id IS NOT NULL THEN
        UPDATE pets 
        SET father_id = NULL, mother_id = NULL
        WHERE father_id = boontum_id AND mother_id = boonnum_id;
        
        RAISE NOTICE 'Rolled back random puppy links for Boontum/Boonnum pair.';
    END IF;

    -- 2. CORRECT DATA: Link "Jaokhun" to "Boontum" and "Violin"
    -- Check if Violin exists
    SELECT id INTO violin_id FROM pets WHERE name ILIKE '%Violin%' OR name ILIKE '%ไวโอลิน%' LIMIT 1;
    -- Find Jaokhun by name
    SELECT id INTO jaokhun_id FROM pets WHERE name ILIKE '%Jaokhun%' OR name ILIKE '%เจ้าขุน%' LIMIT 1;

    -- Only proceed if we found all three
    IF violin_id IS NOT NULL AND jaokhun_id IS NOT NULL AND boontum_id IS NOT NULL THEN
        UPDATE pets 
        SET father_id = boontum_id, mother_id = violin_id 
        WHERE id = jaokhun_id;
        
        RAISE NOTICE 'Corrected Jaokhun pedigree: Father=Boontum, Mother=Violin';
    ELSE
        RAISE WARNING 'Could not find Violin or Jaokhun in the database. Please verify their names.';
    END IF;

END $$;
