-- Fix for column name 'birthday' (not birth_date)
DO $$
DECLARE
    sire_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    dam_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    match_id UUID := 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    owner_id UUID;
BEGIN
    -- Get an owner ID
    SELECT id INTO owner_id FROM auth.users LIMIT 1;

    -- 2. Insert/Update 'Boontum' (Sire)
    INSERT INTO pets (id, name, type, breed, gender, color, image_url, description, birthday, owner_id)
    VALUES (
        sire_id,
        'Boontum (บุญทุ่ม)',
        'dog',
        'Thai Ridgeback Dogs หมาไทยหลังอาน',
        'male',
        'Red',
        'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80',
        'Grand Champion Thai Ridgeback. Excellent temperament and structure.',
        '2022-01-01', -- Assuming birthday matches birth_date
        owner_id
    )
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name, 
      image_url = EXCLUDED.image_url,
      birthday = EXCLUDED.birthday;

    -- 3. Insert/Update 'Boonnum' (Dam)
    INSERT INTO pets (id, name, type, breed, gender, color, image_url, description, birthday, owner_id)
    VALUES (
        dam_id,
        'Boonnum (บุญนำ)',
        'dog',
        'Thai Ridgeback Dogs หมาไทยหลังอาน',
        'female',
        'Blue',
        'https://images.unsplash.com/photo-1583511655826-05700442b31b?auto=format&fit=crop&q=80',
        'Beautiful Blue Thai Ridgeback with perfect ridge.',
        '2022-06-15', -- Assuming birthday matches birth_date
        owner_id
    )
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name, 
      image_url = EXCLUDED.image_url,
      birthday = EXCLUDED.birthday;

    -- 4. Create Breeding Match Record
    INSERT INTO breeding_matches (id, sire_id, dam_id, match_date, due_date, status, description)
    VALUES (
        match_id,
        sire_id,
        dam_id,
        CURRENT_DATE, 
        CURRENT_DATE + 63, 
        'confirmed',
        'A highly anticipated litter from our top champions. Both parents have excellent health history.'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 5. Create 'breeding_reviews' table if not exists
    CREATE TABLE IF NOT EXISTS breeding_reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        match_id UUID REFERENCES breeding_matches(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL, 
        user_avatar TEXT,
        comment TEXT,
        image_url TEXT, 
        rating INTEGER DEFAULT 5,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 6. Insert Mock Reviews
    INSERT INTO breeding_reviews (match_id, user_name, comment, rating)
    VALUES 
        (match_id, 'Somsak K.', 'น่าตื่นเต้นจังเลย นี่คือรูปน้องหมาที่บ้านก็ลูกของคู่นี้มันยอดเยี่ยมมาก จิตประสาทดีมาก รู้ประสา', 5),
        (match_id, 'Jenny T.', 'ใครได้คู้นี้ไปไม่ผิดหวังแน่นอน Quality breeding match!', 5);

END $$;
