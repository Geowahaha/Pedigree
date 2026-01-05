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

// Helper to map DB pet to Interface (keeping backward compat)
// Helper to map DB pet to Interface (keeping backward compat)
// Helper to map DB pet to Interface (keeping backward compat)
function mapPet(pet: any): Pet {
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

  return {
    ...pet,
    type: finalType,
    birth_date: pet.birthday, // Map DB 'birthday' to Interface 'birth_date'
    health_certified: pet.verified, // Map DB 'verified' to Interface 'health_certified'
    image_url: pet.image_url || '',
    owner_name: ownerName,
    pedigree: {
      sire_id: pet.father_id,
      dam_id: pet.mother_id
    }
  };
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
  registration_number?: string; // Allow custom Reg No
  health_certified?: boolean;
  location?: string;
  image_url?: string;
  description?: string;
  mother_id?: string;
  father_id?: string;
  owner_id?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Use provided Reg No or generate new one
  const registration_number = petData.registration_number || generateRegistrationNumber(petData.breed);

  const { data: pet, error } = await supabase
    .from('pets')
    .insert({
      owner_id: petData.owner_id || user.id,
      name: petData.name,
      type: petData.type,
      breed: petData.breed,
      gender: petData.gender,
      birthday: petData.birth_date,
      color: petData.color || null,
      registration_number,
      location: petData.location || null,
      image_url: petData.image_url || null,
      description: petData.description || null,
      mother_id: petData.mother_id || null,
      father_id: petData.father_id || null,
      is_public: true,
      verified: petData.health_certified
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

  if (updates.birth_date) {
    payload.birthday = updates.birth_date;
    delete payload.birth_date;
  }

  if (updates.health_certified !== undefined) {
    payload.verified = updates.health_certified;
    delete payload.health_certified;
  }

  // Remove fields that don't satisfy DB schema
  delete payload.owner_name;
  delete payload.pedigree;
  delete payload.id; // DB PK, no update
  delete payload.created_at;
  delete payload.owner; // Relation object, not a column

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
// ============ BREEDING MARKET INTERACTIONS ============

// Create a reservation for a puppy from a pair
export async function createReservation(sireId: string, damId: string, userContact: string, note?: string) {
  const { error } = await supabase
    .from('breeding_reservations')
    .insert({
      sire_id: sireId,
      dam_id: damId,
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
  type: 'system' | 'breeding' | 'puppy' | 'promo' | 'verification';
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

  // For MVP: Create a new room. In production, we'd query for existing common room.
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
        payload: { room_id: roomId },
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
