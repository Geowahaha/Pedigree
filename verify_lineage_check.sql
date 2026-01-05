-- DATA INTEGRITY CHECK SCRIPT
-- Run this script to view the current family tree relationships in Supabase.
-- Compare the results below with your original Airtable data to identify discrepancies.

SELECT 
    child.name AS "Pet Name (Child)",
    child.breed AS "Breed",
    father.name AS "Father Name",
    mother.name AS "Mother Name",
    child.id AS "Pet ID"
FROM pets child
LEFT JOIN pets father ON child.father_id = father.id
LEFT JOIN pets mother ON child.mother_id = mother.id
WHERE 
   -- Check specific key dogs mentioned
   child.name ILIKE '%Boontum%' OR child.name ILIKE '%บุญทุ่ม%'
   OR child.name ILIKE '%Boonnum%' OR child.name ILIKE '%บุญนำ%'
   OR child.name ILIKE '%Violin%' OR child.name ILIKE '%ไวโอลิน%'
   OR child.name ILIKE '%Jaokhun%' OR child.name ILIKE '%เจ้าขุน%'
   
   -- Also check ANY dog linked to Boontum or Boonnum (to find the accidental/fake puppies)
   OR father.name ILIKE '%Boontum%' OR father.name ILIKE '%บุญทุ่ม%'
   OR mother.name ILIKE '%Boonnum%' OR mother.name ILIKE '%บุญนำ%'
ORDER BY child.name;
