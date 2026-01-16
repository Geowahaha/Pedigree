# 🔧 Setup Edge Function for User Creation

## Problem
"User not allowed" error occurs because `supabase.auth.admin.createUser()` requires Service Role Key, which cannot be used in browser (client-side).

## Solution
Use Supabase Edge Function (server-side) to create users safely.

---

## 📋 Setup Steps

### 1. Install Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

**Get YOUR_PROJECT_REF:**
- Go to Supabase Dashboard
- Settings → General → Project Settings
- Copy "Reference ID"

---

### 2. Deploy Edge Function

```bash
# Navigate to project root
cd d:/Petdegree/breeding-market-modern

# Deploy the create-user function
supabase functions deploy create-user

# Set secrets (Service Role Key)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Get Service Role Key:**
- Supabase Dashboard → Settings → API
- Copy "service_role" key (⚠️ Keep it secret!)

---

### 3. Test Edge Function

```bash
# Test locally first
supabase functions serve create-user

# In another terminal, test it
curl -X POST https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "fullName": "Test User",
    "role": "buyer"
  }'
```

---

## 🎯 How It Works Now

### Before (❌ Broken):
```tsx
// Client-side - Admin API not allowed
const { data } = await supabase.auth.admin.createUser({
  email, password  // ❌ Error: User not allowed
});
```

### After (✅ Working):
```tsx
// Client calls Edge Function
const { data } = await supabase.functions.invoke('create-user', {
  body: { email, password, fullName, role },
  headers: { Authorization: `Bearer ${session.access_token}` }
});
```

### Edge Function (Server-side):
```tsx
// Server has Service Role Key
const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
const { data } = await supabaseAdmin.auth.admin.createUser({
  email, password  // ✅ Works!
});
```

---

## 🔒 Security Flow

1. **User clicks "Create User"** in browser
2. **AdminPanel.tsx** calls Edge Function with JWT token
3. **Edge Function** verifies:
   - Token is valid
   - User is admin (geowahaha@gmail.com or truesaveus@hotmail.com)
4. **Edge Function** creates user using Service Role Key
5. **Response** sent back to browser
6. **User list** refreshes

---

## 📝 Files Modified

### 1. Edge Function
**Location**: `supabase/functions/create-user/index.ts`
- Verifies admin access
- Creates user server-side
- Returns success/error

### 2. AdminPanel.tsx
**Changed**: Line ~836
```tsx
// Before
await supabase.auth.admin.createUser(...)

// After  
await supabase.functions.invoke('create-user', ...)
```

---

## ⚠️ Important Notes

### Service Role Key
- Never expose in client code
- Keep in Edge Function only
- Use Supabase Secrets

### Admin Verification
Edge function checks:
```tsx
const isAdmin = 
  profile?.is_admin || 
  profile?.email === 'geowahaha@gmail.com' || 
  profile?.email === 'truesaveus@hotmail.com'
```

---

## 🧪 Testing

### 1. After Deployment
```bash
# Check function is deployed
supabase functions list

# View logs
supabase functions logs create-user
```

### 2. In Browser
1. Login as admin (geowahaha@gmail.com)
2. Open Admin Panel
3. Go to Users tab
4. Click "Add New User"
5. Fill form
6. Click "Create User"
7. Should work! ✅

---

## 🐛 Troubleshooting

### Error: "Function not found"
```bash
# Make sure function is deployed
supabase functions deploy create-user
```

### Error: "Not authorized"
- Check if you're logged in as admin
- Verify email is in allowed list

### Error: "Service Role Key not set"
```bash
# Set the secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
```

### Error: "Email already exists"
- User already exists in Supabase
- Delete old user or use different email

---

## 🎁 Alternative: Database Function

If you don't want to use Edge Functions, use Postgres Function:

```sql
CREATE OR REPLACE FUNCTION create_user_as_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'buyer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT (
    SELECT is_admin FROM profiles WHERE id = auth.uid()
  ) AND auth.jwt() ->> 'email' NOT IN ('geowahaha@gmail.com', 'truesaveus@hotmail.com') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Create auth user (requires Service Role)
  -- NOTE: This won't work from client, only from Edge Function
  
  RETURN jsonb_build_object('success', true);
END;
$$;
```

**But this still needs Edge Function to work!**

---

## ✅ Final Checklist

- [ ] Supabase CLI installed
- [ ] Logged into Supabase
- [ ] Project linked
- [ ] Edge Function deployed
- [ ] Service Role Key set
- [ ] Tested in browser
- [ ] Working! 🎉

---

## 🚀 Quick Deploy Commands

```bash
# One-time setup
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy function
cd d:/Petdegree/breeding-market-modern
supabase functions deploy create-user

# Set secret
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Done! Test in browser
```

---

## 📞 Need Help?

Check Supabase docs:
- https://supabase.com/docs/guides/functions
- https://supabase.com/docs/guides/auth/server-side-auth

