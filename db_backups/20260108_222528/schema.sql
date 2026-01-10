--
-- PostgreSQL database dump
--

\restrict BDlALGTfaj8BzQZayczU0bCE5uN0b4C3AnGlZZKrhMJhEY6gxfxxcJksFvzgmyQ

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    reference_id uuid,
    status text DEFAULT 'unread'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admin_notifications_status_check CHECK ((status = ANY (ARRAY['unread'::text, 'read'::text, 'archived'::text]))),
    CONSTRAINT admin_notifications_type_check CHECK ((type = ANY (ARRAY['new_pet'::text, 'verification_request'::text, 'breeding_report'::text, 'new_user'::text])))
);


ALTER TABLE public.admin_notifications OWNER TO postgres;

--
-- Name: breeding_matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.breeding_matches (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sire_id uuid,
    dam_id uuid,
    match_date date NOT NULL,
    due_date date,
    status text DEFAULT 'planned'::text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    requested_by uuid,
    approval_status text DEFAULT 'approved'::text,
    approved_by uuid,
    approved_at timestamp with time zone,
    CONSTRAINT breeding_matches_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT breeding_matches_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'mated'::text, 'confirmed'::text, 'born'::text, 'failed'::text])))
);


ALTER TABLE public.breeding_matches OWNER TO postgres;

--
-- Name: breeding_reservations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.breeding_reservations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sire_id uuid NOT NULL,
    dam_id uuid NOT NULL,
    user_contact text,
    user_note text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid,
    CONSTRAINT breeding_reservations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'contacted'::text, 'rejected'::text])))
);


ALTER TABLE public.breeding_reservations OWNER TO postgres;

--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    room_id uuid,
    sender_id uuid,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    message_type text DEFAULT 'text'::text,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- Name: chat_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_participants (
    room_id uuid NOT NULL,
    user_id uuid NOT NULL
);


ALTER TABLE public.chat_participants OWNER TO postgres;

--
-- Name: chat_rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_rooms (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.chat_rooms OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    participant1_id uuid NOT NULL,
    participant2_id uuid NOT NULL,
    last_message text,
    last_message_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    conversation_id uuid,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: pet_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    pet_id uuid,
    user_id uuid,
    content text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.pet_comments OWNER TO postgres;

--
-- Name: pet_likes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pet_likes (
    pet_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.pet_likes OWNER TO postgres;

--
-- Name: pets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    breed text NOT NULL,
    gender text,
    birthday date,
    weight numeric(5,2),
    color text,
    location text DEFAULT 'Thailand'::text,
    registration_number text,
    image_url text,
    mother_id uuid,
    father_id uuid,
    owner_id uuid,
    medical_history text,
    notes text,
    description text,
    price numeric(10,2) DEFAULT 0,
    for_sale boolean DEFAULT false,
    available boolean DEFAULT true,
    verified boolean DEFAULT false,
    airtable_id text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_public boolean DEFAULT true,
    owner_name text,
    type text,
    view_count integer DEFAULT 0,
    description_embedding public.vector(768),
    CONSTRAINT pets_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'Male'::text, 'Female'::text]))),
    CONSTRAINT pets_type_check CHECK ((type = ANY (ARRAY['dog'::text, 'cat'::text])))
);


ALTER TABLE public.pets OWNER TO postgres;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    account_type text DEFAULT 'buyer'::text,
    role text DEFAULT 'buyer'::text,
    avatar_url text,
    location text,
    phone text,
    bio text,
    verified_breeder boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    nickname text,
    level integer DEFAULT 1,
    experience_points integer DEFAULT 0,
    CONSTRAINT profiles_account_type_check CHECK ((account_type = ANY (ARRAY['breeder'::text, 'buyer'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'breeder'::text, 'buyer'::text])))
);


ALTER TABLE public.profiles OWNER TO postgres;

--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    message text,
    payload jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.user_notifications OWNER TO postgres;

--
-- Name: waiting_lists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.waiting_lists (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    match_id uuid,
    user_id uuid NOT NULL,
    contact_name text,
    contact_email text,
    contact_phone text,
    message text,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT waiting_lists_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'deposited'::text, 'completed'::text, 'cancelled'::text])))
);


ALTER TABLE public.waiting_lists OWNER TO postgres;

--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: breeding_matches breeding_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_matches
    ADD CONSTRAINT breeding_matches_pkey PRIMARY KEY (id);


--
-- Name: breeding_reservations breeding_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_reservations
    ADD CONSTRAINT breeding_reservations_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_participants chat_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_pkey PRIMARY KEY (room_id, user_id);


--
-- Name: chat_rooms chat_rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_rooms
    ADD CONSTRAINT chat_rooms_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: pet_comments pet_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_pkey PRIMARY KEY (id);


--
-- Name: pet_likes pet_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_likes
    ADD CONSTRAINT pet_likes_pkey PRIMARY KEY (pet_id, user_id);


--
-- Name: pets pets_airtable_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_airtable_id_key UNIQUE (airtable_id);


--
-- Name: pets pets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_pkey PRIMARY KEY (id);


--
-- Name: pets pets_registration_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_registration_number_key UNIQUE (registration_number);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: user_notifications user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);


--
-- Name: waiting_lists waiting_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waiting_lists
    ADD CONSTRAINT waiting_lists_pkey PRIMARY KEY (id);


--
-- Name: idx_chat_messages_room_created; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_room_created ON public.chat_messages USING btree (room_id, created_at DESC);


--
-- Name: idx_chat_messages_room_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_room_id ON public.chat_messages USING btree (room_id);


--
-- Name: idx_chat_messages_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_sender ON public.chat_messages USING btree (sender_id);


--
-- Name: idx_chat_participants_room; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_participants_room ON public.chat_participants USING btree (room_id);


--
-- Name: idx_chat_participants_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_participants_user ON public.chat_participants USING btree (user_id);


--
-- Name: idx_pets_airtable_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_airtable_id ON public.pets USING btree (airtable_id);


--
-- Name: idx_pets_breed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_breed ON public.pets USING btree (breed);


--
-- Name: idx_pets_father_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_father_id ON public.pets USING btree (father_id);


--
-- Name: idx_pets_for_sale; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_for_sale ON public.pets USING btree (for_sale) WHERE (for_sale = true);


--
-- Name: idx_pets_is_public; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_is_public ON public.pets USING btree (is_public);


--
-- Name: idx_pets_mother_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_mother_id ON public.pets USING btree (mother_id);


--
-- Name: idx_pets_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_name ON public.pets USING btree (name);


--
-- Name: idx_pets_owner_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_owner_id ON public.pets USING btree (owner_id);


--
-- Name: idx_pets_registration_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pets_registration_number ON public.pets USING btree (registration_number);


--
-- Name: pets update_pets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: breeding_matches breeding_matches_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_matches
    ADD CONSTRAINT breeding_matches_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: breeding_matches breeding_matches_dam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_matches
    ADD CONSTRAINT breeding_matches_dam_id_fkey FOREIGN KEY (dam_id) REFERENCES public.pets(id) ON DELETE SET NULL;


--
-- Name: breeding_matches breeding_matches_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_matches
    ADD CONSTRAINT breeding_matches_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: breeding_matches breeding_matches_sire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_matches
    ADD CONSTRAINT breeding_matches_sire_id_fkey FOREIGN KEY (sire_id) REFERENCES public.pets(id) ON DELETE SET NULL;


--
-- Name: breeding_reservations breeding_reservations_dam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_reservations
    ADD CONSTRAINT breeding_reservations_dam_id_fkey FOREIGN KEY (dam_id) REFERENCES public.pets(id);


--
-- Name: breeding_reservations breeding_reservations_sire_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_reservations
    ADD CONSTRAINT breeding_reservations_sire_id_fkey FOREIGN KEY (sire_id) REFERENCES public.pets(id);


--
-- Name: breeding_reservations breeding_reservations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.breeding_reservations
    ADD CONSTRAINT breeding_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_participants chat_participants_room_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.chat_rooms(id) ON DELETE CASCADE;


--
-- Name: chat_participants chat_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_participants
    ADD CONSTRAINT chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: pet_comments pet_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.pet_comments(id) ON DELETE CASCADE;


--
-- Name: pet_comments pet_comments_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_comments pet_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_comments
    ADD CONSTRAINT pet_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pet_likes pet_likes_pet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_likes
    ADD CONSTRAINT pet_likes_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES public.pets(id) ON DELETE CASCADE;


--
-- Name: pet_likes pet_likes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pet_likes
    ADD CONSTRAINT pet_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pets pets_father_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_father_id_fkey FOREIGN KEY (father_id) REFERENCES public.pets(id) ON DELETE SET NULL;


--
-- Name: pets pets_mother_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_mother_id_fkey FOREIGN KEY (mother_id) REFERENCES public.pets(id) ON DELETE SET NULL;


--
-- Name: pets pets_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pets
    ADD CONSTRAINT pets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_notifications user_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: waiting_lists waiting_lists_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.waiting_lists
    ADD CONSTRAINT waiting_lists_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.breeding_matches(id) ON DELETE CASCADE;


--
-- Name: pets Admins can delete any pet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can delete any pet" ON public.pets FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: pets Admins can update any pet; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can update any pet" ON public.pets FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: breeding_matches Admins manage matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins manage matches" ON public.breeding_matches USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text)))));


--
-- Name: breeding_reservations Admins manage reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins manage reservations" ON public.breeding_reservations USING ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text)))));


--
-- Name: admin_notifications Allow authenticated read notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated read notifications" ON public.admin_notifications FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: admin_notifications Allow authenticated update notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow authenticated update notifications" ON public.admin_notifications FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: admin_notifications Allow public insert notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert notifications" ON public.admin_notifications FOR INSERT WITH CHECK (true);


--
-- Name: breeding_reservations Allow public insert reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public insert reservations" ON public.breeding_reservations FOR INSERT WITH CHECK (true);


--
-- Name: breeding_reservations Allow public read reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Allow public read reservations" ON public.breeding_reservations FOR SELECT USING (true);


--
-- Name: breeding_matches Anyone can view approved breeding matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view approved breeding matches" ON public.breeding_matches FOR SELECT USING (((approval_status = 'approved'::text) OR (approval_status IS NULL) OR (requested_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = ANY (ARRAY[breeding_matches.sire_id, breeding_matches.dam_id])) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text))))));


--
-- Name: breeding_reservations Anyone can view reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Anyone can view reservations" ON public.breeding_reservations FOR SELECT USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = ANY (ARRAY[breeding_reservations.sire_id, breeding_reservations.dam_id])) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text))))));


--
-- Name: chat_messages Auth users manage messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Auth users manage messages" ON public.chat_messages TO authenticated USING (true);


--
-- Name: chat_participants Auth users manage participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Auth users manage participants" ON public.chat_participants TO authenticated USING (true);


--
-- Name: chat_rooms Auth users manage rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Auth users manage rooms" ON public.chat_rooms TO authenticated USING (true);


--
-- Name: pets Authenticated users can insert pets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can insert pets" ON public.pets FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: breeding_matches Breeders manage matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Breeders manage matches" ON public.breeding_matches USING (((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = breeding_matches.sire_id) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = breeding_matches.dam_id) AND (p.owner_id = auth.uid())))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = breeding_matches.sire_id) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = breeding_matches.dam_id) AND (p.owner_id = auth.uid()))))));


--
-- Name: waiting_lists Breeders update waiting lists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Breeders update waiting lists" ON public.waiting_lists FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (public.breeding_matches bm
     JOIN public.pets p ON (((p.id = bm.sire_id) OR (p.id = bm.dam_id))))
  WHERE ((bm.id = waiting_lists.match_id) AND (p.owner_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.breeding_matches bm
     JOIN public.pets p ON (((p.id = bm.sire_id) OR (p.id = bm.dam_id))))
  WHERE ((bm.id = waiting_lists.match_id) AND (p.owner_id = auth.uid())))));


--
-- Name: waiting_lists Breeders view waiting lists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Breeders view waiting lists" ON public.waiting_lists FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.breeding_matches bm
     JOIN public.pets p ON (((p.id = bm.sire_id) OR (p.id = bm.dam_id))))
  WHERE ((bm.id = waiting_lists.match_id) AND (p.owner_id = auth.uid())))));


--
-- Name: breeding_reservations Owners can update reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owners can update reservations" ON public.breeding_reservations FOR UPDATE USING (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = ANY (ARRAY[breeding_reservations.sire_id, breeding_reservations.dam_id])) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text)))))) WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = ANY (ARRAY[breeding_reservations.sire_id, breeding_reservations.dam_id])) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text))))));


--
-- Name: breeding_matches Owners can update their matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Owners can update their matches" ON public.breeding_matches FOR UPDATE USING (((requested_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = ANY (ARRAY[breeding_matches.sire_id, breeding_matches.dam_id])) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text)))))) WITH CHECK (((requested_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.pets p
  WHERE ((p.id = ANY (ARRAY[breeding_matches.sire_id, breeding_matches.dam_id])) AND (p.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.profiles pr
  WHERE ((pr.id = auth.uid()) AND (pr.role = 'admin'::text))))));


--
-- Name: conversations Participants manage conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Participants manage conversations" ON public.conversations USING (((participant1_id = auth.uid()) OR (participant2_id = auth.uid()))) WITH CHECK (((participant1_id = auth.uid()) OR (participant2_id = auth.uid())));


--
-- Name: messages Participants read messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Participants read messages" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid()))))));


--
-- Name: messages Participants send messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Participants send messages" ON public.messages FOR INSERT WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid())))))));


--
-- Name: messages Participants update messages; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Participants update messages" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversations c
  WHERE ((c.id = messages.conversation_id) AND ((c.participant1_id = auth.uid()) OR (c.participant2_id = auth.uid()))))));


--
-- Name: pets Pets are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Pets are viewable by everyone" ON public.pets FOR SELECT USING (true);


--
-- Name: breeding_matches Public Read Matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public Read Matches" ON public.breeding_matches FOR SELECT USING (true);


--
-- Name: pets Public Read Pets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public Read Pets" ON public.pets FOR SELECT USING (true);


--
-- Name: profiles Public profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


--
-- Name: pet_comments Public view comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public view comments" ON public.pet_comments FOR SELECT USING (true);


--
-- Name: pet_likes Public view likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public view likes" ON public.pet_likes FOR SELECT USING (true);


--
-- Name: user_notifications Users and Admins send notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users and Admins send notifications" ON public.user_notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: breeding_matches Users can create breeding matches; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create breeding matches" ON public.breeding_matches FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (requested_by = auth.uid())));


--
-- Name: breeding_reservations Users can create reservations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create reservations" ON public.breeding_reservations FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));


--
-- Name: pets Users can delete their own pets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own pets" ON public.pets FOR DELETE TO authenticated USING ((owner_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: pets Users can update their own pets; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own pets" ON public.pets FOR UPDATE TO authenticated USING ((owner_id = auth.uid()));


--
-- Name: pet_comments Users delete own comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users delete own comments" ON public.pet_comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_notifications Users insert notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users insert notifications" ON public.user_notifications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: waiting_lists Users manage waiting lists; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users manage waiting lists" ON public.waiting_lists USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: pet_comments Users post comments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users post comments" ON public.pet_comments FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Users read their chats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users read their chats" ON public.chat_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.chat_participants cp
  WHERE ((cp.room_id = cp.room_id) AND (cp.user_id = auth.uid())))));


--
-- Name: pet_likes Users remove likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users remove likes" ON public.pet_likes FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_messages Users send chats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users send chats" ON public.chat_messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.chat_participants cp
  WHERE ((cp.room_id = cp.room_id) AND (cp.user_id = auth.uid())))));


--
-- Name: pet_likes Users toggle likes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users toggle likes" ON public.pet_likes FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Users update message status; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users update message status" ON public.chat_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: chat_messages Users update their chats; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users update their chats" ON public.chat_messages FOR UPDATE TO authenticated USING (public.is_room_participant(room_id));


--
-- Name: user_notifications Users update their own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users update their own notifications" ON public.user_notifications FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_participants Users view chat participants; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view chat participants" ON public.chat_participants FOR SELECT TO authenticated USING (public.is_room_participant(room_id));


--
-- Name: user_notifications Users view own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view own notifications" ON public.user_notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: chat_rooms Users view their chat rooms; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view their chat rooms" ON public.chat_rooms FOR SELECT TO authenticated USING (public.is_room_participant(id));


--
-- Name: user_notifications Users view their own notifications; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users view their own notifications" ON public.user_notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: admin_notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: breeding_matches; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.breeding_matches ENABLE ROW LEVEL SECURITY;

--
-- Name: breeding_reservations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.breeding_reservations ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_participants; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_rooms; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: pet_likes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.pet_likes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: waiting_lists; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.waiting_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: TABLE admin_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.admin_notifications TO anon;
GRANT ALL ON TABLE public.admin_notifications TO authenticated;
GRANT ALL ON TABLE public.admin_notifications TO service_role;


--
-- Name: TABLE breeding_matches; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.breeding_matches TO anon;
GRANT ALL ON TABLE public.breeding_matches TO authenticated;
GRANT ALL ON TABLE public.breeding_matches TO service_role;


--
-- Name: TABLE breeding_reservations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.breeding_reservations TO anon;
GRANT ALL ON TABLE public.breeding_reservations TO authenticated;
GRANT ALL ON TABLE public.breeding_reservations TO service_role;


--
-- Name: TABLE chat_messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_messages TO anon;
GRANT ALL ON TABLE public.chat_messages TO authenticated;
GRANT ALL ON TABLE public.chat_messages TO service_role;


--
-- Name: TABLE chat_participants; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_participants TO anon;
GRANT ALL ON TABLE public.chat_participants TO authenticated;
GRANT ALL ON TABLE public.chat_participants TO service_role;


--
-- Name: TABLE chat_rooms; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_rooms TO anon;
GRANT ALL ON TABLE public.chat_rooms TO authenticated;
GRANT ALL ON TABLE public.chat_rooms TO service_role;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE pet_comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pet_comments TO anon;
GRANT ALL ON TABLE public.pet_comments TO authenticated;
GRANT ALL ON TABLE public.pet_comments TO service_role;


--
-- Name: TABLE pet_likes; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pet_likes TO anon;
GRANT ALL ON TABLE public.pet_likes TO authenticated;
GRANT ALL ON TABLE public.pet_likes TO service_role;


--
-- Name: TABLE pets; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.pets TO anon;
GRANT ALL ON TABLE public.pets TO authenticated;
GRANT ALL ON TABLE public.pets TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE user_notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_notifications TO anon;
GRANT ALL ON TABLE public.user_notifications TO authenticated;
GRANT ALL ON TABLE public.user_notifications TO service_role;


--
-- Name: TABLE waiting_lists; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.waiting_lists TO anon;
GRANT ALL ON TABLE public.waiting_lists TO authenticated;
GRANT ALL ON TABLE public.waiting_lists TO service_role;


--
-- PostgreSQL database dump complete
--

\unrestrict BDlALGTfaj8BzQZayczU0bCE5uN0b4C3AnGlZZKrhMJhEY6gxfxxcJksFvzgmyQ

