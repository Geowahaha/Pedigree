# Ownership Claims RLS Migration

**Migration Date:** 2026-01-20  
**Migration Files:**
- `20260120_ownership_claims_rls.sql` (Main migration)
- `20260120_ownership_claims_rls_rollback.sql` (Rollback)

---

## 📋 Purpose

This migration adds Row-Level Security (RLS) policies to the `ownership_claims` table to enable secure ownership verification feature.

### What It Does:

1. ✅ Creates `is_admin()` helper function
2. ✅ Enables RLS on `ownership_claims` table
3. ✅ Adds policies for users to create and view their own claims
4. ✅ Adds policies for admins to manage all claims
5. ✅ Secures `claim_messages` table (if exists)

---

## 🚀 How to Run

### **Option 1: Supabase Dashboard (Recommended)**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open `20260120_ownership_claims_rls.sql`
3. Copy and paste the entire content
4. Click **Run**
5. Verify success message appears

### **Option 2: Supabase CLI**

```bash
# Run migration
supabase db push

# Or apply specific migration
supabase migration up
```

### **Option 3: Manual SQL (Production)**

```bash
# Connect to production database
psql -h <your-db-host> -U postgres -d postgres

# Run migration file
\i supabase/migrations/20260120_ownership_claims_rls.sql
```

---

## 🔐 Security Policies Applied

| Policy | Table | Allows | Scope |
|--------|-------|--------|-------|
| `users_can_create_claims` | ownership_claims | INSERT | Own claims only |
| `users_can_view_own_claims` | ownership_claims | SELECT | Own claims only |
| `admins_can_view_all_claims` | ownership_claims | SELECT | All claims |
| `admins_can_update_claims` | ownership_claims | UPDATE | All claims |
| `admins_can_delete_claims` | ownership_claims | DELETE | All claims |
| `users_can_view_claim_messages` | claim_messages | SELECT | Related claims |
| `users_can_send_claim_messages` | claim_messages | INSERT | Related claims |

---

## ✅ Verification Steps

After running migration, verify:

```sql
-- 1. Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'ownership_claims';
-- Expected: rowsecurity = true

-- 2. Check policies exist
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'ownership_claims';
-- Expected: 5 policies listed

-- 3. Test is_admin() function
SELECT is_admin();
-- Expected: true (if you're admin) or false

-- 4. Test claim creation (as regular user)
INSERT INTO ownership_claims (pet_id, claimant_id, claim_type, evidence)
VALUES ('test-pet-id', auth.uid(), 'original_owner', 'Test evidence');
-- Expected: Success if authenticated
```

---

## 🔄 Rollback

If you need to rollback:

```sql
-- Run rollback script
\i supabase/migrations/20260120_ownership_claims_rls_rollback.sql
```

**⚠️ Warning:** Rollback will remove all RLS policies. Consider alternative security if rolling back in production.

---

## 🐛 Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause:** Migration not applied or user not authenticated

**Fix:**
```sql
-- Check RLS status
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'ownership_claims';

-- If RLS is off, re-run migration
```

### Issue: "function is_admin() does not exist"

**Cause:** Helper function not created

**Fix:**
```sql
-- Re-run helper function creation
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Issue: "permission denied for table ownership_claims"

**Cause:** Missing grants

**Fix:**
```sql
GRANT ALL ON ownership_claims TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

---

## 📚 Related Documentation

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)

---

## ✨ Impact

After this migration:
- ✅ Users can submit ownership claims via UI
- ✅ Claims are automatically scoped to the creating user
- ✅ Admins can manage all claims for verification
- ✅ Secure by default - no data leakage
- ✅ Production-ready security policies

---

**Migration Created By:** Antigravity AI  
**Last Updated:** 2026-01-20
