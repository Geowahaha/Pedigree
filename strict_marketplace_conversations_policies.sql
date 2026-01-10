-- ============================================================================
-- STRICT MARKETPLACE CONVERSATIONS/MESSAGES POLICIES
-- Purpose: restrict marketplace chat to participants/admin only
-- Safe: policy-only changes (no schema changes)
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'conversations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.conversations', r.policyname);
    END LOOP;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.messages', r.policyname);
    END LOOP;
END $$;

-- Conversations
CREATE POLICY "Participants read conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

CREATE POLICY "Participants create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

CREATE POLICY "Participants update conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
)
WITH CHECK (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

CREATE POLICY "Participants delete conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (
    participant1_id = auth.uid()
    OR participant2_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

-- Messages
CREATE POLICY "Participants read messages"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

CREATE POLICY "Participants send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
);

CREATE POLICY "Participants update messages"
ON public.messages FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

CREATE POLICY "Admins delete messages"
ON public.messages FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

-- Verify
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages')
ORDER BY tablename, policyname;
