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
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner?: {
    full_name: string;
    email: string;
    verified_breeder: boolean;
  };
  pedigree?: PedigreeRelationship;
}

export interface PedigreeRelationship {
  id: string;
  pet_id: string;
  sire_id: string | null;
  dam_id: string | null;
  sire_registration: string | null;
  dam_registration: string | null;
  sire?: Pet | null;
  dam?: Pet | null;
  sire_status?: 'pending' | 'verified' | 'rejected';
  dam_status?: 'pending' | 'verified' | 'rejected';
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

// ============ PETS ============

// Create a new pet
export async function createPet(petData: {
  name: string;
  type: 'dog' | 'cat';
  breed: string;
  gender: 'male' | 'female';
  birth_date: string;
  color?: string;
  health_certified?: boolean;
  location?: string;
  image_url?: string;
  description?: string;
  sire_registration?: string;
  dam_registration?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Generate registration number
  const registration_number = generateRegistrationNumber(petData.breed);

  const { data: pet, error } = await supabase
    .from('pets')
    .insert({
      owner_id: user.id,
      name: petData.name,
      type: petData.type,
      breed: petData.breed,
      gender: petData.gender,
      birth_date: petData.birth_date,
      color: petData.color || null,
      registration_number,
      health_certified: petData.health_certified || false,
      location: petData.location || null,
      image_url: petData.image_url || null,
      description: petData.description || null,
      is_public: true
    })
    .select()
    .single();

  if (error) throw error;

  // Create pedigree relationship if parent info provided
  if (petData.sire_registration || petData.dam_registration) {
    await supabase
      .from('pedigree_relationships')
      .insert({
        pet_id: pet.id,
        sire_registration: petData.sire_registration || null,
        dam_registration: petData.dam_registration || null
      });
  }

  return pet;
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
      owner:profiles(full_name, email, verified_breeder),
      pedigree:pedigree_relationships(*)
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
  return data as Pet[];
}

// Get user's own pets
export async function getUserPets() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('pets')
    .select(`
      *,
      pedigree:pedigree_relationships(*)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Pet[];
}

// Get single pet by ID
export async function getPetById(petId: string) {
  const { data, error } = await supabase
    .from('pets')
    .select(`
      *,
      owner:profiles(full_name, email, verified_breeder, location),
      pedigree:pedigree_relationships(*)
    `)
    .eq('id', petId)
    .single();

  if (error) throw error;
  return data as Pet;
}

// Get pet by registration number
export async function getPetByRegistration(registrationNumber: string) {
  const { data, error } = await supabase
    .from('pets')
    .select(`
      *,
      owner:profiles(full_name, email, verified_breeder),
      pedigree:pedigree_relationships(*)
    `)
    .eq('registration_number', registrationNumber)
    .single();

  if (error) return null;
  return data as Pet;
}

// Update pet
export async function updatePet(petId: string, updates: Partial<Pet>) {
  const { data, error } = await supabase
    .from('pets')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', petId)
    .select()
    .single();

  if (error) throw error;
  return data;
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
      owner:profiles(full_name, email, verified_breeder)
    `)
    .eq('is_public', true)
    .or(`name.ilike.%${query}%,breed.ilike.%${query}%,registration_number.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data as Pet[];
}

// ============ PEDIGREE ============

// Get pedigree tree for a pet (3 generations)
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

  // Get parents from pedigree relationship
  if (pet.pedigree) {
    if (pet.pedigree.sire_id) {
      sire = await getPetById(pet.pedigree.sire_id);
      // Get sire's parents
      if (sire?.pedigree) {
        if (sire.pedigree.sire_id) {
          paternal_grandsire = await getPetById(sire.pedigree.sire_id);
        }
        if (sire.pedigree.dam_id) {
          paternal_granddam = await getPetById(sire.pedigree.dam_id);
        }
      }
    } else if (pet.pedigree.sire_registration) {
      sire = await getPetByRegistration(pet.pedigree.sire_registration);
    }

    if (pet.pedigree.dam_id) {
      dam = await getPetById(pet.pedigree.dam_id);
      // Get dam's parents
      if (dam?.pedigree) {
        if (dam.pedigree.sire_id) {
          maternal_grandsire = await getPetById(dam.pedigree.sire_id);
        }
        if (dam.pedigree.dam_id) {
          maternal_granddam = await getPetById(dam.pedigree.dam_id);
        }
      }
    } else if (pet.pedigree.dam_registration) {
      dam = await getPetByRegistration(pet.pedigree.dam_registration);
    }
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
export async function updatePedigree(petId: string, sireId?: string, damId?: string, sireReg?: string, damReg?: string) {
  const { data: existing } = await supabase
    .from('pedigree_relationships')
    .select()
    .eq('pet_id', petId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('pedigree_relationships')
      .update({
        sire_id: sireId || null,
        dam_id: damId || null,
        sire_registration: sireReg || null,
        dam_registration: damReg || null
      })
      .eq('pet_id', petId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('pedigree_relationships')
      .insert({
        pet_id: petId,
        sire_id: sireId || null,
        dam_id: damId || null,
        sire_registration: sireReg || null,
        dam_registration: damReg || null
      });
    if (error) throw error;
  }
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
    .single();

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
