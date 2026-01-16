--Create Supabase Edge Function for Admin User Creation

/**
 * File: supabase/functions/create-user/index.ts
 * 
 * This Edge Function allows admins to create users server-side
 * using the Service Role Key safely.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        // Get request body
        const { email, password, fullName, role } = await req.json()

        // Verify admin (check Authorization header)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase Admin Client with Service Role Key
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        // Verify requesting user is admin
        const token = authHeader.replace('Bearer ', '')
        const { data: { user: requestingUser } } = await supabaseAdmin.auth.getUser(token)

        if (!requestingUser) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Check if requesting user is admin
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('is_admin, email')
            .eq('id', requestingUser.id)
            .single()

        const isAdmin = profile?.is_admin ||
            profile?.email === 'geowahaha@gmail.com' ||
            profile?.email === 'truesaveus@hotmail.com'

        if (!isAdmin) {
            return new Response(
                JSON.stringify({ error: 'Not authorized - Admin only' }),
                { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Create user with Admin API
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: fullName
            }
        })

        if (authError) throw authError

        // Create profile
        if (authData.user) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName || null,
                    role: role,
                    is_admin: role === 'admin',
                    verified_breeder: role === 'breeder'
                })

            if (profileError) throw profileError
        }

        return new Response(
            JSON.stringify({
                success: true,
                user: authData.user
            }),
            {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            }
        )
    }
})
