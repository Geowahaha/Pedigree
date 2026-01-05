-- =====================================================
-- Petdegree - Supabase Pets Schema
-- Migration from Airtable to Supabase
-- =====================================================

-- Drop existing objects if they exist
DROP VIEW IF EXISTS pets_with_parents CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_registration_number(TEXT, TEXT, UUID, UUID) CASCADE;
DROP TABLE IF EXISTS pets CASCADE;

-- 1. Create pets table
CREATE TABLE pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Basic Information
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('dog', 'cat')),
  breed TEXT NOT NULL,
  gender TEXT CHECK (gender IN ('male', 'female', 'Male', 'Female')),
  birthday DATE,
  weight DECIMAL(5,2),
  color TEXT,
  location TEXT DEFAULT 'Thailand',
  
  -- Registration
  registration_number TEXT UNIQUE,
  
  -- Media
  image_url TEXT,
  
  -- Relationships (Self-referencing for pedigree)
  mother_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  father_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  
  -- Owner
  owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Additional Info
  medical_history TEXT,
  notes TEXT,
  description TEXT,
  
  -- Sales
  price DECIMAL(10,2) DEFAULT 0,
  for_sale BOOLEAN DEFAULT false,
  available BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  
  -- Airtable Reference (for migration tracking)
  airtable_id TEXT UNIQUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX idx_pets_breed ON pets(breed);
CREATE INDEX idx_pets_name ON pets(name);
CREATE INDEX idx_pets_registration_number ON pets(registration_number);
CREATE INDEX idx_pets_mother_id ON pets(mother_id);
CREATE INDEX idx_pets_father_id ON pets(father_id);
CREATE INDEX idx_pets_owner_id ON pets(owner_id);
CREATE INDEX idx_pets_for_sale ON pets(for_sale) WHERE for_sale = true;
CREATE INDEX idx_pets_airtable_id ON pets(airtable_id);

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pets_updated_at
    BEFORE UPDATE ON pets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Anyone can view pets
CREATE POLICY "Pets are viewable by everyone"
ON pets FOR SELECT
USING (true);

-- Authenticated users can insert pets
CREATE POLICY "Authenticated users can insert pets"
ON pets FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users can update their own pets
CREATE POLICY "Users can update their own pets"
ON pets FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Admins can update any pet
CREATE POLICY "Admins can update any pet"
ON pets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Users can delete their own pets
CREATE POLICY "Users can delete their own pets"
ON pets FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Admins can delete any pet
CREATE POLICY "Admins can delete any pet"
ON pets FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 6. Create view for pedigree with parent names
CREATE OR REPLACE VIEW pets_with_parents AS
SELECT 
  p.*,
  m.name as mother_name,
  m.registration_number as mother_reg_num,
  f.name as father_name,
  f.registration_number as father_reg_num
FROM pets p
LEFT JOIN pets m ON p.mother_id = m.id
LEFT JOIN pets f ON p.father_id = f.id;

-- 7. Function to generate registration number
CREATE OR REPLACE FUNCTION generate_registration_number(
  p_mother_name TEXT,
  p_father_name TEXT,
  p_mother_id UUID,
  p_father_id UUID
)
RETURNS TEXT AS $$
DECLARE
  mother_abbr TEXT;
  father_abbr TEXT;
  generation INT;
  next_num INT;
  reg_num TEXT;
BEGIN
  -- Get abbreviations
  mother_abbr := COALESCE(UPPER(SUBSTRING(p_mother_name, 1, 2)), 'UN');
  father_abbr := COALESCE(UPPER(SUBSTRING(p_father_name, 1, 2)), 'UN');
  
  -- Calculate generation
  WITH RECURSIVE parent_gen AS (
    -- Base case: pets with no parents have generation 0
    SELECT id, 0 as gen
    FROM pets
    WHERE mother_id IS NULL AND father_id IS NULL
    
    UNION ALL
    
    -- Recursive case: generation = max(parent generations) + 1
    SELECT p.id, pg.gen + 1
    FROM pets p
    JOIN parent_gen pg ON (p.mother_id = pg.id OR p.father_id = pg.id)
  )
  SELECT COALESCE(MAX(gen), 0) + 1 INTO generation
  FROM parent_gen
  WHERE id IN (p_mother_id, p_father_id);
  
  -- Get next number
  SELECT COALESCE(MAX(
    REGEXP_REPLACE(
      SUBSTRING(registration_number FROM '-(\d{3})$'),
      '[^0-9]', '', 'g'
    )::INT
  ), 0) + 1 INTO next_num
  FROM pets
  WHERE registration_number LIKE mother_abbr || '-' || father_abbr || '-G' || generation || '-%';
  
  -- Format registration number
  reg_num := mother_abbr || '-' || father_abbr || '-G' || generation || '-' || LPAD(next_num::TEXT, 3, '0');
  
  RETURN reg_num;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Petdegree Schema Created Successfully!';
  RAISE NOTICE 'Tables: pets';
  RAISE NOTICE 'Views: pets_with_parents';
  RAISE NOTICE 'Functions: generate_registration_number()';
  RAISE NOTICE 'RLS: Enabled with policies';
END $$;
