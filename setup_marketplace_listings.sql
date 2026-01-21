-- Marketplace Listings: For general products/items (Facebook Marketplace style)
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'THB',
    category TEXT CHECK (category IN ('vehicles', 'property', 'apparel', 'electronics', 'entertainment', 'family', 'free', 'gardening', 'hobbies', 'home', 'pet_supplies')),
    condition TEXT CHECK (condition IN ('new', 'used_like_new', 'used_good', 'used_fair')),
    images TEXT[] DEFAULT '{}', -- Array of image URLs
    location TEXT,
    seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('active', 'sold', 'pending', 'archived')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Public Read
CREATE POLICY "Public Read Listings" ON marketplace_listings FOR SELECT
USING (status = 'active');

-- Seller Manage (Insert, Update, Delete)
CREATE POLICY "Sellers insert own listings" ON marketplace_listings FOR INSERT
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers update own listings" ON marketplace_listings FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Sellers delete own listings" ON marketplace_listings FOR DELETE
USING (seller_id = auth.uid());

-- Admin Manage
CREATE POLICY "Admins manage all listings" ON marketplace_listings FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
