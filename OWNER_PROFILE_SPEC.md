# Owner Profile & Edit Approval System - Design Spec

**Date**: 2026-01-15  
**Feature**: Owner Profile View + Admin Approval Workflow  
**Priority**: Medium-High  

---

## Overview

Allow users to click on any pet owner's name/avatar to view their public profile ("My Space"), showing all their pets. If viewing their own profile, owners can edit pets, but all changes require admin approval before going live.

---

## User Flow

### A. Viewing Another Owner's Profile

1. User clicks owner name/avatar on any pet card/modal
2. Navigate to `/profile/:ownerId`
3. Shows:
   - Owner name, avatar, location
   - All public pets owned by that owner
   - Pet grid (Pinterest style)
   - View-only (no edit buttons)

### B. Viewing Own Profile

1. Owner clicks their own name/avatar (or goes to "My Space")
2. Navigate to `/profile/:ownerId` (same page, different permissions)
3. Shows:
   - Owner info (can edit via settings)
   - All pets (public + private)
   - **Edit buttons on each pet**
   - "Add New Pet" button

### C. Editing Pet (Owner)

1. Owner clicks "Edit" on their pet
2. Edit modal/form opens
3. Makes changes
4. Clicks "Save Changes"
5. **Changes go to pending approval**
6. Pet shows "Pending Changes" badge
7. **Original data still shows publicly**
8. **Owner sees preview of pending changes**

### D. Admin Approves/Rejects

1. Admin sees "Pending Changes" tab in Admin Panel
2. Lists all pending edits (pet name, breed, photos, etc.)
3. Shows before/after comparison
4. Admin clicks:
   - **Approve** → Changes go live immediately
   - **Reject** → Changes discarded, owner notified

---

## Database Changes

### 1. Create `pet_change_requests` Table

```sql
CREATE TABLE pet_change_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    requester_id UUID REFERENCES profiles(id),
    change_type TEXT, -- 'update', 'create', 'delete'
    field_changes JSONB, -- {"name": {"old": "Max", "new": "Maximus"}, ...}
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- RLS
ALTER TABLE pet_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests"
    ON pet_change_requests FOR SELECT
    USING (auth.uid() = requester_id);

CREATE POLICY "Users can create requests"
    ON pet_change_requests FOR INSERT
    WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Admins can view all"
    ON pet_change_requests FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );
```

### 2. Add Pending Changes Indicator

```sql
ALTER TABLE pets
ADD COLUMN has_pending_changes BOOLEAN DEFAULT FALSE;
```

---

## UI Components

### 1. Owner Profile Page

**File**: `src/pages/OwnerProfile.tsx` (new)

```tsx
<div className="owner-profile">
  {/* Header */}
  <div className="profile-header">
    <img src={owner.avatar} className="avatar" />
    <h1>{owner.name}</h1>
    <p>{owner.location}</p>
    {isOwnProfile && (
      <button>⚙️ Settings</button>
    )}
  </div>

  {/* Pet Grid */}
  <div className="pet-grid">
    {pets.map(pet => (
      <PetCard
        pet={pet}
        showEdit={isOwnProfile}
        pendingChanges={getPendingChanges(pet.id)}
      />
    ))}
  </div>

  {isOwnProfile && (
    <button onClick={openAddPetModal}>+ Add New Pet</button>
  )}
</div>
```

---

### 2. Clickable Owner Info

**Update**: `src/components/ui/EnhancedPinterestModal.tsx`

```tsx
{/* Owner Info - Make Clickable */}
<div
  className="flex items-center gap-3 pb-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition"
  onClick={() => navigate(`/profile/${pet.owner_id}`)}
>
  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
  <div>
    <p className="font-semibold text-gray-900">{pet.owner || 'Unknown Owner'}</p>
    <p className="text-sm text-gray-500">{pet.location || 'Location'}</p>
  </div>
  <svg className="w-4 h-4 text-gray-400 ml-auto">...</svg>
</div>
```

---

### 3. Edit with Approval Flow

**Update**: Pet edit functions

```tsx
const handleSaveEdit = async () => {
  // Instead of updating pet directly:
  // await updatePet(petId, changes);

  // Create change request instead:
  await createChangeRequest({
    pet_id: petId,
    change_type: 'update',
    field_changes: {
      name: { old: pet.name, new: editForm.name },
      breed: { old: pet.breed, new: editForm.breed },
      // ... etc
    }
  });

  alert('Changes submitted for admin approval!');
  setPet(prev => ({ ...prev, has_pending_changes: true }));
};
```

---

### 4. Pending Changes Badge

```tsx
{pet.has_pending_changes && (
  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
    Pending Review
  </div>
)}
```

---

### 5. Admin Approval Tab

**Update**: `src/components/AdminPanel.tsx`

Add new tab: "Pending Changes"

```tsx
<button onClick={() => setActiveTab('pending_changes')}>
  Pending Changes
  {pendingChangeRequests.length > 0 && (
    <span className="badge">{pendingChangeRequests.length}</span>
  )}
</button>

{activeTab === 'pending_changes' && (
  <div>
    <h2>Pending Pet Changes</h2>
    {changeRequests.map(request => (
      <ChangeRequestCard
        request={request}
        onApprove={() => handleApproveChange(request.id)}
        onReject={() => handleRejectChange(request.id)}
      />
    ))}
  </div>
)}
```

---

### 6. Change Request Card (Admin View)

```tsx
<div className="change-request-card">
  <div className="pet-info">
    <img src={request.pet.image} />
    <h3>{request.pet.name}</h3>
  </div>

  <div className="changes">
    {Object.entries(request.field_changes).map(([field, change]) => (
      <div key={field} className="change-row">
        <span className="field-name">{field}</span>
        <span className="old-value">{change.old}</span>
        <span className="arrow">→</span>
        <span className="new-value">{change.new}</span>
      </div>
    ))}
  </div>

  <div className="actions">
    <button onClick={onApprove} className="approve">✓ Approve</button>
    <button onClick={onReject} className="reject">✗ Reject</button>
  </div>
</div>
```

---

## Helper Functions

### 1. Create Change Request

```ts
export async function createChangeRequest(data: {
  pet_id: string;
  change_type: 'update' | 'create' | 'delete';
  field_changes: Record<string, { old: any; new: any }>;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: request, error } = await supabase
    .from('pet_change_requests')
    .insert({
      pet_id: data.pet_id,
      requester_id: user.id,
      change_type: data.change_type,
      field_changes: data.field_changes
    })
    .select()
    .single();

  if (error) throw error;

  // Mark pet as having pending changes
  await supabase
    .from('pets')
    .update({ has_pending_changes: true })
    .eq('id', data.pet_id);

  // Notify admin
  await createNotification({
    type: 'verification_request',
    title: 'Pet Change Request',
    message: `${user.email} requested changes to a pet`,
    reference_id: request.id
  });

  return request;
}
```

### 2. Approve Change Request

```ts
export async function approveChangeRequest(requestId: string, adminId: string) {
  // Get request
  const { data: request } = await supabase
    .from('pet_change_requests')
    .select('*, pet:pets(*)')
    .eq('id', requestId)
    .single();

  if (!request) throw new Error('Request not found');

  // Apply changes to pet
  const updates: any = {};
  for (const [field, change] of Object.entries(request.field_changes as any)) {
    updates[field] = change.new;
  }

  await supabase
    .from('pets')
    .update({
      ...updates,
      has_pending_changes: false
    })
    .eq('id', request.pet_id);

  // Mark request as approved
  await supabase
    .from('pet_change_requests')
    .update({
      status: 'approved',
      reviewed_by: adminId
    })
    .eq('id', requestId);

  // Notify user
  await createUserNotification({
    user_id: request.requester_id,
    type: 'verification',
    title: 'Changes Approved!',
    message: `Your changes to ${request.pet.name} have been approved`,
    payload: { request_id: requestId }
  });
}
```

### 3. Get Pending Changes for Pet

```ts
export async function getPendingChanges(petId: string) {
  const { data, error } = await supabase
    .from('pet_change_requests')
    .select('*')
    .eq('pet_id', petId)
    .eq('status', 'pending')
    .single();

  if (error || !data) return null;
  return data;
}
```

---

## Routing

Add React Router route:

```tsx
<Route path="/profile/:ownerId" element={<OwnerProfile />} />
```

---

## Security

1. **View permissions**:
   - Anyone can view public profiles
   - Only owner can see private/unpublished pets
   - Only owner can edit their own pets

2. **Edit permissions**:
   - Only authenticated owners can request changes
   - All changes go to approval queue
   - No direct updates to pets table (except via admin approval)

3. **Admin permissions**:
   - Only admins can approve/reject changes
   - Admin actions are logged

---

## Success Metrics

- [ ] User can click owner name → view profile
- [ ] Owner sees all their pets
- [ ] Owner can edit pets (changes pending)
- [ ] Admin sees pending changes queue
- [ ] Admin can approve/reject
- [ ] Approved changes go live immediately
- [ ] User receives notification on approval/rejection

---

## Implementation Phases

### Phase 1: Owner Profile Page (2-3h)
- Create `/profile/:ownerId` page
- Show owner info + pet grid
- Make owner name/avatar clickable

### Phase 2: Change Request System (3-4h)
- Database migration
- Helper functions
- Edit flow with approval

### Phase 3: Admin Approval UI (2h)
- Admin panel tab
- Change request cards
- Approve/reject actions

### Phase 4: Notifications (1h)
- Notify admin on new request
- Notify user on approval/rejection

### Phase 5: Testing (2h)
- Test full flow
- Edge cases
- UI polish

**Total Estimated Time**: ~10-12 hours

---

## PM Review Questions

1. **Edit without approval**:
   - Should any fields be editable without approval?
   - E.g., description, photos?

2. **Bulk approve**:
   - Should admin be able to approve all changes for a user?
   - Or must review each change individually?

3. **Change history**:
   - Should we keep audit log of all changes?
   - Show change history on pet page?

4. **Profile privacy**:
   - Should profiles be public or require login?
   - Can users hide their profile?

5. **New pet approval**:
   - Should creating new pets also require approval?
   - Or only edits?

---

**Ready for PM approval before implementation!**
