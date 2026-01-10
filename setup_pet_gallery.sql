-- Create table for Pet Gallery
CREATE TABLE IF NOT EXISTS pet_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pet_photos ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public photos are viewable by everyone" ON pet_photos
    FOR SELECT USING (true);

-- Insert policy (Check if user owns the pet)
CREATE POLICY "Owners can add photos" ON pet_photos
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT owner_id FROM pets WHERE id = pet_id)
    );

-- Delete policy (Check if user owns the pet)
CREATE POLICY "Owners can delete photos" ON pet_photos
    FOR DELETE USING (
        auth.uid() IN (SELECT owner_id FROM pets WHERE id = pet_id)
    );
