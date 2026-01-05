-- 1. Add the missing 'type' column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pets' AND column_name = 'type') THEN
        ALTER TABLE pets ADD COLUMN type TEXT CHECK (type IN ('dog', 'cat'));
    END IF;
END $$;

-- 2. Populate 'type' based on existing known breeds (Bulk Update)

-- Dogs
UPDATE pets
SET type = 'dog'
WHERE 
  (type IS NULL) 
  AND (
    breed ILIKE '%dog%' OR 
    breed ILIKE '%retriever%' OR 
    breed ILIKE '%shepherd%' OR 
    breed ILIKE '%terrier%' OR
    breed ILIKE '%bulldog%' OR
    breed ILIKE '%pomeranian%' OR
    breed ILIKE '%หมา%' OR 
    breed ILIKE '%สุนัข%' OR
    breed ILIKE '%thai ridgeback%' OR
    breed ILIKE '%bangkaew%'
  );

-- Cats
UPDATE pets
SET type = 'cat'
WHERE 
  (type IS NULL) 
  AND (
    breed ILIKE '%cat%' OR 
    breed ILIKE '%persian%' OR 
    breed ILIKE '%shorthair%' OR 
    breed ILIKE '%maine coon%' OR
    breed ILIKE '%scottish%' OR
    breed ILIKE '%แมว%'
  );

-- 3. Specific Fix for 'Nuan Pong' (Thai Ridgeback)
UPDATE pets
SET 
  type = 'dog',
  breed = 'Thai Ridgeback Dogs หมาไทยหลังอาน',
  gender = 'female'
WHERE 
  registration_number = 'TRD-BOONPING-05-005' 
  OR name = 'นวลผ่อง';

-- 4. Default any remaining pets to 'dog' (Safe fallback for existing data)
UPDATE pets SET type = 'dog' WHERE type IS NULL;
