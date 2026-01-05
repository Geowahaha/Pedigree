-- =====================================================
-- Admin Notifications & Tasks
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL CHECK (type IN ('new_pet', 'verification_request', 'breeding_report', 'new_user')),
    title TEXT NOT NULL,
    message TEXT,
    reference_id UUID, -- ID of the pet, user, or report
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admin can do everything (assuming we have an admin role check later, for now public for MVP demo or authenticated)
CREATE POLICY "Allow authenticated read notifications" ON admin_notifications FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow public insert notifications" ON admin_notifications FOR INSERT WITH CHECK (true); -- Allow system/users to create notifs
CREATE POLICY "Allow authenticated update notifications" ON admin_notifications FOR UPDATE USING (auth.role() = 'authenticated');
