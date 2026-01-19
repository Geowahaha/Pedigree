import { supabase } from './supabase';

// Types
export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  gender: 'male' | 'female';
  birth_date: string;
  color: string | null;
  registration_number: string | null;
  health_certified: boolean;
  location: string | null;
  image_url: string | null;
  owner_name?: string | null; // Added for legacy Airtable sync
  description: string | null;
  is_public: boolean;
  for_sale?: boolean;
  price?: number;
  ownership_status?: 'verified' | 'waiting_owner' | 'pending_claim' | 'disputed';
  claimed_by?: string | null;
  claim_date?: string | null;
  verification_evidence?: any;
  created_at: string;
  updated_at: string;
  mother_id: string | null;
  father_id: string | null;
  owner?: {
    full_name: string;
    email: string;
    verified_breeder: boolean;
  };
  // Deprecated support for UI compat
  pedigree?: {
    sire_id: string | null;
    dam_id: string | null;
  };
  father_verified_status?: 'pending' | 'verified' | 'rejected';
  mother_verified_status?: 'pending' | 'verified' | 'rejected';
  boosted_until?: string | null; // VIP Promotion
  // Media & External Card Support
  media_type?: 'image' | 'video';
  video_url?: string;
  source?: 'internal' | 'instagram' | 'pinterest' | 'youtube';
  external_link?: string;
  is_sponsored?: boolean;
}

export interface RelatedBreeder {
  id: string; // owner_id
  name: string;
  relation: 'Connected Bloodline' | 'Recommended House';
  avatar_url?: string;
}

export interface PetPhoto {
  id: string;
  pet_id: string;
  image_url: string;
  caption: string | null;
  order_index: number;
  created_at: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  shipping_address: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  } | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface AdminNotification {
  id: string;
  type: 'new_pet' | 'verification_request' | 'breeding_report' | 'new_user';
  title: string;
  message: string | null;
  reference_id: string | null;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

// Generate registration number on client side
function generateRegistrationNumber(breed: string): string {
  const prefix = breed.substring(0, 2).toUpperCase();
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${year}-${random}`;
}

const MIN_PARENT_AGE_YEARS = 1;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const normalizeText = (value?: string | null) => (value || '').trim().replace(/\s+/g, ' ');
const hasValue = (value?: string | null) => normalizeText(value).length > 0;

const parseDateValue = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

async function checkPetDuplicates(params: {
  registrationNumber?: string | null;
  name?: string | null;
  ownerId?: string | null;
  excludeId?: string | null;
}) {
  const registrationNumber = normalizeText(params.registrationNumber);
  const name = normalizeText(params.name);
  const duplicates = { registration: [] as any[], name: [] as any[] };

  if (hasValue(registrationNumber)) {
    let query = supabase
      .from('pets')
      .select('id, name, registration_number, owner_id')
      .ilike('registration_number', registrationNumber);
    if (params.excludeId) query = query.neq('id', params.excludeId);
    const { data } = await query.limit(5);
    if (data && data.length) duplicates.registration = data;
  }

  if (hasValue(name) && params.ownerId) {
    let query = supabase
      .from('pets')
      .select('id, name, owner_id')
      .eq('owner_id', params.ownerId)
      .ilike('name', name);
    if (params.excludeId) query = query.neq('id', params.excludeId);
    const { data } = await query.limit(5);
    if (data && data.length) duplicates.name = data;
  }

  return duplicates;
}

async function notifyDuplicate(params: {
  ownerId?: string | null;
  title: string;
  message: string;
  referenceId?: string;
  userMessage?: string;
}) {
  await createNotification({
    type: 'verification_request',
    title: params.title,
    message: params.message,
    reference_id: params.referenceId
  });

  if (params.ownerId && params.userMessage) {
    await createUserNotification({
      user_id: params.ownerId,
      type: 'verification',
      title: params.title,
      message: params.userMessage,
      payload: { reference_id: params.referenceId }
    });
  }
}

async function validateParentAges(params: {
  childBirthDate?: string | null;
  fatherId?: string | null;
  motherId?: string | null;
}) {
  const childDate = parseDateValue(params.childBirthDate);
  if (!childDate) return;

  const parentIds = [params.fatherId, params.motherId].filter(Boolean) as string[];
  if (parentIds.length === 0) return;

  const { data, error } = await supabase
    .from('pets')
    .select('id, name, birthday')
    .in('id', parentIds);

  if (error) throw error;
  if (!data) return;

  for (const parent of data) {
    const parentDate = parseDateValue(parent.birthday || parent.birth_date);
    if (!parentDate) continue;

    const diffDays = (childDate.getTime() - parentDate.getTime()) / MS_PER_DAY;
    const label = parent.id === params.fatherId ? 'Sire' : 'Dam';
    const parentName = parent.name ? ` (${parent.name})` : '';

    if (diffDays < 0) {
      throw new Error(`${label}${parentName} birth date cannot be after the child birth date.`);
    }
    if (diffDays < MIN_PARENT_AGE_YEARS * 365) {
      throw new Error(`${label}${parentName} must be at least ${MIN_PARENT_AGE_YEARS} year older than the child.`);
    }
  }
}

// Helper to map DB pet to Interface (keeping backward compat)
// Helper to map DB pet to Interface (keeping backward compat)
export function mapPet(pet: any): Pet {
  // Sanitize type based on breed (Consistency with petsService)
  const breedLower = (pet.breed || '').toLowerCase();
  let finalType: 'dog' | 'cat' = pet.type;

  if (breedLower.includes('dog') || breedLower.includes('hura') || breedLower.includes('หมา') || breedLower.includes('สุนัข') || breedLower.includes('retriever') || breedLower.includes('shepherd') || breedLower.includes('terrier')) {
    finalType = 'dog';
  } else if (breedLower.includes('cat') || breedLower.includes('แมว') || breedLower.includes('persian') || breedLower.includes('shorthair') || breedLower.includes('maine coon')) {
    finalType = 'cat';
  }

  // Helper to safely get owner name
  const ownerName = pet.owner?.full_name || pet.owner_name || (pet.owner_id ? 'Unknown Owner' : null);

  // Handle expired Airtable URLs (410 Gone)
  let finalImageUrl = pet.image_url || '';
  if (finalImageUrl.includes('airtableusercontent.com')) {
    finalImageUrl = ''; // Falls back to placeholder
  }

  // Extract Metadata from Description (Hack for missing columns)
  // SECURITY FIX: Never expose raw JSON metadata to UI
  const desc = pet.description || '';
  let meta: any = {};
  let descriptionText: string | null = null; // Start null, only set if human-readable text exists

  // Try JSON first (New format)
  if (desc.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(desc);
      meta = parsed;
      // Only use human-readable description text, never raw JSON
      if (typeof parsed.description === 'string' && parsed.description.trim()) {
        descriptionText = parsed.description.trim();
      }
      // descriptionText stays null if no readable text - this is intentional
    } catch (e) {
      // JSON parse failed - check if it looks like internal metadata and sanitize
      if (desc.includes('"media_type"') || desc.includes('"external_link"') || desc.includes('"source"')) {
        descriptionText = null; // Clear leaked metadata
      } else {
        descriptionText = desc; // Keep as-is if not metadata JSON
      }
    }
  } else {
    // Not JSON - use as plain text description
    descriptionText = desc.trim() || null;
  }

  // Fallback to Regex (Old format)
  if (!meta.video_url) {
    const videoUrlMatch = desc.match(/Video URL: (.*)/);
    if (videoUrlMatch) meta.video_url = videoUrlMatch[1].trim();
  }
  if (!meta.media_type) {
    const mediaTypeMatch = desc.match(/Media Type: (.*)/);
    if (mediaTypeMatch) meta.media_type = mediaTypeMatch[1].trim();
  }
  if (!meta.source) {
    const sourceMatch = desc.match(/Source: (.*)/);
    if (sourceMatch) meta.source = sourceMatch[1].trim();
  }
  if (!meta.external_link) {
    const externalLinkMatch = desc.match(/External Link: (.*)/) || desc.match(/External Source: (.*)/);
    if (externalLinkMatch) meta.external_link = externalLinkMatch[1].trim();
  }

  // Map deserialized metadata from description - handle empty strings
  const finalVideoUrl = (pet.video_url && pet.video_url.trim()) || meta.video_url || '';
  const finalMediaType = (pet.media_type && pet.media_type.trim()) || meta.media_type || (finalVideoUrl ? 'video' : 'image');

  return {
    ...pet,
    type: finalType,
    birth_date: pet.birthday, // Map DB 'birthday' to Interface 'birth_date'
    health_certified: pet.verified, // Map DB 'verified' to Interface 'health_certified'
    image_url: finalImageUrl,
    image: finalImageUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=500&h=500&fit=crop',
    price: pet.price,
    for_sale: pet.for_sale,
    description: descriptionText,
    age: pet.birthday ? (new Date().getFullYear() - new Date(pet.birthday).getFullYear()) : undefined,
    owner: ownerName || undefined,
    owner_name: ownerName,
    pedigree: {
      sire_id: pet.father_id,
      dam_id: pet.mother_id
    },
    ownership_status: pet.ownership_status || (pet.owner_id ? 'verified' : 'waiting_owner'),
    claimed_by: pet.claimed_by || null,
    claim_date: pet.claim_date || null,
    verification_evidence: pet.verification_evidence || null,
    father_verified_status: pet.father_verified_status || (pet.father_id ? 'pending' : 'verified'),
    mother_verified_status: pet.mother_verified_status || (pet.mother_id ? 'pending' : 'verified'),
    boosted_until: pet.boosted_until,
    media_type: finalMediaType,
    video_url: finalVideoUrl,
    source: (pet.source && pet.source.trim()) || meta.source || 'internal',
    external_link: (pet.external_link && pet.external_link.trim()) || meta.external_link || '',
    is_sponsored: pet.is_sponsored || false
  };
}

// ============ PETS ============

// Create a new pet
export async function createPet(petData: {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  gender: 'male' | 'female';
  birth_date?: string | null;
  color?: string;
  registration_number?: string; // Allow custom Reg No
  health_certified?: boolean;
  location?: string;
  image_url?: string;
  description?: string;
  mother_id?: string;
  father_id?: string;
  owner_id?: string;
  media_type?: 'image' | 'video';
  video_url?: string;
  source?: 'internal' | 'instagram' | 'pinterest' | 'youtube';
  external_link?: string;
  is_sponsored?: boolean;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const ownerId = petData.owner_id || user.id;
  const regProvided = hasValue(petData.registration_number);
  let registration_number = regProvided
    ? normalizeText(petData.registration_number)
    : generateRegistrationNumber(petData.breed);

  if (!regProvided) {
    let attempts = 0;
    while (attempts < 3) {
      const regDupes = await checkPetDuplicates({
        registrationNumber: registration_number
      });
      if (regDupes.registration.length === 0) break;
      registration_number = generateRegistrationNumber(petData.breed);
      attempts += 1;
    }
  }

  const duplicates = await checkPetDuplicates({
    registrationNumber: registration_number,
    name: petData.name,
    ownerId,
  });

  if (duplicates.registration.length > 0) {
    await notifyDuplicate({
      ownerId,
      title: 'Duplicate registration detected',
      message: `Registration number already exists: ${registration_number}`,
      referenceId: duplicates.registration[0].id,
      userMessage: `Registration number ${registration_number} is already in use. Please verify or use a different number.`
    });
    throw new Error(`Registration number already exists: ${registration_number}`);
  }

  if (duplicates.name.length > 0) {
    await notifyDuplicate({
      ownerId,
      title: 'Duplicate pet name detected',
      message: `Owner already has a pet named "${petData.name}".`,
      referenceId: duplicates.name[0].id,
      userMessage: `You already have a pet named "${petData.name}". Please use a unique name.`
    });
    throw new Error(`Duplicate pet name. Please use a unique name for your pets.`);
  }

  const normalizedBirthDate = hasValue(petData.birth_date) ? petData.birth_date : null;

  if (normalizedBirthDate) {
    const childDate = parseDateValue(normalizedBirthDate);
    if (childDate && childDate.getTime() > Date.now()) {
      throw new Error('Birth date cannot be in the future.');
    }
  }

  await validateParentAges({
    childBirthDate: normalizedBirthDate,
    fatherId: petData.father_id,
    motherId: petData.mother_id
  });

  // APPEND External Link to Description since column does not exist
  // APPEND Metadata to Description since columns do not exist
  // Save Metadata as JSON in Description if Magic Card
  let finalDescription = petData.description || '';
  if (petData.media_type || petData.video_url || petData.source || petData.external_link) {
    const metaPayload = {
      description: petData.description,
      media_type: petData.media_type,
      video_url: petData.video_url,
      source: petData.source,
      external_link: petData.external_link
    };
    finalDescription = JSON.stringify(metaPayload);
  } else {
    // Legacy append for non-JSON cases (optional, but JSON is safer if we stick to one)
    // Actually, let's just stick to JSON for new Magic items. 
    // Regular pets might just have plain text description.
  }

  const { data: pet, error } = await supabase
    .from('pets')
    .insert({
      owner_id: ownerId,
      name: normalizeText(petData.name),
      type: petData.type,
      breed: petData.breed,
      gender: petData.gender,
      birthday: normalizedBirthDate,
      color: petData.color || null,
      registration_number,
      location: petData.location || null,
      image_url: petData.image_url || null,
      description: finalDescription || null, // Updated description
      mother_id: petData.mother_id || null,
      father_id: petData.father_id || null,
      father_verified_status: petData.father_id ? 'pending' : null,
      mother_verified_status: petData.mother_id ? 'pending' : null,
      is_public: true,
      verified: petData.health_certified,
      // Now that columns exist, save them directly
      media_type: petData.media_type || 'image',
      video_url: petData.video_url || null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapPet(pet);
}



// Get all public pets
export async function getPublicPets(filters?: {
  type?: 'dog' | 'cat';
  breed?: string;
  location?: string;
  health_certified?: boolean;
}) {
  let query = supabase
    .from('pets')
    .select(`
      *,
      owner_id,
      owner:profiles!owner_id(full_name, email, verified_breeder)
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }
  if (filters?.breed) {
    query = query.eq('breed', filters.breed);
  }
  if (filters?.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }
  if (filters?.health_certified) {
    query = query.eq('health_certified', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data.map(mapPet);
}

// Get user's own pets
export async function getUserPets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('pets')
    .select(`*`)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPet);
}

// Get single pet by ID
export async function getPetById(petId: string) {
  const { data, error } = await supabase
    .from('pets')
    .select(`
      *,
      owner:profiles!owner_id(full_name, email, verified_breeder, location)
    `)
    .eq('id', petId)
    .single();

  if (error) throw error;
  return mapPet(data);
}

// Get pet by registration number
export async function getPetByRegistration(registrationNumber: string) {
  const { data, error } = await supabase
    .from('pets')
    .select(`
      *,
      owner:profiles!owner_id(full_name, email, verified_breeder)
    `)
    .eq('registration_number', registrationNumber)
    .single();

  if (error) return null;
  return mapPet(data);
}

// Update pet
export async function updatePet(petId: string, updates: Partial<Pet>) {
  const payload: any = { ...updates };
  const metaUpdateProvided = ['media_type', 'video_url', 'source', 'external_link'].some(
    (key) => updates[key as keyof Pet] !== undefined
  );
  const duplicateCheckNeeded = updates.registration_number !== undefined || updates.name !== undefined || updates.owner_id !== undefined;
  const parentCheckNeeded = updates.birth_date !== undefined || updates.mother_id !== undefined || updates.father_id !== undefined;
  const needsExisting = metaUpdateProvided || duplicateCheckNeeded || parentCheckNeeded;
  let existingRecord: any = null;

  if (needsExisting) {
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, registration_number, owner_id, birthday, mother_id, father_id, description')
      .eq('id', petId)
      .single();
    if (error) throw error;
    existingRecord = data;
  }

  if (updates.name !== undefined) {
    payload.name = normalizeText(updates.name);
  }
  if (updates.registration_number !== undefined) {
    const normalizedReg = normalizeText(updates.registration_number);
    payload.registration_number = normalizedReg || null;
  }

  if (updates.birth_date !== undefined) {
    const normalizedBirthDate = hasValue(updates.birth_date) ? updates.birth_date : null;
    if (normalizedBirthDate) {
      const childDate = parseDateValue(normalizedBirthDate);
      if (childDate && childDate.getTime() > Date.now()) {
        throw new Error('Birth date cannot be in the future.');
      }
    }
    payload.birthday = normalizedBirthDate;
  }
  delete payload.birth_date;

  if (updates.health_certified !== undefined) {
    payload.verified = updates.health_certified;
    delete payload.health_certified;
  }

  if (duplicateCheckNeeded) {
    const ownerId = updates.owner_id ?? existingRecord?.owner_id ?? null;
    const name = updates.name ?? existingRecord?.name ?? null;
    const registrationNumber = updates.registration_number ?? existingRecord?.registration_number ?? null;
    const duplicates = await checkPetDuplicates({
      registrationNumber,
      name,
      ownerId,
      excludeId: petId
    });

    if (duplicates.registration.length > 0) {
      await notifyDuplicate({
        ownerId,
        title: 'Duplicate registration detected',
        message: `Registration number already exists: ${registrationNumber}`,
        referenceId: duplicates.registration[0].id,
        userMessage: `Registration number ${registrationNumber} is already in use. Please verify or use a different number.`
      });
      throw new Error(`Registration number already exists: ${registrationNumber}`);
    }

    if (duplicates.name.length > 0) {
      await notifyDuplicate({
        ownerId,
        title: 'Duplicate pet name detected',
        message: `Owner already has a pet named "${name}".`,
        referenceId: duplicates.name[0].id,
        userMessage: `You already have a pet named "${name}". Please use a unique name.`
      });
      throw new Error('Duplicate pet name. Please use a unique name for your pets.');
    }
  }

  if (parentCheckNeeded) {
    const childBirthDate = updates.birth_date ?? existingRecord?.birthday ?? null;
    const fatherId = updates.father_id ?? existingRecord?.father_id ?? null;
    const motherId = updates.mother_id ?? existingRecord?.mother_id ?? null;
    await validateParentAges({
      childBirthDate,
      fatherId,
      motherId
    });
  }

  if (metaUpdateProvided) {
    let baseDescription = updates.description;

    if (baseDescription === undefined) {
      baseDescription = existingRecord?.description ?? '';
    }

    let descriptionText = typeof baseDescription === 'string' ? baseDescription : '';
    let existingMeta: any = {};

    if (typeof baseDescription === 'string' && baseDescription.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(baseDescription);
        existingMeta = parsed;
        if (typeof parsed.description === 'string') {
          descriptionText = parsed.description;
        }
      } catch (e) {
        existingMeta = {};
      }
    }

    const mergedMeta = {
      description: descriptionText || '',
      media_type: updates.media_type ?? existingMeta.media_type,
      video_url: updates.video_url ?? existingMeta.video_url,
      source: updates.source ?? existingMeta.source,
      external_link: updates.external_link ?? existingMeta.external_link
    };

    const hasMetaValues = Boolean(
      mergedMeta.media_type || mergedMeta.video_url || mergedMeta.source || mergedMeta.external_link
    );

    payload.description = hasMetaValues
      ? JSON.stringify(mergedMeta)
      : descriptionText || null;
  } else if (updates.description !== undefined) {
    payload.description = updates.description;
  }

  // Remove fields that don't satisfy DB schema
  delete payload.owner_name;
  delete payload.pedigree;
  delete payload.id; // DB PK, no update
  delete payload.created_at;
  delete payload.owner; // Relation object, not a column
  delete payload.media_type;
  delete payload.video_url;
  delete payload.source;
  delete payload.external_link;
  delete payload.is_sponsored;

  const { data, error } = await supabase
    .from('pets')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', petId)
    .select()
    .single();

  if (error) throw error;
  return mapPet(data);
}

// Delete pet
export async function deletePet(petId: string) {
  const { error } = await supabase
    .from('pets')
    .delete()
    .eq('id', petId);

  if (error) throw error;
}

// Search pets
export async function searchPets(query: string) {
  const { data, error } = await supabase
    .from('pets')
    .select(`
      *,
      owner_id,
      owner:profiles!owner_id(full_name, email, verified_breeder)
    `)
    .eq('is_public', true)
    .or(`name.ilike.%${query}%,breed.ilike.%${query}%,registration_number.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data.map(mapPet);
}

// ============ PEDIGREE ============

// Get pedigree tree for a pet (Simplified for now - using mother/father)
export async function getPedigreeTree(petId: string): Promise<{
  pet: Pet;
  sire: Pet | null;
  dam: Pet | null;
  paternal_grandsire: Pet | null;
  paternal_granddam: Pet | null;
  maternal_grandsire: Pet | null;
  maternal_granddam: Pet | null;
}> {
  // Get the main pet
  const pet = await getPetById(petId);

  let sire: Pet | null = null;
  let dam: Pet | null = null;
  let paternal_grandsire: Pet | null = null;
  let paternal_granddam: Pet | null = null;
  let maternal_grandsire: Pet | null = null;
  let maternal_granddam: Pet | null = null;

  if (pet.father_id) {
    try { sire = await getPetById(pet.father_id); } catch (e) { }
    if (sire?.father_id) try { paternal_grandsire = await getPetById(sire.father_id); } catch (e) { }
    if (sire?.mother_id) try { paternal_granddam = await getPetById(sire.mother_id); } catch (e) { }
  }

  if (pet.mother_id) {
    try { dam = await getPetById(pet.mother_id); } catch (e) { }
    if (dam?.father_id) try { maternal_grandsire = await getPetById(dam.father_id); } catch (e) { }
    if (dam?.mother_id) try { maternal_granddam = await getPetById(dam.mother_id); } catch (e) { }
  }

  return {
    pet,
    sire,
    dam,
    paternal_grandsire,
    paternal_granddam,
    maternal_grandsire,
    maternal_granddam
  };
}

// Update pedigree relationship
export async function updatePedigree(petId: string, sireId?: string, damId?: string) {
  const { data: child, error: childError } = await supabase
    .from('pets')
    .select('birthday')
    .eq('id', petId)
    .single();
  if (childError) throw childError;

  await validateParentAges({
    childBirthDate: child?.birthday ?? null,
    fatherId: sireId,
    motherId: damId
  });

  const { error } = await supabase
    .from('pets')
    .update({
      father_id: sireId || null,
      mother_id: damId || null
    })
    .eq('id', petId);

  if (error) throw error;
}

// ============ CART ============

// Save cart to database
export async function saveCart(items: CartItem[]) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('saved_carts')
    .upsert({
      user_id: user.id,
      items: items,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) console.error('Error saving cart:', error);
}

// Load cart from database
export async function loadCart(): Promise<CartItem[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_carts')
    .select('items')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return [];
  return data.items as CartItem[];
}

// Clear cart
export async function clearSavedCart() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('saved_carts')
    .delete()
    .eq('user_id', user.id);
}

// ============ ORDERS ============

// Create order
export async function createOrder(items: { productId: string; productName: string; quantity: number; unitPrice: number }[], shippingAddress: Order['shipping_address']) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      total_amount: totalAmount,
      shipping_address: shippingAddress,
      status: 'pending'
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = items.map(item => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    unit_price: item.unitPrice
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Clear cart after successful order
  await clearSavedCart();

  return order;
}

// Get user's orders
export async function getUserOrders() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Order[];
}

// Get single order
export async function getOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', orderId)
    .single();

  if (error) throw error;
  return data as Order;
}
// ============ BREEDING MARKET INTERACTIONS ============

// Create a reservation for a puppy from a pair
export async function createReservation(sireId: string, damId: string, userContact: string, note?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('breeding_reservations')
    .insert({
      sire_id: sireId,
      dam_id: damId,
      user_id: user.id,
      user_contact: userContact,
      user_note: note,
      status: 'pending'
    });

  if (error) throw error;
  return true;
}

// Submit a request to chat with the owner
export async function submitChatRequest(sireId: string, damId: string, ownerName: string, visitorContact: string, message: string) {
  const { error } = await supabase
    .from('breeding_chat_requests')
    .insert({
      sire_id: sireId,
      dam_id: damId,
      owner_name: ownerName,
      visitor_contact: visitorContact,
      message: message
    });

  if (error) throw error;
  return true;
}

// Report an issue with a breeding pair
export async function submitReport(sireId: string, damId: string, reason: string, details?: string) {
  const { error } = await supabase
    .from('breeding_reports')
    .insert({
      sire_id: sireId,
      dam_id: damId,
      reason: reason,
      details: details,
      status: 'open'
    });

  if (error) throw error;

  // Notify Admin
  await createNotification({
    type: 'breeding_report',
    title: 'New Issue Reported',
    message: `${reason}: ${details}`,
    reference_id: `${sireId}-${damId}`
  });

  return true;
}

// ============ ADMIN NOTIFICATIONS ============

export async function getAdminNotifications() {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
  return data as AdminNotification[];
}

export async function createNotification(notification: {
  type: 'new_pet' | 'verification_request' | 'breeding_report' | 'new_user';
  title: string;
  message?: string;
  reference_id?: string;
}) {
  const { error } = await supabase
    .from('admin_notifications')
    .insert({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      reference_id: notification.reference_id
    });

  if (error) console.error('Error creating notification:', error);
}



export async function markNotificationAsRead(id: string) {
  const { error } = await supabase
    .from('admin_notifications')
    .update({ status: 'read' })
    .eq('id', id);

  if (error) console.error('Error marking notification as read:', error);
}

// ============ USERS ============

// Get all users (profiles)
export async function getUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  return data;
}

// Delete user profile
export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) throw error;
}

// ============ USER NOTIFICATIONS ============

export interface UserNotification {
  id: string;
  user_id: string;
  type: 'system' | 'breeding' | 'puppy' | 'promo' | 'verification' | 'chat_message';
  title: string;
  message: string;
  payload?: any;
  is_read: boolean;
  created_at: string;
}

export async function getUserNotifications(userId: string) {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user notifications:', error);
    return [];
  }
  return data as UserNotification[];
}

export async function markUserNotifRead(id: string) {
  const { error } = await supabase
    .from('user_notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) console.error('Error marking user notif read:', error);
}

export async function createUserNotification(notif: Omit<UserNotification, 'id' | 'created_at' | 'is_read'>) {
  const { error } = await supabase
    .from('user_notifications')
    .insert(notif);
  if (error) console.error('Error creating user notification:', error);
}

// Helper to broadcast to ALL users (for Promos / New Puppy)
// WARNING: This is heavy for large DBs, usually done via Edge Functions or Batches.
export async function broadcastNotification(notif: Omit<UserNotification, 'id' | 'created_at' | 'is_read' | 'user_id'>) {
  // Fetch all user IDs
  const { data: users } = await supabase.from('profiles').select('id');
  if (!users || users.length === 0) return;

  const notifications = users.map(u => ({
    user_id: u.id,
    ...notif
  }));

  const { error } = await supabase.from('user_notifications').insert(notifications);
  if (error) console.error('Error broadcasting:', error);
}
// ============ DOCUMENTS ============
export interface PetDocument {
  id: string;
  pet_id: string;
  title: string;
  document_type: string;
  file_url: string;
  created_at: string;
}

export async function addPetDocument(doc: Omit<PetDocument, 'id' | 'created_at'>) {
  const { error } = await supabase.from('pet_documents').insert(doc);
  if (error) throw error;
}

export async function getPetDocuments(petId: string) {
  const { data, error } = await supabase.from('pet_documents').select('*').eq('pet_id', petId);
  if (error) {
    console.error(error);
    return [];
  }
  return data as PetDocument[];
}

export type SpayNeuterStatus = 'unknown' | 'intact' | 'spayed' | 'neutered';

export interface PetHealthProfile {
  id: string;
  pet_id: string;
  clinic_name?: string | null;
  clinic_phone?: string | null;
  vet_name?: string | null;
  weight_kg?: number | null;
  diet_summary?: string | null;
  feeding_schedule?: string | null;
  exercise_notes?: string | null;
  allergies?: string | null;
  conditions?: string | null;
  medications?: string | null;
  vaccines?: string | null;
  deworming_schedule?: string | null;
  last_checkup_date?: string | null;
  spay_neuter_status?: SpayNeuterStatus | null;
  reproductive_history?: string | null;
  family_history_notes?: string | null;
  incident_history?: string | null;
  risk_flags?: string[] | null;
  emergency_plan?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function getPetHealthProfile(petId: string): Promise<PetHealthProfile | null> {
  const { data, error } = await supabase
    .from('pet_health_profiles')
    .select('*')
    .eq('pet_id', petId)
    .maybeSingle();

  if (error) throw error;
  return data as PetHealthProfile | null;
}

export async function upsertPetHealthProfile(
  profile: Omit<PetHealthProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<PetHealthProfile> {
  const { data, error } = await supabase
    .from('pet_health_profiles')
    .upsert(profile, { onConflict: 'pet_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as PetHealthProfile;
}

// ============ PET GALLERY ============
export async function getPetPhotos(petId: string) {
  const { data, error } = await supabase
    .from('pet_photos')
    .select('*')
    .eq('pet_id', petId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data as PetPhoto[];
}

export async function getRelatedBreeders(petId: string): Promise<RelatedBreeder[]> {
  // 1. Get current pet info for breed and parents
  const { data: pet } = await supabase.from('pets').select('father_id, mother_id, breed').eq('id', petId).single();
  if (!pet) return [];

  const breeders: RelatedBreeder[] = [];

  // 2. Connected Bloodlines (Owners of Parents)
  if (pet.father_id || pet.mother_id) {
    const parentIds = [pet.father_id, pet.mother_id].filter(Boolean);
    const { data: parents } = await supabase.from('pets').select('owner_id, owner:owner_id(full_name, avatar_url)').in('id', parentIds);

    if (parents) {
      parents.forEach((p: any) => {
        if (p.owner) {
          breeders.push({
            id: p.owner_id,
            name: p.owner.full_name || 'Unknown Breeder',
            relation: 'Connected Bloodline',
            avatar_url: p.owner.avatar_url
          });
        }
      });
    }
  }

  // 3. Recommended Houses (Top owners of same breed)
  // This is a simplified "Recommendation" - fetching other owners of the same breed
  const { data: sameBreed } = await supabase
    .from('pets')
    .select('owner_id, owner:owner_id(full_name, avatar_url)')
    .eq('breed', pet.breed)
    .neq('id', petId)
    .limit(5);

  if (sameBreed) {
    const uniqueOwners = new Set(breeders.map(b => b.id));
    sameBreed.forEach((p: any) => {
      if (p.owner && !uniqueOwners.has(p.owner_id)) {
        breeders.push({
          id: p.owner_id,
          name: p.owner.full_name || 'Breeder',
          relation: 'Recommended House',
          avatar_url: p.owner.avatar_url
        });
        uniqueOwners.add(p.owner_id);
      }
    });
  }

  return breeders;
}

export async function addPetPhoto(photo: Omit<PetPhoto, 'id' | 'created_at' | 'order_index'>) {
  const { error } = await supabase.from('pet_photos').insert(photo);
  if (error) throw error;
}

export async function deletePetPhoto(photoId: string) {
  const { error } = await supabase.from('pet_photos').delete().eq('id', photoId);
  if (error) throw error;
}

// ============ CHAT SYSTEM ============
export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type?: 'text' | 'pet_card' | 'image';
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

// Simple logic: Create a fresh room for every specific inquiry 
export async function initChat(targetUserId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in");
  if (user.id === targetUserId) throw new Error("Cannot chat with yourself");

  // Reuse an existing room if both users already share one
  const { data: myRooms, error: myRoomsError } = await supabase
    .from('chat_participants')
    .select('room_id')
    .eq('user_id', user.id);

  if (!myRoomsError && myRooms && myRooms.length > 0) {
    const roomIds = myRooms.map(room => room.room_id);
    const { data: sharedRooms, error: sharedError } = await supabase
      .from('chat_participants')
      .select('room_id')
      .eq('user_id', targetUserId)
      .in('room_id', roomIds)
      .limit(1);

    if (!sharedError && sharedRooms && sharedRooms.length > 0) {
      return sharedRooms[0].room_id;
    }
  }

  // Create a new room if none exists
  const { data: room, error } = await supabase.from('chat_rooms').insert({}).select().single();
  if (error) throw error;

  // Deduplicate participants to avoid 409 Conflict on self-chat
  const participants = Array.from(new Set([user.id, targetUserId])).map(uid => ({
    room_id: room.id,
    user_id: uid
  }));

  const { error: partError } = await supabase.from('chat_participants').insert(participants);
  if (partError) throw partError;

  return room.id;
}

export async function sendMessage(
  roomId: string,
  content: string,
  type: 'text' | 'pet_card' | 'image' = 'text',
  metadata: any = {}
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No user");

  const { error } = await supabase.from('chat_messages').insert({
    room_id: roomId,
    sender_id: user.id,
    content,
    message_type: type,
    metadata
  });
  if (error) throw error;

  // -- ANTIGRAVITY UPDATE: Notify the other participant --
  try {
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('room_id', roomId)
      .neq('user_id', user.id); // Get everyone else (usually 1 person)

    if (participants && participants.length > 0) {
      const notifications = participants.map(p => ({
        user_id: p.user_id,
        type: 'chat_message',
        title: user.user_metadata?.full_name || 'New Message',
        message: type === 'pet_card'
          ? `Sent a pet inquiry: ${metadata?.petName || 'Pet'}`
          : `You have a new message: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`,
        payload: { room_id: roomId, sender_id: user.id },
        is_read: false
      }));

      await supabase.from('user_notifications').insert(notifications);
    }
  } catch (err) {
    console.error('Failed to send notification:', err);
    // Don't block the actual message send if notification fails
  }
}

export async function getChatMessages(roomId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data as ChatMessage[];
}

export function subscribeToChat(roomId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`chat:${roomId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, callback)
    .subscribe();
}

// Mark messages as read (for read receipts)
export async function markMessagesAsRead(roomId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('room_id', roomId)
    .neq('sender_id', user.id) // Don't mark own messages as read
    .eq('is_read', false);

  if (error) console.error('Error marking messages as read:', error);
}
// ============ COMMUNITY VOTING (CHAMPIONS) ============

export interface ChampionVote {
  id: string;
  pet_id: string;
  user_id: string;
  category: 'champion' | 'beautiful' | 'smart';
  created_at: string;
}

/*
  SQL SCHEMA REQUIREMENT:
  create table pet_champion_votes (
    id uuid default uuid_generate_v4() primary key,
    pet_id text not null, -- references pets(id)
    user_id uuid not null references auth.users(id),
    category text default 'champion',
    created_at timestamp with time zone default timezone('utc'::text, now()),
    unique(pet_id, user_id, category) -- Prevent duplicate votes
  );
*/

export async function voteForPet(petId: string, category: 'champion' | 'beautiful' | 'smart' = 'champion') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Optimistic UI or actual DB call
  const { error } = await supabase
    .from('pet_champion_votes')
    .insert({
      pet_id: petId,
      user_id: user.id,
      category: category
    });

  if (error) {
    // Check for duplicate vote (Postgres error 23505)
    if (error.code === '23505') throw new Error('You have already voted for this pet.');
    throw error;
  }
}

export async function getPetVotes(petId: string): Promise<number> {
  const { count, error } = await supabase
    .from('pet_champion_votes')
    .select('*', { count: 'exact', head: true })
    .eq('pet_id', petId);

  if (error) {
    // Fallback for demo/dev if table missing
    console.warn('Voting table missing or error, returning 0', error.message);
    return 0;
  }
  return count || 0;
}

export async function hasUserVoted(petId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('pet_champion_votes')
    .select('id')
    .eq('pet_id', petId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return false;
  return !!data;
}
// ============ PET STORIES (TIMELINE) ============

export interface PetStory {
  id: string;
  pet_id: string;
  title: string;
  description: string;
  image_url: string | null;
  event_date: string;
  event_type: 'milestone' | 'medical' | 'competition' | 'travel' | 'other';
  created_at: string;
}

/*
  SQL SCHEMA REQUIREMENT:
  create table pet_stories (
    id uuid default uuid_generate_v4() primary key,
    pet_id text not null, -- references pets(id)
    title text not null,
    description text,
    image_url text,
    event_date date default CURRENT_DATE,
    event_type text default 'other',
    created_at timestamp with time zone default timezone('utc'::text, now())
  );
*/

export async function addPetStory(story: Omit<PetStory, 'id' | 'created_at'>) {
  const { error } = await supabase
    .from('pet_stories')
    .insert(story);

  if (error) {
    console.error("Add Story Error Details:", JSON.stringify(error, null, 2));
    if (error.code === '42P01') {
      throw new Error("Story feature not initialized (Table missing). Please contact admin.");
    }
    throw error;
  }
}

export async function getPetStories(petId: string): Promise<PetStory[]> {
  const { data, error } = await supabase
    .from('pet_stories')
    .select('*')
    .eq('pet_id', petId)
    .order('event_date', { ascending: false }); // Newest first

  if (error) {
    // Silently fail if table missing (dev mode)
    // console.warn('Story table missing or error', error.message);
    return [];
  }
  return data as PetStory[];
}

export async function deletePetStory(id: string) {
  const { error } = await supabase
    .from('pet_stories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
