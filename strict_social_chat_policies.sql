-- ============================================================================
-- STRICT SOCIAL + CHAT POLICIES
-- Purpose: tighten comment/like and chat access to participants/admin only
-- Safe: policy-only changes (no schema changes)
-- ============================================================================

-- Helper: check admin
-- (Inline EXISTS used in policies; no function needed)

-- Helper functions for chat (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_room_participant(check_room_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE room_id = check_room_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_room_empty(check_room_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1
    FROM public.chat_participants
    WHERE room_id = check_room_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SOCIAL: comments + likes
-- ============================================================================

ALTER TABLE public.pet_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_likes ENABLE ROW LEVEL SECURITY;

-- Add approval columns if missing (required for strict comment flow)
ALTER TABLE public.pet_comments
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Preserve existing comments visibility by approving legacy rows
UPDATE public.pet_comments SET is_approved = true WHERE is_approved IS NULL;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'pet_comments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pet_comments', r.policyname);
    END LOOP;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'pet_likes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pet_likes', r.policyname);
    END LOOP;
END $$;

-- Comments: public sees only approved, users see own, admins manage all
CREATE POLICY "Public read approved comments"
ON public.pet_comments FOR SELECT
USING (is_approved = true);

CREATE POLICY "Users read own comments"
ON public.pet_comments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users post comments"
ON public.pet_comments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own comments"
ON public.pet_comments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage comments"
ON public.pet_comments FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'admin'
  )
);

-- Likes: public read, users toggle own, admins manage all
CREATE POLICY "Public read likes"
ON public.pet_likes FOR SELECT
USING (true);

CREATE POLICY "Users insert own likes"
ON public.pet_likes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own likes"
ON public.pet_likes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage likes"
ON public.pet_likes FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid()
      AND pr.role = 'admin'
  )
);

-- ============================================================================
-- CHAT: rooms, participants, messages
-- ============================================================================

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'chat_rooms'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_rooms', r.policyname);
    END LOOP;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'chat_participants'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_participants', r.policyname);
    END LOOP;
END $$;

DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'chat_messages'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.chat_messages', r.policyname);
    END LOOP;
END $$;

-- Rooms
CREATE POLICY "Participants read rooms"
ON public.chat_rooms FOR SELECT
TO authenticated
USING (
  public.is_room_participant(id)
  OR public.is_room_empty(id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

CREATE POLICY "Users create rooms"
ON public.chat_rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Participants update rooms"
ON public.chat_rooms FOR UPDATE
TO authenticated
USING (
  public.is_room_participant(id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
)
WITH CHECK (
  public.is_room_participant(id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

CREATE POLICY "Admins delete rooms"
ON public.chat_rooms FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

-- Participants
CREATE POLICY "Participants read participants"
ON public.chat_participants FOR SELECT
TO authenticated
USING (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

CREATE POLICY "Users add participants"
ON public.chat_participants FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() = user_id
    OR public.is_room_participant(room_id)
    OR public.is_room_empty(room_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
  )
);

CREATE POLICY "Participants update participants"
ON public.chat_participants FOR UPDATE
TO authenticated
USING (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
)
WITH CHECK (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

CREATE POLICY "Participants delete participants"
ON public.chat_participants FOR DELETE
TO authenticated
USING (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

-- Messages
CREATE POLICY "Participants read messages"
ON public.chat_messages FOR SELECT
TO authenticated
USING (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

CREATE POLICY "Participants send messages"
ON public.chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  public.is_room_participant(room_id)
  AND sender_id = auth.uid()
);

CREATE POLICY "Participants update messages"
ON public.chat_messages FOR UPDATE
TO authenticated
USING (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
)
WITH CHECK (
  public.is_room_participant(room_id)
  OR EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

CREATE POLICY "Admins delete messages"
ON public.chat_messages FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'admin'
  )
);

-- ============================================================================
-- Verify
-- ============================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('pet_comments', 'pet_likes', 'chat_rooms', 'chat_participants', 'chat_messages')
ORDER BY tablename, policyname;
