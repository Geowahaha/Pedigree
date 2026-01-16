// Pet and Product data for Petdegree

export interface Pet {
  id: string;
  name: string;
  breed: string;
  type: 'dog' | 'cat' | 'horse';
  birthDate?: string;
  age?: string | number; // Added for Airtable
  gender: 'male' | 'female';
  image: string;
  image_url?: string; // Sync with Supabase
  color?: string;
  weight?: number; // Added for Airtable
  registrationNumber?: string;
  healthCertified?: boolean;
  location: string;
  owner?: string;
  available?: boolean; // Added for Airtable
  for_sale?: boolean; // Added for Supabase
  price?: number; // Added for Airtable
  description?: string; // Added for Airtable
  verified?: boolean; // Added for Airtable
  parentIds?: {
    sire?: string;
    dam?: string;
    sireStatus?: 'pending' | 'verified' | 'rejected';
    damStatus?: 'pending' | 'verified' | 'rejected';
  };
  isOwnerVerified?: boolean;
  medicalHistory?: string; // Added for Airtable
  airtableId?: string; // Added for Airtable sync
  owner_id?: string; // Added for Supabase/Chat features
  ownership_status?: 'verified' | 'waiting_owner' | 'pending_claim' | 'disputed';
  claimed_by?: string | null;
  claim_date?: string | null;
  verification_evidence?: Record<string, unknown> | null;
  boosted_until?: string | null; // VIP Promotion
  created_at?: string; // Sorting
  mother_id?: string | null;
  father_id?: string | null;
  // Media & External Card Support
  media_type?: 'image' | 'video';
  video_url?: string;
  source?: 'internal' | 'instagram' | 'pinterest' | 'youtube';
  external_link?: string;
  is_sponsored?: boolean;
  likes?: number;
}

export interface Product {
  id: string;
  name: string;
  category: 'food' | 'toys' | 'accessories';
  petType: 'dog' | 'cat' | 'horse' | 'all';
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  seller: string;
  verified: boolean;
  description: string;
  inStock: boolean;
}

export const pets: Pet[] = [
  {
    id: 'pet-001',
    name: 'Apollo',
    breed: 'Golden Retriever',
    type: 'dog',
    birthDate: '2023-03-15',
    gender: 'male',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275829522_4145f3ee.jpg',
    color: 'Golden',
    registrationNumber: 'GR-2023-0451',
    healthCertified: true,
    location: 'San Francisco, CA',
    owner: 'Sarah Mitchell',
    owner_id: '123e4567-e89b-12d3-a456-426614174000',
    parentIds: { sire: 'pet-011', dam: 'pet-004' } // Duke (male Golden) and Bella (female Golden)
  },
  {
    id: 'pet-002',
    name: 'Luna',
    breed: 'Golden Retriever',
    type: 'dog',
    birthDate: '2022-08-20',
    gender: 'female',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275837106_9784cc0a.png',
    color: 'Cream',
    registrationNumber: 'GR-2022-0892',
    healthCertified: true,
    location: 'Los Angeles, CA',
    owner: 'James Chen',
    parentIds: { sire: 'pet-001' }
  },
  {
    id: 'pet-003',
    name: 'Max',
    breed: 'Labrador Retriever',
    type: 'dog',
    birthDate: '2024-01-10',
    gender: 'male',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275832949_890ffc47.jpg',
    color: 'Yellow',
    registrationNumber: 'LR-2024-0123',
    healthCertified: true,
    location: 'Seattle, WA',
    owner: 'Emily Rodriguez',
    parentIds: { dam: 'pet-002' }
  },
  {
    id: 'pet-004',
    name: 'Bella',
    breed: 'Golden Retriever',
    type: 'dog',
    birthDate: '2021-05-22',
    gender: 'female',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275840037_4b7d75fd.png',
    color: 'Golden',
    registrationNumber: 'GR-2021-0567',
    healthCertified: true,
    location: 'Portland, OR',
    owner: 'Michael Thompson'
  },
  {
    id: 'pet-005',
    name: 'Whiskers',
    breed: 'Persian',
    type: 'cat',
    birthDate: '2022-11-08',
    gender: 'male',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275859561_c08c1e97.jpg',
    color: 'White',
    registrationNumber: 'PS-2022-0234',
    healthCertified: true,
    location: 'New York, NY',
    owner: 'Amanda Lee'
  },
  {
    id: 'pet-006',
    name: 'Mochi',
    breed: 'Siamese',
    type: 'cat',
    birthDate: '2023-06-30',
    gender: 'female',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275857063_c4f8371f.jpg',
    color: 'Seal Point',
    registrationNumber: 'SM-2023-0789',
    healthCertified: true,
    location: 'Austin, TX',
    owner: 'David Kim'
  },
  {
    id: 'pet-007',
    name: 'Shadow',
    breed: 'Maine Coon',
    type: 'cat',
    birthDate: '2021-09-14',
    gender: 'male',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275864004_309aa703.png',
    color: 'Brown Tabby',
    registrationNumber: 'MC-2021-0456',
    healthCertified: true,
    location: 'Denver, CO',
    owner: 'Jessica Brown'
  },
  {
    id: 'pet-008',
    name: 'Cleo',
    breed: 'British Shorthair',
    type: 'cat',
    birthDate: '2024-02-28',
    gender: 'female',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275860059_85189bf4.jpg',
    color: 'Blue',
    registrationNumber: 'BS-2024-0091',
    healthCertified: true,
    location: 'Chicago, IL',
    owner: 'Robert Wilson',
    parentIds: { dam: 'pet-006' }
  },
  {
    id: 'pet-009',
    name: 'Thong Dee (ทองดี)',
    breed: 'Thai Ridgeback (หมาไทยหลังอาน)',
    type: 'dog',
    birthDate: '2023-01-15',
    gender: 'male',
    image: 'https://images.unsplash.com/photo-1596205809930-b593282b86ab?q=80&w=2070&auto=format&fit=crop', // Mock Thai Ridgeback lookalike
    color: 'Red (แดง)',
    registrationNumber: 'TR-2023-9988',
    healthCertified: true,
    location: 'Bangkok, Thailand',
    owner: 'Bunping Farm'
  },
  {
    id: 'pet-010',
    name: 'Sroy Petch (สร้อยเพชร)',
    breed: 'Thai Ridgeback (หมาไทยหลังอาน)',
    type: 'dog',
    birthDate: '2022-05-20',
    gender: 'female',
    image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop',
    color: 'Blue (สวาด)',
    registrationNumber: 'TR-2022-7766',
    healthCertified: true,
    location: 'Chiang Mai, Thailand',
    owner: 'Siam Heritage'
  },
  {
    id: 'pet-011',
    name: 'Duke',
    breed: 'Golden Retriever',
    type: 'dog',
    birthDate: '2020-03-10',
    gender: 'male',
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275829522_4145f3ee.jpg',
    color: 'Golden',
    registrationNumber: 'GR-2020-0234',
    healthCertified: true,
    location: 'Portland, OR',
    owner: 'Michael Thompson'
  }
];

export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Organic Grain-Free Dog Food',
    category: 'food',
    petType: 'dog',
    price: 54.99,
    originalPrice: 64.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275884127_8bb93035.jpg',
    rating: 4.8,
    reviews: 234,
    seller: 'NaturePaws Co.',
    verified: true,
    description: 'Premium organic dog food with real chicken and vegetables',
    inStock: true
  },
  {
    id: 'prod-002',
    name: 'Premium Salmon Dog Food',
    category: 'food',
    petType: 'dog',
    price: 49.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275883638_32475142.jpg',
    rating: 4.6,
    reviews: 189,
    seller: 'PetNutrition Plus',
    verified: true,
    description: 'Wild-caught salmon recipe for healthy coat and skin',
    inStock: true
  },
  {
    id: 'prod-003',
    name: 'Puppy Growth Formula',
    category: 'food',
    petType: 'dog',
    price: 42.99,
    originalPrice: 52.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275886116_cfbb4ba2.png',
    rating: 4.9,
    reviews: 312,
    seller: 'NaturePaws Co.',
    verified: true,
    description: 'Specially formulated for growing puppies',
    inStock: true
  },
  {
    id: 'prod-004',
    name: 'Senior Dog Wellness Food',
    category: 'food',
    petType: 'dog',
    price: 58.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275888085_ad08d74e.jpg',
    rating: 4.7,
    reviews: 156,
    seller: 'Golden Years Pet',
    verified: true,
    description: 'Joint support formula for senior dogs',
    inStock: true
  },
  {
    id: 'prod-005',
    name: 'Natural Rope Tug Toy',
    category: 'toys',
    petType: 'dog',
    price: 18.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275902715_da6c0af9.jpg',
    rating: 4.5,
    reviews: 423,
    seller: 'EcoPlay Pets',
    verified: true,
    description: 'Durable natural cotton rope for interactive play',
    inStock: true
  },
  {
    id: 'prod-006',
    name: 'Interactive Puzzle Ball',
    category: 'toys',
    petType: 'all',
    price: 24.99,
    originalPrice: 29.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275906923_152bfce5.png',
    rating: 4.7,
    reviews: 287,
    seller: 'SmartPet Toys',
    verified: true,
    description: 'Mental stimulation puzzle toy for dogs and cats',
    inStock: true
  },
  {
    id: 'prod-007',
    name: 'Eco-Friendly Chew Toy',
    category: 'toys',
    petType: 'dog',
    price: 15.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275907424_b2ced4a2.png',
    rating: 4.4,
    reviews: 198,
    seller: 'EcoPlay Pets',
    verified: true,
    description: 'Sustainable bamboo and natural rubber chew toy',
    inStock: true
  },
  {
    id: 'prod-008',
    name: 'Plush Squeaky Toy Set',
    category: 'toys',
    petType: 'all',
    price: 22.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275905275_5f144036.jpg',
    rating: 4.6,
    reviews: 345,
    seller: 'Cuddle Companions',
    verified: true,
    description: 'Soft plush toys with squeakers for endless fun',
    inStock: true
  },
  {
    id: 'prod-009',
    name: 'Ceramic Zen Pet Bowl',
    category: 'accessories',
    petType: 'all',
    price: 34.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275924491_402ccc91.png',
    rating: 4.9,
    reviews: 567,
    seller: 'Zen Pet Living',
    verified: true,
    description: 'Handcrafted ceramic bowl with minimalist design',
    inStock: true
  },
  {
    id: 'prod-010',
    name: 'Premium Leather Collar',
    category: 'accessories',
    petType: 'dog',
    price: 45.99,
    originalPrice: 55.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275922117_cb60f3c7.jpg',
    rating: 4.8,
    reviews: 234,
    seller: 'Artisan Pet Goods',
    verified: true,
    description: 'Handmade genuine leather collar with brass hardware',
    inStock: true
  },
  {
    id: 'prod-011',
    name: 'Bamboo Pet Bed Frame',
    category: 'accessories',
    petType: 'all',
    price: 89.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275930471_588dd04d.png',
    rating: 4.7,
    reviews: 123,
    seller: 'Zen Pet Living',
    verified: true,
    description: 'Sustainable bamboo bed frame with organic cotton cushion',
    inStock: true
  },
  {
    id: 'prod-012',
    name: 'Travel Water Bottle',
    category: 'accessories',
    petType: 'all',
    price: 19.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275927248_0e268ef5.png',
    rating: 4.5,
    reviews: 456,
    seller: 'Adventure Pets',
    verified: true,
    description: 'Portable water bottle with built-in bowl for on-the-go',
    inStock: true
  },
  {
    id: 'prod-013',
    name: 'Gourmet Cat Food - Tuna',
    category: 'food',
    petType: 'cat',
    price: 38.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275952465_42f2974e.jpg',
    rating: 4.8,
    reviews: 289,
    seller: 'Feline Feast',
    verified: true,
    description: 'Premium tuna recipe for discerning cats',
    inStock: true
  },
  {
    id: 'prod-014',
    name: 'Indoor Cat Formula',
    category: 'food',
    petType: 'cat',
    price: 35.99,
    originalPrice: 42.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275948412_cc53f143.jpg',
    rating: 4.6,
    reviews: 198,
    seller: 'NaturePaws Co.',
    verified: true,
    description: 'Specially formulated for indoor cats with hairball control',
    inStock: true
  },
  {
    id: 'prod-015',
    name: 'Kitten Starter Pack',
    category: 'food',
    petType: 'cat',
    price: 44.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275954354_c4fe10dc.png',
    rating: 4.9,
    reviews: 234,
    seller: 'Feline Feast',
    verified: true,
    description: 'Complete nutrition for growing kittens',
    inStock: true
  },
  {
    id: 'prod-016',
    name: 'Senior Cat Wellness',
    category: 'food',
    petType: 'cat',
    price: 41.99,
    image: 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275955669_8bb76cd0.png',
    rating: 4.7,
    reviews: 167,
    seller: 'Golden Years Pet',
    verified: true,
    description: 'Gentle formula for senior cats with kidney support',
    inStock: true
  }
];

export const breeds = {
  dog: [
    'Thai Ridgeback (หมาไทยหลังอาน)', // National Focus
    'Thai Bangkaew (บางแก้ว)',
    'Golden Retriever', 'Labrador Retriever', 'German Shepherd', 'French Bulldog', 'Poodle',
    'Beagle', 'Rottweiler', 'Siberian Husky', 'Pomeranian', 'Shih Tzu', 'Chihuahua', 'Pug',
    'Doberman Pinscher', 'Great Dane', 'Boxer', 'Corgi', 'Shiba Inu', 'Border Collie'
  ],
  cat: [
    'Siamese (วิเชียรมาศ)', // National Focus
    'Korat (โคราช)',
    'Khao Manee (ขาวมณี)',
    'Persian', 'Maine Coon', 'British Shorthair', 'Ragdoll', 'Bengal', 'Abyssinian',
    'Scottish Fold', 'Sphynx', 'Russian Blue', 'Exotic Shorthair', 'American Shorthair'
  ],
  horse: [
    'Arabian', 'Thoroughbred', 'Quarter Horse', 'Friesian', 'Appaloosa', 'Mustang',
    'Andalusian', 'Morgan', 'Warmblood', 'Shetland Pony'
  ]
};

export const locations = [
  'Chicago, IL',
  'Miami, FL',
  'Boston, MA',
  'Dallas, TX'
];

export const calculateMatchProbability = (pet1: Pet, pet2: Pet): number => {
  let score = 0;

  // 1. Basic Species Check (Must match)
  if (pet1.type !== pet2.type) return 0;

  // 2. Gender Check (Opposite creates high match for breeding)
  if (pet1.gender !== pet2.gender) score += 30;

  // 3. Breed Match (Same breed is usually desired)
  if (pet1.breed === pet2.breed) score += 40;

  // 4. Age Check ( Breeding age typically 1-8 years)
  const age1 = new Date().getFullYear() - new Date(pet1.birthDate).getFullYear();
  const age2 = new Date().getFullYear() - new Date(pet2.birthDate).getFullYear();
  if (age1 >= 1 && age1 <= 8 && age2 >= 1 && age2 <= 8) score += 10;

  // 5. Relatives Check (Avoid inbreeding)
  // Simple check: if parents share an ID, score = 0 (or very low)
  if (pet1.parentIds && pet2.parentIds) {
    const p1Family = [pet1.parentIds.sire, pet1.parentIds.dam];
    const p2Family = [pet2.parentIds.sire, pet2.parentIds.dam];
    if (p1Family.some(id => id && p2Family.includes(id))) return 0; // Immediate sibling/half-sibling
  }

  // 6. Location (Bonus match)
  if (pet1.location === pet2.location) score += 10;

  // Cap at 100
  return Math.min(score, 100);
};
