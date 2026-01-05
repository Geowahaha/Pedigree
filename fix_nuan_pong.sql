-- Update the specific pet 'Nuan Pong' (TRD-BOONPING-05-005)
-- Fix type to 'dog', breed to 'Thai Ridgeback', and gender to 'female'
UPDATE pets
SET 
  type = 'dog',
  breed = 'Thai Ridgeback Dogs หมาไทยหลังอาน',
  gender = 'female'
WHERE 
  registration_number = 'TRD-BOONPING-05-005' 
  OR name = 'นวลผ่อง';

-- Also ensure 'type' is correct for other Thai Ridgebacks just in case
UPDATE pets
SET type = 'dog'
WHERE breed ILIKE '%Thai Ridgeback%';
