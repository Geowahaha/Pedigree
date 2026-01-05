-- Link some existing Thai Ridgeback dogs as children of Boontum & Boonnum
-- ensuring we have a "Success Story" to display.

DO $$
DECLARE
    boontum_id UUID;
    boonnum_id UUID;
BEGIN
    -- 1. Find the Parents
    SELECT id INTO boontum_id FROM pets WHERE name ILIKE '%Boontum%' OR name ILIKE '%บุญทุ่ม%' LIMIT 1;
    SELECT id INTO boonnum_id FROM pets WHERE name ILIKE '%Boonnum%' OR name ILIKE '%บุญนำ%' LIMIT 1;

    IF boontum_id IS NOT NULL AND boonnum_id IS NOT NULL THEN
        -- 2. Find some "Puppies" (Thai Ridgebacks that are NOT the parents)
        -- Update 3 random Thai Ridgebacks to be their children
        UPDATE pets 
        SET father_id = boontum_id, mother_id = boonnum_id
        WHERE id IN (
            SELECT id FROM pets 
            WHERE breed ILIKE '%Thai Ridgeback%' 
            AND id NOT IN (boontum_id, boonnum_id)
            ORDER BY RANDOM()
            LIMIT 3
        );
        
        RAISE NOTICE 'Linked 3 puppies to Boontum and Boonnum';
    END IF;
END $$;
