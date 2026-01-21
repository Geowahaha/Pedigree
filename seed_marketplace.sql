-- Seed Marketplace Data (20 Items)
-- Execute this in Supabase SQL Editor

INSERT INTO marketplace_listings (title, description, price, currency, category, condition, images, location, status, seller_id)
VALUES
-- PET FOOD
('Royal Canin Golden Retriever Adult', 'Specific formula for Golden Retrievers over 15 months old. Supports healthy skin and coat.', 2450, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1585499193151-0f515432ed1c?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Hill''s Science Diet Adult Large Breed', 'High quality protein for lean muscles. Natural sources of glucosamine & chondroitin.', 2100, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1589924691195-41432c84c161?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Taste of the Wild High Prairie', 'Grain-free recipe with roasted bison and venison. Excellent for dogs with grain sensitivities.', 2800, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1623366302587-b38b1ddaefd9?q=80&w=800&auto=format&fit=crop'], 'Chiang Mai', 'active', auth.uid()),
('Orijen Original Dog Food', 'Biologically appropriate dog food. Fresh free-run chicken and turkey.', 3200, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1608408891486-f5c833c9bf13?q=80&w=800&auto=format&fit=crop'], 'Phuket', 'active', auth.uid()),
('Purina Pro Plan Performance', 'High protein formula for active dogs. Optimizes oxygen metabolism.', 1850, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1548802673-380ab8ebc03e?q=80&w=800&auto=format&fit=crop'], 'Nonthaburi', 'active', auth.uid()),

-- TOYS
('Kong Classic Dog Toy - Large', 'The gold standard of dog toys. Perfect for stuffing with treats.', 450, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Chuckit! Ultra Ball - Medium (2 Pack)', 'High bounce, buoyant, and durable. Perfect for fetch.', 390, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1535930749574-1399327ce78f?q=80&w=800&auto=format&fit=crop'], 'Pattaya', 'active', auth.uid()),
('Nina Ottosson Dog Brick Puzzle', 'Intermediate level puzzle toy. Keeps your dog entertained and mentally stimulated.', 890, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1518914781460-a3daa4c06f9c?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Outward Hound Hide-A-Squirrel', 'Plush puzzle toy. Great for dogs who love to dig and hunt.', 650, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1615266895738-11f1371cd7e5?q=80&w=800&auto=format&fit=crop'], 'Chiang Mai', 'active', auth.uid()),
('Nylabone Dura Chew Power Chew', 'Long lasting chew toy for powerful chewers. Chicken flavor.', 320, 'THB', 'hobbies', 'new', ARRAY['https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),

-- ACCESSORIES
('Ruffwear Front Range Dog Harness', 'Everyday harness that is easy to put on and comfortable for dogs to wear.', 1650, 'THB', 'apparel', 'new', ARRAY['https://images.unsplash.com/photo-1558235208-9df5977ba36e?q=80&w=800&auto=format&fit=crop'], 'Phuket', 'active', auth.uid()),
('Flexi New Classic Retractable Leash', 'Freedom for your dog, control for you. 5 meter cord.', 550, 'THB', 'apparel', 'new', ARRAY['https://images.unsplash.com/photo-1601758177266-bc599de87707?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Kurgo Loft Dog Jacket', 'Reversible, water-resistant dog coat. Keeps your pup warm without overheating.', 950, 'THB', 'apparel', 'new', ARRAY['https://images.unsplash.com/photo-1579213838058-c27e94f971c2?q=80&w=800&auto=format&fit=crop'], 'Chiang Rai', 'active', auth.uid()),
('Sleepypod Clickit Sport Safety Harness', 'Crash-tested dog safety harness for car travel.', 3200, 'THB', 'vehicle', 'new', ARRAY['https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Furminator Undercoat Deshedding Tool', 'Reduces loose hair from shedding up to 90%.', 1100, 'THB', 'pet_supplies', 'new', ARRAY['https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop'], 'Pattaya', 'active', auth.uid()),

-- TECH / GADGETS
('Fi Smart Dog Collar Series 3', 'GPS tracking and activity monitoring. Long battery life.', 5500, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1576201836106-db1758fd1c97?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Furbo 360° Dog Camera', 'Rotating 360° view, treat tossing, and barking alerts.', 6900, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1582234032488-294b62db441f?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Whistle Go Explore Health & Location Tracker', 'Monitor your pet''s health and location in real-time.', 4200, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1575424909138-7074f3f3de3a?q=80&w=800&auto=format&fit=crop'], 'Chiang Mai', 'active', auth.uid()),
('PetSafe Smart Feed Automatic Feeder', 'Smartphone controlled feeding. Schedule meals from anywhere.', 3500, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid()),
('Litter-Robot 4', 'Self-cleaning litter box. Never scoop again.', 25000, 'THB', 'electronics', 'new', ARRAY['https://images.unsplash.com/photo-1513245543132-31f507417b26?q=80&w=800&auto=format&fit=crop'], 'Bangkok', 'active', auth.uid());
