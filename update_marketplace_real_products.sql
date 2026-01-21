-- 1. Update Schema to support External Links
ALTER TABLE marketplace_listings 
ADD COLUMN IF NOT EXISTS external_link TEXT,
ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('shopee', 'lazada', 'amazon', 'other')),
ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE;

-- 2. Clear old sample data (optional, but good for clean slate if mostly junk)
-- DELETE FROM marketplace_listings WHERE seller_id = auth.uid(); -- Uncomment if you want to wipe personal listings

-- 3. Seed Real Products (Shopee/Lazada Thailand Links)
INSERT INTO marketplace_listings (title, description, price, currency, category, condition, images, location, status, seller_id, external_link, source, is_promoted)
VALUES
-- GPS TRACKERS (High Demand)
('Tractive GPS Dog 4 - Real-time Tracking & Health Monitoring', 'Unlimited range GPS tracking. Waterproof. Activity monitoring. Requires subscription.', 2500, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1601758174609-6a45c3608cc6?q=80&w=800&auto=format&fit=crop'], 'Official Store', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=tractive%20gps', 'shopee', true),
('Apple AirTag - 4 Pack', 'Keep track of your pets with the Find My network. Precision finding.', 3390, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1620600858739-1bc151a2d593?q=80&w=800&auto=format&fit=crop'], 'Official Store', 'active', auth.uid(), 'https://shopee.co.th/Apple-AirTag-4-Pack-i.263530182.8550750395', 'shopee', true),

-- PREMIUM FOOD
('Royal Canin Medium Puppy - 10kg', 'Growth support for medium breed puppies. Immune system support.', 2850, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1589924691195-41432c84c161?q=80&w=800&auto=format&fit=crop'], 'Official Store', 'active', auth.uid(), 'https://shopee.co.th/Royal-Canin-Medium-Puppy-Dog-Food-10kg-i.44760596.1764658392', 'shopee', true),
('Hill''s Science Diet Adult Small Paws', 'Tailored nutrition for small breed dogs. High quality protein.', 850, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1597843786271-105124152c97?q=80&w=800&auto=format&fit=crop'], 'Official Store', 'active', auth.uid(), 'https://shopee.co.th/Hills-Science-Diet-Adult-Small-Paws-1.5kg-i.130985222.2568600109', 'shopee', true),
('Orijen Six Fish Dog Food - 2kg', 'Biologically appropriate. Fresh pilchard, mackerel, hake, flounder, rockfish and sole.', 1950, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1608408843552-32b005fe430a?q=80&w=800&auto=format&fit=crop'], 'Official Store', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=orijen%20dog%20food', 'shopee', true),

-- TOYS & ACCESSORIES (Shopee Best Sellers)
('Smart Interactive Ball for Dogs & Cats', 'Automatic rolling ball. RGB LED lights. Type-C charging.', 259, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?q=80&w=800&auto=format&fit=crop'], 'China Import', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=smart%20dog%20ball', 'shopee', false),
('KONG Classic - Durable Rubber Toy', 'The gold standard of dog toys. Mentally stimulating.', 490, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=800&auto=format&fit=crop'], 'Official Store', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=kong%20dog%20toy', 'shopee', true),
('Calming Donut Dog Bed - Large', 'Anxiety relief. Soft and fluffy faux fur.', 590, 'THB', 'home', 'new', ARRAY['https://images.unsplash.com/photo-1591946614720-90a587da4a36?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=donut%20dog%20bed', 'shopee', false),
('Tactical Dog Harness K9', 'Military grade durability. Molle system. Handle for control.', 450, 'THB', 'apparel', 'new', ARRAY['https://images.unsplash.com/photo-1558235208-9df5977ba36e?q=80&w=800&auto=format&fit=crop'], 'Overseas', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=tactical%20dog%20harness', 'shopee', false),

-- GADGETS
('Xiaomi Smart Pet Feeder', 'Remote control via Mi Home app. Scheduled feeding.', 2390, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=800&auto=format&fit=crop'], 'XiaoMi Official', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=xiaomi%20pet%20feeder', 'shopee', true),
('Petkit Eversweet Solo 2 Water Fountain', 'Wireless pump. Ultra quiet. Filtered water.', 1290, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1582234032488-294b62db441f?q=80&w=800&auto=format&fit=crop'], 'PetKit Official', 'active', auth.uid(), 'https://shopee.co.th/search?keyword=petkit%20water%20fountain', 'shopee', true);
