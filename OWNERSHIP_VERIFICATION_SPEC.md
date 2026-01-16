# Pet Ownership Verification System - Design Spec

## Overview
Goal: Allow admins to create pets without owners, then let real owners claim and verify ownership.

Current Situation:
- Pets stored in the same Supabase database
- Admin can create pets with "Admin (System)" owner
- No claim or verification flow yet

Need to Add:
1. "Waiting Owner" status display
2. Ownership claim request
3. Evidence and chat with admin
4. Admin approval workflow

## MVP Decisions (PM)
- Evidence storage: Supabase Storage bucket + signed URLs (jpg/jpeg/png/pdf, max 10 MB per file, up to 5 files).
- Retention: keep evidence for 180 days after claim is resolved; admin can delete earlier.
- Chat: Supabase Realtime.
- Multiple claims: allowed per pet; one claim per user (unique constraint).
- Claim expiration: none for MVP.
- Default waiting_owner: set when owner_id is null (system pet).

## Authorization and Data Integrity
- Admin access is profiles.is_admin = true or allowlist email (break-glass), per migration.
- Admin panel must allow changing user roles; use role-only long term and keep allowlist for emergency only.
- UI should call approve_ownership_claim / reject_ownership_claim functions (avoid direct client updates).
- Set ownership_status = 'pending_claim' via DB trigger on claim insert or a dedicated RPC, not a client-side update.

---

## Database Changes

### 1. Update pets Table

Add new columns:

```sql
ALTER TABLE pets
ADD COLUMN ownership_status TEXT DEFAULT 'verified',
ADD COLUMN claimed_by UUID REFERENCES profiles(id),
ADD COLUMN claim_date TIMESTAMP,
ADD COLUMN verification_evidence JSONB;

-- Ownership status values:
-- 'verified' - confirmed owner
-- 'waiting_owner' - no owner yet (admin created)
-- 'pending_claim' - someone claimed, waiting admin review
-- 'disputed' - multiple claims or issues
```

### 2. Create ownership_claims Table

```sql
CREATE TABLE ownership_claims (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    claimant_id UUID REFERENCES profiles(id),
    claim_type TEXT, -- 'original_owner', 'new_owner', 'breeder'
    evidence TEXT, -- Description
    evidence_files JSONB, -- Photos, documents
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pet_id, claimant_id) -- One claim per user per pet
);

-- Enable RLS
ALTER TABLE ownership_claims ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own claims"
    ON ownership_claims FOR SELECT
    USING (auth.uid() = claimant_id);

CREATE POLICY "Users can create claims"
    ON ownership_claims FOR INSERT
    WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Admins can view all claims"
    ON ownership_claims FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
        )
    );
```

### 3. Create claim_messages Table (Chat)

```sql
CREATE TABLE claim_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    claim_id UUID REFERENCES ownership_claims(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id),
    message TEXT NOT NULL,
    attachments JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE claim_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Claim participants can view messages"
    ON claim_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ownership_claims oc
            WHERE oc.id = claim_id
            AND (oc.claimant_id = auth.uid()
                 OR EXISTS (
                     SELECT 1 FROM profiles
                     WHERE id = auth.uid()
                     AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
                 ))
        )
    );

CREATE POLICY "Claim participants can send messages"
    ON claim_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ownership_claims oc
            WHERE oc.id = claim_id
            AND (oc.claimant_id = auth.uid()
                 OR EXISTS (
                     SELECT 1 FROM profiles
                     WHERE id = auth.uid()
                     AND (is_admin = true OR email IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com'))
                 ))
        )
    );
```

Use reject_ownership_claim for rejections (resets status when no other pending claims).

---

## UX Flow

### A. Admin Creates Pet (No Owner)

Admin panel entry:
- Owner: Admin (System) -> sets owner_id = NULL
- Status: Waiting Owner (auto when owner_id is NULL)

What happens:
```sql
INSERT INTO pets (
    name, species, breed, ...,
    owner_id = NULL, -- No owner
    ownership_status = 'waiting_owner'
)
```

Pet card display:
- Badge: Waiting Owner
- Primary action: Claim This Pet

---

### B. User Claims Ownership

User sees a waiting_owner pet and clicks Claim This Pet.

Claim modal fields:
- Claim type: original_owner | new_owner | breeder
- Evidence text
- File uploads (jpg/jpeg/png/pdf, max 10 MB each, up to 5 files)

On submit:
- Create ownership_claims row
- Set pet ownership_status to pending_claim (trigger or RPC)
- Notify admin via admin_notifications

---

### C. Admin Reviews Claim

Admin sees Ownership Claims list:
- Pet name, breed, image
- Claimant name and email
- Claim type
- Evidence summary and file links
- Created date
- Actions: View Details, Chat, Approve, Reject

Approve:
- call approve_ownership_claim (updates owner_id and status)
- notify claimant

Reject:
- call reject_ownership_claim (updates claim status)
- revert waiting_owner if no other pending claims

---

### D. Chat and Verification

Real-time chat per claim:
- Admin and claimant can message
- Attachments supported
- Uses Supabase Realtime subscriptions

---

### E. After Admin Approves

User sees:
- Ownership badge: Verified Owner
- Ability to edit pet profile
- Upload photos and documents
- Manage pedigree
- List for breeding or sale

---

## User Interface Components

### 1. Pet Card (Waiting Owner)
Display when pet.ownership_status === 'waiting_owner':
- Badge: Waiting Owner
- CTA: Claim This Pet

### 2. Claim Button States
- Waiting owner: "Claim This Pet"
- Pending claim: "Claim Pending Review"
- Approved for current user: "You Own This Pet"

### 3. Admin Claims Dashboard
List view:
- Claimant name, email
- Pet name, breed, image
- Claim type and submitted date
- Evidence links
- Actions: View Details, Chat, Approve, Reject

---

## Security and Validation

### Admin Creates Pet with No Owner
- owner_id = NULL
- ownership_status = waiting_owner
- Only admins can create system pets

### User Claims Pet
- User must be authenticated
- One claim per user per pet
- Only waiting_owner or pending_claim pets are claimable
- Validate file type and size client-side and server-side
- Evidence URLs stored in ownership_claims.evidence_files

### Admin Approves
- Use approve_ownership_claim function
- Function updates owner_id, claimed_by, claim_date, ownership_status
- RLS ensures only admins (role or allowlist) can approve or reject

---

## Admin Panel Integration

### New Tab: Ownership Claims
- Sidebar entry with badge for pending claims
- Filter by status: pending, approved, rejected
- Claim detail drawer or modal

### Claims List View
- Table or cards with key data
- Evidence viewer (links or thumbnails)
- Chat entry
- Approve and Reject actions

---

## Implementation Phases

### Phase 1: Database Setup (Done)
- Migration and functions

### Phase 2: Admin Creates Waiting Owner Pets (Pending)
- Admin panel changes

### Phase 3: User Claim Flow (Pending)
- Claim modal and pet card states

### Phase 4: Admin Review Interface (Pending)
- Claims list, approval controls, evidence viewer

### Phase 5: Chat System (Pending)
- Realtime chat and attachments

### Phase 6: Testing and Polish (Pending)
- Loading, errors, responsive, accessibility

---

## Summary

### Current Status
- Phase 1 complete
- UI and admin review pending

### Need to Add
- Claim modal and pet card state
- Admin claims tab
- Evidence upload
- Notifications
- Chat

### User Flow
Admin creates system pet -> user claims -> admin reviews -> owner approved -> pet verified
