--
-- PostgreSQL database dump
--

\restrict jqOw6fj2VR3HhGQ1Isv8ScVfeCQ0G2zsLrDCIbXNiw0YpwmaLX9iKjvJm11GKUJ

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

--
-- Data for Name: admin_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.admin_notifications VALUES ('74163764-7cdd-49df-b0d9-ac4a4ad5d00a', 'new_pet', 'New Pet Registered via App', 'OSTEN TRD "PETCH MANEE" wit (Thai Ridgeback Dog) added by user.', 'e923e6f4-aac0-4b7c-846a-1e9e9b99259f', 'read', '2026-01-04 16:33:31.796851+00', '2026-01-04 16:33:31.796851+00');
INSERT INTO public.admin_notifications VALUES ('062fe21f-6d4c-4af4-84b9-7f6176c10ea6', 'new_pet', 'New Pet Registered via App', 'i THAI RIDGEBACK DOG in (Thai Ridgeback Dog) added by user.', '4beeee65-a9bd-49dc-b9e6-4dc3737d50e8', 'read', '2026-01-04 17:07:57.961814+00', '2026-01-04 17:07:57.961814+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.profiles VALUES ('6c8b31bd-9262-4591-a47f-d51e86369be5', 'geowahaha@gmail.com', 'Geo, Let''s go', 'buyer', 'admin', NULL, NULL, NULL, NULL, false, '2026-01-03 15:53:59.755837+00', '2026-01-03 15:53:59.755837+00', NULL, 1, 0);
INSERT INTO public.profiles VALUES ('911dfe6f-6c3d-4535-8838-859d31eae53a', 'truesaveus@hotmail.com', 'Tawat Talpolkrang', 'buyer', 'admin', NULL, NULL, NULL, NULL, false, '2026-01-03 15:53:59.755837+00', '2026-01-03 15:53:59.755837+00', NULL, 1, 0);
INSERT INTO public.profiles VALUES ('232e2767-77b9-433d-a1af-5b2eea70b289', 'truesaveus2010@gmail.com', 'Tawat Tal.', 'buyer', 'buyer', NULL, NULL, NULL, NULL, false, '2026-01-03 15:56:10.27253+00', '2026-01-03 15:56:10.27253+00', NULL, 1, 0);


--
-- Data for Name: breeding_matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.breeding_matches VALUES ('587d34ac-e9de-47c7-9c2d-6944166a2936', '7ab25988-2461-45ee-9ecc-b85e6578562a', 'f8a83cf2-e581-48a7-b9a4-c09103ce9c79', '2026-09-09', '2026-11-11', 'planned', 'เป็นคู่ที่เหมาะสม ให้ลูกสวย', '2026-01-07 15:53:33.812667+00', '2026-01-07 15:53:33.812667+00', NULL, 'approved', NULL, NULL);
INSERT INTO public.breeding_matches VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'cc3f5922-9318-4687-aafe-494ca9859658', '279979cc-43aa-41ac-9dd7-32b2d8742277', '2026-01-04', '2026-03-08', 'failed', NULL, '2026-01-04 08:34:07.425413+00', '2026-01-04 08:34:07.425413+00', NULL, 'approved', NULL, NULL);
INSERT INTO public.breeding_matches VALUES ('c407f2b1-65fa-40a4-b551-3e951cc7aa61', '7ab25988-2461-45ee-9ecc-b85e6578562a', '0e995915-e753-4f7b-901b-85c72aff665f', '2026-12-09', '2027-02-10', 'planned', 'waiting to confirm with owner', '2026-01-07 18:15:39.936895+00', '2026-01-07 18:15:39.936895+00', NULL, 'approved', NULL, NULL);


--
-- Data for Name: breeding_reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.breeding_reservations VALUES ('2a5a21e7-129c-4d01-af72-4110f84a519b', 'cc3f5922-9318-4687-aafe-494ca9859658', '4e682f69-4bbc-40a5-b574-94dff8f2fe27', '0894287999', 'interesting now', 'pending', '2026-01-04 10:36:51.962839+00', '2026-01-04 10:36:51.962839+00', NULL);
INSERT INTO public.breeding_reservations VALUES ('8ec516a8-9ae5-476a-b58c-f42aa8c1f617', '76f48def-d3a8-41ee-b3ec-32b4ca439737', 'fac398de-ed50-4d10-b102-dcb2b62d90b7', 'tawttt georgeo', 'จอง', 'pending', '2026-01-04 10:37:52.754633+00', '2026-01-04 10:37:52.754633+00', NULL);
INSERT INTO public.breeding_reservations VALUES ('b7b7d2a6-de96-4d21-a36c-7b1403cecce7', '7ab25988-2461-45ee-9ecc-b85e6578562a', 'f8a83cf2-e581-48a7-b9a4-c09103ce9c79', '0894287999', 'จอง 2 ตัว', 'pending', '2026-01-07 15:54:13.040987+00', '2026-01-07 15:54:13.040987+00', NULL);


--
-- Data for Name: chat_rooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.chat_rooms VALUES ('f38e8f7a-847d-4a8d-ab54-b10e9d433e1d', '2026-01-05 04:10:36.841173+00', '2026-01-05 04:10:36.841173+00');
INSERT INTO public.chat_rooms VALUES ('a48f1a33-a142-4cd7-a06d-f419c415bb50', '2026-01-05 04:24:51.489057+00', '2026-01-05 04:24:51.489057+00');
INSERT INTO public.chat_rooms VALUES ('c33a9836-3407-4553-9bd1-1c60dab06350', '2026-01-05 06:20:58.607198+00', '2026-01-05 06:20:58.607198+00');
INSERT INTO public.chat_rooms VALUES ('84f57b3a-0fd0-47e9-9ffb-27be991f9a23', '2026-01-05 06:35:29.622452+00', '2026-01-05 06:35:29.622452+00');
INSERT INTO public.chat_rooms VALUES ('fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '2026-01-05 06:36:06.853497+00', '2026-01-05 06:36:06.853497+00');
INSERT INTO public.chat_rooms VALUES ('1080817f-63d8-41ad-bcf6-f4f8df3a78a2', '2026-01-05 08:50:33.740112+00', '2026-01-05 08:50:33.740112+00');
INSERT INTO public.chat_rooms VALUES ('dbb94f49-296e-4258-837a-8b7513956263', '2026-01-05 09:30:04.998514+00', '2026-01-05 09:30:04.998514+00');
INSERT INTO public.chat_rooms VALUES ('7d22ae15-f876-45d6-9067-16459ce9078a', '2026-01-05 10:35:15.409905+00', '2026-01-05 10:35:15.409905+00');
INSERT INTO public.chat_rooms VALUES ('b596f9b4-c4ab-443b-a89e-a21e326bb6c7', '2026-01-05 14:03:29.885791+00', '2026-01-05 14:03:29.885791+00');
INSERT INTO public.chat_rooms VALUES ('e0b6ab8f-25c4-493d-b144-c42d9be16496', '2026-01-05 14:04:29.844877+00', '2026-01-05 14:04:29.844877+00');
INSERT INTO public.chat_rooms VALUES ('e9874cf3-9367-4221-b1b0-2248cdc4a834', '2026-01-05 14:04:33.82923+00', '2026-01-05 14:04:33.82923+00');
INSERT INTO public.chat_rooms VALUES ('7504d9a5-75f6-4afa-8452-3b8542b8f08e', '2026-01-05 16:42:49.561646+00', '2026-01-05 16:42:49.561646+00');
INSERT INTO public.chat_rooms VALUES ('74472952-7837-4ac9-a361-17216641ec70', '2026-01-05 17:27:33.441781+00', '2026-01-05 17:27:33.441781+00');
INSERT INTO public.chat_rooms VALUES ('d8c219e9-ab5b-43bd-9a16-784d7b04302a', '2026-01-05 17:27:34.808115+00', '2026-01-05 17:27:34.808115+00');
INSERT INTO public.chat_rooms VALUES ('0f14c137-7f0d-420a-90d1-b6a47d365500', '2026-01-05 17:27:36.286183+00', '2026-01-05 17:27:36.286183+00');
INSERT INTO public.chat_rooms VALUES ('b869e4a3-21a9-43f1-8f8b-e9db31d45b1f', '2026-01-05 18:03:18.493874+00', '2026-01-05 18:03:18.493874+00');
INSERT INTO public.chat_rooms VALUES ('47c06dfb-cb49-46c3-97a4-ad1cbe8d79ec', '2026-01-05 19:16:51.909085+00', '2026-01-05 19:16:51.909085+00');
INSERT INTO public.chat_rooms VALUES ('adb15e56-0584-41c8-ba3c-d9594aa431da', '2026-01-06 04:09:27.681992+00', '2026-01-06 04:09:27.681992+00');


--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.chat_messages VALUES ('27e8b5a3-77fe-4a8b-959e-bec625598749', 'c33a9836-3407-4553-9bd1-1c60dab06350', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'hi test from Geo', false, '2026-01-05 06:21:15.619433+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('4bc1a429-2779-4cf9-bff2-7a413ccac99a', 'c33a9836-3407-4553-9bd1-1c60dab06350', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'why the previous message not appeared here', false, '2026-01-05 06:22:09.913783+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('87de3262-be0c-4806-91a4-e3f18a6df067', '84f57b3a-0fd0-47e9-9ffb-27be991f9a23', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'hi', false, '2026-01-05 06:35:34.072715+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('dcc08863-3409-4d41-81f1-b456c949f73a', 'fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'test message', false, '2026-01-05 06:36:13.675574+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('616fb415-082f-4427-a13a-749fa683b828', 'fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'i want to know the date of puppy', false, '2026-01-05 06:48:45.800694+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('6181218d-0aea-4212-842f-08493ec6e0aa', 'fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'ขอทราบราคาด้วยครับ', false, '2026-01-05 06:48:57.163895+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('fd8a25b6-8442-4512-977a-0daa4ff2c44d', 'fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'สวัสดีครับ', false, '2026-01-05 08:23:06.744465+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('55b2fa9f-0229-4ac0-8d13-761af577c4af', 'fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'น้องหมายังไม่คลอดครับ ถ้าคลอดแล้วจะแจ้งนะอีกทีนะครับ รออัพเดตในแอพเลยครับ', false, '2026-01-05 08:23:49.038168+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('f4f2fb95-9707-4e93-9ac6-000f3d6ae1e7', '1080817f-63d8-41ad-bcf6-f4f8df3a78a2', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'helo i want to know about puppy this dog', false, '2026-01-05 08:50:58.36689+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('8dcb705b-01a0-463c-8ff1-1aa90114e351', '1080817f-63d8-41ad-bcf6-f4f8df3a78a2', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'what the dog you mentioned ', false, '2026-01-05 08:53:15.533664+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('485b7da8-6ef8-4a89-8223-c291da5378d3', '1080817f-63d8-41ad-bcf6-f4f8df3a78a2', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'i forgot it ehat dog', false, '2026-01-05 09:28:37.837738+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('32a380d5-9cf0-434b-a186-d4d78edcb21a', 'dbb94f49-296e-4258-837a-8b7513956263', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in บุญพิง BOONPING.', false, '2026-01-05 09:30:05.861373+00', 'pet_card', '{"petId": "f7a26744-bdc2-4813-a4b7-b94c60336bb7", "petName": "บุญพิง BOONPING", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('d92432b1-e8a0-47a1-8f3d-e3cdfdff8698', 'dbb94f49-296e-4258-837a-8b7513956263', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'hi ฉันสนใจลูกตัวนี้', false, '2026-01-05 09:30:34.935197+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('d118c286-ad28-487b-852d-3adab3c0d078', '7d22ae15-f876-45d6-9067-16459ce9078a', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'Hi! I''m interested in KAKAO (กาเกา).', false, '2026-01-05 10:35:16.334316+00', 'pet_card', '{"petId": "7ab25988-2461-45ee-9ecc-b85e6578562a", "petName": "KAKAO (กาเกา)", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('e2bd508d-9b3d-4e7d-888c-d05789b4c5de', '7d22ae15-f876-45d6-9067-16459ce9078a', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'yes', false, '2026-01-05 10:35:58.640692+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('4218e7b6-e68b-4bda-8c75-c1e1cffbaf7c', '7d22ae15-f876-45d6-9067-16459ce9078a', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'good', false, '2026-01-05 10:51:50.856508+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('dbcaf872-5d52-4732-8aee-36a9cec27c96', '7504d9a5-75f6-4afa-8452-3b8542b8f08e', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in บุญนำ.', false, '2026-01-05 16:42:50.427566+00', 'pet_card', '{"petId": "279979cc-43aa-41ac-9dd7-32b2d8742277", "petName": "บุญนำ", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('5fd82949-a56d-40ae-95b7-7d118aabd4ef', '7504d9a5-75f6-4afa-8452-3b8542b8f08e', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'สนใจลูกตัวนี้', false, '2026-01-05 16:43:16.35842+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('9a5eba3a-9376-4ba6-86f4-fbe031452ecb', '74472952-7837-4ac9-a361-17216641ec70', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in KAKAO (กาเกา).', false, '2026-01-05 17:27:34.412666+00', 'pet_card', '{"petId": "7ab25988-2461-45ee-9ecc-b85e6578562a", "petName": "KAKAO (กาเกา)", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('fd418945-13bc-4a59-8b74-6cb860ccd385', 'd8c219e9-ab5b-43bd-9a16-784d7b04302a', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in KAKAO (กาเกา).', false, '2026-01-05 17:27:36.283966+00', 'pet_card', '{"petId": "7ab25988-2461-45ee-9ecc-b85e6578562a", "petName": "KAKAO (กาเกา)", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('4fa44338-85e4-4d4b-94e2-f11cfa51afac', '0f14c137-7f0d-420a-90d1-b6a47d365500', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in KAKAO (กาเกา).', false, '2026-01-05 17:27:37.591687+00', 'pet_card', '{"petId": "7ab25988-2461-45ee-9ecc-b85e6578562a", "petName": "KAKAO (กาเกา)", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('37420966-8ccb-4ac0-bd9f-836d8aa00e44', 'b869e4a3-21a9-43f1-8f8b-e9db31d45b1f', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in KAKAO (กาเกา).', false, '2026-01-05 18:03:19.570018+00', 'pet_card', '{"petId": "7ab25988-2461-45ee-9ecc-b85e6578562a", "petName": "KAKAO (กาเกา)", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('cb90c648-7173-45c9-b43c-fd9ba78e935b', '47c06dfb-cb49-46c3-97a4-ad1cbe8d79ec', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in บุญนำ.', false, '2026-01-05 19:16:52.761446+00', 'pet_card', '{"petId": "279979cc-43aa-41ac-9dd7-32b2d8742277", "petName": "บุญนำ", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('d82000e7-9cd8-4b9f-8120-4acf72aff02e', 'adb15e56-0584-41c8-ba3c-d9594aa431da', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Hi! I''m interested in KAKAO (กาเกา).', false, '2026-01-06 04:09:28.53558+00', 'pet_card', '{"petId": "7ab25988-2461-45ee-9ecc-b85e6578562a", "petName": "KAKAO (กาเกา)", "petBreed": "Thai Ridgeback Dog"}');
INSERT INTO public.chat_messages VALUES ('d981ab6c-5676-4e37-b10e-eea5b0e2298b', 'adb15e56-0584-41c8-ba3c-d9594aa431da', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'hi do you have ne puppy', false, '2026-01-06 04:09:57.31866+00', 'text', '{}');
INSERT INTO public.chat_messages VALUES ('f613bc72-35fc-4fc8-9c81-ac69d7b50f11', 'adb15e56-0584-41c8-ba3c-d9594aa431da', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'not now', false, '2026-01-06 04:11:41.422144+00', 'text', '{}');


--
-- Data for Name: chat_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.chat_participants VALUES ('c33a9836-3407-4553-9bd1-1c60dab06350', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('c33a9836-3407-4553-9bd1-1c60dab06350', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('84f57b3a-0fd0-47e9-9ffb-27be991f9a23', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('84f57b3a-0fd0-47e9-9ffb-27be991f9a23', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('fb3518b4-0cfc-441f-bd35-40d9d01e8afb', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('1080817f-63d8-41ad-bcf6-f4f8df3a78a2', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('1080817f-63d8-41ad-bcf6-f4f8df3a78a2', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('dbb94f49-296e-4258-837a-8b7513956263', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('dbb94f49-296e-4258-837a-8b7513956263', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('7d22ae15-f876-45d6-9067-16459ce9078a', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('7d22ae15-f876-45d6-9067-16459ce9078a', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('7504d9a5-75f6-4afa-8452-3b8542b8f08e', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('7504d9a5-75f6-4afa-8452-3b8542b8f08e', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('74472952-7837-4ac9-a361-17216641ec70', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('74472952-7837-4ac9-a361-17216641ec70', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('d8c219e9-ab5b-43bd-9a16-784d7b04302a', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('d8c219e9-ab5b-43bd-9a16-784d7b04302a', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('0f14c137-7f0d-420a-90d1-b6a47d365500', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('0f14c137-7f0d-420a-90d1-b6a47d365500', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('b869e4a3-21a9-43f1-8f8b-e9db31d45b1f', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('b869e4a3-21a9-43f1-8f8b-e9db31d45b1f', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('47c06dfb-cb49-46c3-97a4-ad1cbe8d79ec', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('47c06dfb-cb49-46c3-97a4-ad1cbe8d79ec', '6c8b31bd-9262-4591-a47f-d51e86369be5');
INSERT INTO public.chat_participants VALUES ('adb15e56-0584-41c8-ba3c-d9594aa431da', '911dfe6f-6c3d-4535-8838-859d31eae53a');
INSERT INTO public.chat_participants VALUES ('adb15e56-0584-41c8-ba3c-d9594aa431da', '6c8b31bd-9262-4591-a47f-d51e86369be5');


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pet_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pet_comments VALUES ('debc229e-7dfb-45c8-ae58-b1bd84ec5066', '279979cc-43aa-41ac-9dd7-32b2d8742277', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'test', NULL, '2026-01-05 10:46:09.217271+00');
INSERT INTO public.pet_comments VALUES ('a96fe012-6850-407d-94ce-7e74771db1e3', '279979cc-43aa-41ac-9dd7-32b2d8742277', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'สวัสดีครับ', NULL, '2026-01-05 14:03:15.874347+00');
INSERT INTO public.pet_comments VALUES ('11c02596-20c0-4871-be5f-23453371e7d5', '279979cc-43aa-41ac-9dd7-32b2d8742277', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'test', NULL, '2026-01-05 16:42:31.154986+00');
INSERT INTO public.pet_comments VALUES ('32c38dca-a425-4732-a083-63933c2892e5', '7ab25988-2461-45ee-9ecc-b85e6578562a', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'สุดหล่อ', NULL, '2026-01-05 17:01:15.736997+00');
INSERT INTO public.pet_comments VALUES ('95793cc7-a407-415e-9705-3115055b1bc6', '3f894d3c-2fc2-4de6-83fd-3753603c57d0', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'หล่อมาก', NULL, '2026-01-05 18:21:39.599959+00');
INSERT INTO public.pet_comments VALUES ('c5f58d20-bd46-484f-a019-2e045270d543', '45739593-3f22-485b-90d7-a89bcd9a3aca', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'ตำนานแม่มะนาว ลูกขวัญเพชร+แสงจันทร์', NULL, '2026-01-06 02:04:49.063334+00');
INSERT INTO public.pet_comments VALUES ('59fa621e-d1d7-4758-b6df-19d302a845f3', '7ab25988-2461-45ee-9ecc-b85e6578562a', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'หล่อมาก', NULL, '2026-01-06 04:04:32.716499+00');
INSERT INTO public.pet_comments VALUES ('6d032995-a227-416c-95a7-f2691d5363b8', '3f894d3c-2fc2-4de6-83fd-3753603c57d0', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'Very cute dog', NULL, '2026-01-06 08:12:42.803972+00');
INSERT INTO public.pet_comments VALUES ('7341d4f2-b25e-487a-b943-dbce33f484cb', '7ab25988-2461-45ee-9ecc-b85e6578562a', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'กาเกาเกิดวันที่เท่าไร', NULL, '2026-01-06 08:17:42.934468+00');
INSERT INTO public.pet_comments VALUES ('1ae6e701-599d-4c83-a82a-15bc0760d6df', '279979cc-43aa-41ac-9dd7-32b2d8742277', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'Cute dog!', NULL, '2026-01-06 10:17:49.09132+00');
INSERT INTO public.pet_comments VALUES ('5013a788-ab6a-41da-a929-71c099dad6f1', '279979cc-43aa-41ac-9dd7-32b2d8742277', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'Show me puppies', NULL, '2026-01-06 10:33:16.927841+00');
INSERT INTO public.pet_comments VALUES ('e8697c06-137e-46e9-82f8-e15bde6de6eb', '279979cc-43aa-41ac-9dd7-32b2d8742277', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'Show me puppie', NULL, '2026-01-06 10:35:58.372271+00');
INSERT INTO public.pet_comments VALUES ('e48434cc-cf9b-44f5-8a49-f2190007dfac', '279979cc-43aa-41ac-9dd7-32b2d8742277', '6c8b31bd-9262-4591-a47f-d51e86369be5', '/debug', NULL, '2026-01-06 12:52:39.044282+00');
INSERT INTO public.pet_comments VALUES ('64be7e20-048a-49d1-8ff9-595c0f56178a', 'cc3f5922-9318-4687-aafe-494ca9859658', '6c8b31bd-9262-4591-a47f-d51e86369be5', '้ai', NULL, '2026-01-06 13:03:02.577926+00');
INSERT INTO public.pet_comments VALUES ('0a04443c-c592-4f0e-9f83-6cfa9dcb356f', '279979cc-43aa-41ac-9dd7-32b2d8742277', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'Show me the family tree', NULL, '2026-01-06 13:23:46.408+00');
INSERT INTO public.pet_comments VALUES ('d08f1123-7ee3-4b17-8176-5af12ceafc97', '7ab25988-2461-45ee-9ecc-b85e6578562a', '6c8b31bd-9262-4591-a47f-d51e86369be5', '?', NULL, '2026-01-07 02:41:28.591957+00');
INSERT INTO public.pet_comments VALUES ('fd26fc47-0cb5-4a69-8e4a-6ba76c511c81', 'f7a26744-bdc2-4813-a4b7-b94c60336bb7', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'ใบทะเบียน', NULL, '2026-01-07 12:03:07.064514+00');


--
-- Data for Name: pet_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.pet_likes VALUES ('279979cc-43aa-41ac-9dd7-32b2d8742277', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 14:03:25.218946+00');
INSERT INTO public.pet_likes VALUES ('fac398de-ed50-4d10-b102-dcb2b62d90b7', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 16:44:18.755233+00');
INSERT INTO public.pet_likes VALUES ('7ab25988-2461-45ee-9ecc-b85e6578562a', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 17:01:02.055889+00');
INSERT INTO public.pet_likes VALUES ('9e6b63b2-f562-43cc-816b-226e1a990c60', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 18:08:45.355693+00');
INSERT INTO public.pet_likes VALUES ('cc3f5922-9318-4687-aafe-494ca9859658', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 18:26:29.239723+00');
INSERT INTO public.pet_likes VALUES ('3f894d3c-2fc2-4de6-83fd-3753603c57d0', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 18:35:34.785811+00');
INSERT INTO public.pet_likes VALUES ('3f894d3c-2fc2-4de6-83fd-3753603c57d0', '6c8b31bd-9262-4591-a47f-d51e86369be5', '2026-01-05 19:08:35.28913+00');
INSERT INTO public.pet_likes VALUES ('89744303-9881-48d3-93c4-b2ae4dad1db1', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-05 19:31:39.983416+00');
INSERT INTO public.pet_likes VALUES ('45739593-3f22-485b-90d7-a89bcd9a3aca', '911dfe6f-6c3d-4535-8838-859d31eae53a', '2026-01-06 02:04:02.970427+00');
INSERT INTO public.pet_likes VALUES ('7ab25988-2461-45ee-9ecc-b85e6578562a', '6c8b31bd-9262-4591-a47f-d51e86369be5', '2026-01-06 04:04:48.129402+00');
INSERT INTO public.pet_likes VALUES ('279979cc-43aa-41ac-9dd7-32b2d8742277', '6c8b31bd-9262-4591-a47f-d51e86369be5', '2026-01-06 06:52:51.546144+00');
INSERT INTO public.pet_likes VALUES ('cc3f5922-9318-4687-aafe-494ca9859658', '6c8b31bd-9262-4591-a47f-d51e86369be5', '2026-01-07 15:26:22.807698+00');


--
-- Data for Name: user_notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.user_notifications VALUES ('530e76fa-66de-474f-949f-b1b56d3034e4', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'New Message', 'You have a new message: what the dog you mentioned ', '{"room_id": "1080817f-63d8-41ad-bcf6-f4f8df3a78a2"}', true, '2026-01-05 08:53:16.102728+00');
INSERT INTO public.user_notifications VALUES ('225f0c8d-42d7-4c82-a948-4a0e03fb71cb', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'New Message', 'You have a new message: ขอทราบราคาด้วยครับ', '{"room_id": "fb3518b4-0cfc-441f-bd35-40d9d01e8afb"}', true, '2026-01-05 06:48:57.740283+00');
INSERT INTO public.user_notifications VALUES ('ad9f25fc-bc6d-4e1f-97ec-f503066aa4db', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'New Message', 'You have a new message: i want to know the date of pup...', '{"room_id": "fb3518b4-0cfc-441f-bd35-40d9d01e8afb"}', true, '2026-01-05 06:48:46.525416+00');
INSERT INTO public.user_notifications VALUES ('0e660865-2010-47dd-b57a-81cb1b4cc9f2', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'New Message', 'You have a new message: test message', '{"room_id": "fb3518b4-0cfc-441f-bd35-40d9d01e8afb"}', true, '2026-01-05 06:36:14.232136+00');
INSERT INTO public.user_notifications VALUES ('f25327a2-b42f-4621-9a85-3d1127f65c04', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'New Message', 'You have a new message: hi', '{"room_id": "84f57b3a-0fd0-47e9-9ffb-27be991f9a23"}', true, '2026-01-05 06:35:34.658256+00');
INSERT INTO public.user_notifications VALUES ('69747b85-d8de-4871-98b7-91f86f301132', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'You have a new message: hi ฉันสนใจลูกตัวนี้', '{"room_id": "dbb94f49-296e-4258-837a-8b7513956263"}', true, '2026-01-05 09:30:35.442799+00');
INSERT INTO public.user_notifications VALUES ('7ed089b6-ee35-4e3e-bbfe-061ded48e879', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'social_comment', 'New Comment', 'Someone commented on KAKAO (กาเกา)', '{"pet_id": "7ab25988-2461-45ee-9ecc-b85e6578562a"}', true, '2026-01-05 10:38:50.073241+00');
INSERT INTO public.user_notifications VALUES ('4f4ae694-c3dd-4043-b66b-8fd74bf08a27', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'Geo, Let''s go', 'You have a new message: yes', '{"room_id": "7d22ae15-f876-45d6-9067-16459ce9078a"}', true, '2026-01-05 10:35:59.179349+00');
INSERT INTO public.user_notifications VALUES ('7e251ae8-b2ff-4a57-8a1c-c276498f3097', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'Geo, Let''s go', 'Sent a pet inquiry: KAKAO (กาเกา)', '{"room_id": "7d22ae15-f876-45d6-9067-16459ce9078a"}', true, '2026-01-05 10:35:16.967266+00');
INSERT INTO public.user_notifications VALUES ('4302a4f3-9e1d-47a2-a59b-d5b502e18858', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'social_comment', 'New Comment', 'Someone commented on KAKAO (กาเกา)', '{"pet_id": "7ab25988-2461-45ee-9ecc-b85e6578562a"}', true, '2026-01-05 10:34:29.046509+00');
INSERT INTO public.user_notifications VALUES ('6c649aa3-379f-4b9c-a5d7-fa7861f82fff', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: KAKAO (กาเกา)', '{"room_id": "b869e4a3-21a9-43f1-8f8b-e9db31d45b1f"}', true, '2026-01-05 18:03:20.30168+00');
INSERT INTO public.user_notifications VALUES ('d8b0453d-876d-4f27-ac25-467675085497', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'You have a new message: hi do you have ne puppy', '{"room_id": "adb15e56-0584-41c8-ba3c-d9594aa431da"}', true, '2026-01-06 04:09:57.836487+00');
INSERT INTO public.user_notifications VALUES ('82adb86e-af5e-4b62-b115-960cc9297233', '911dfe6f-6c3d-4535-8838-859d31eae53a', 'chat_message', 'Geo, Let''s go', 'You have a new message: not now', '{"room_id": "adb15e56-0584-41c8-ba3c-d9594aa431da"}', true, '2026-01-06 04:11:41.92348+00');
INSERT INTO public.user_notifications VALUES ('148ef1ca-985d-4830-9332-3774b6acf49c', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: KAKAO (กาเกา)', '{"room_id": "adb15e56-0584-41c8-ba3c-d9594aa431da"}', true, '2026-01-06 04:09:29.12024+00');
INSERT INTO public.user_notifications VALUES ('51defd92-cfb7-4f8b-9bc2-4b8097f343da', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: บุญนำ', '{"room_id": "47c06dfb-cb49-46c3-97a4-ad1cbe8d79ec"}', true, '2026-01-05 19:16:53.40544+00');
INSERT INTO public.user_notifications VALUES ('67d05eac-0ffd-4628-8e04-f9a14ce443f3', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'New Message', 'You have a new message: สวัสดีครับ', '{"room_id": "fb3518b4-0cfc-441f-bd35-40d9d01e8afb"}', true, '2026-01-05 08:23:07.305653+00');
INSERT INTO public.user_notifications VALUES ('02440fbe-fed9-4bba-96b1-adf892094853', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: KAKAO (กาเกา)', '{"room_id": "0f14c137-7f0d-420a-90d1-b6a47d365500"}', true, '2026-01-05 17:27:38.317451+00');
INSERT INTO public.user_notifications VALUES ('52a6e555-4a6c-4e0a-b3ba-fb5e6c9a9b70', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: KAKAO (กาเกา)', '{"room_id": "d8c219e9-ab5b-43bd-9a16-784d7b04302a"}', true, '2026-01-05 17:27:36.926318+00');
INSERT INTO public.user_notifications VALUES ('d7f7662a-b9ea-455e-88c0-8a4283a4b1cd', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: KAKAO (กาเกา)', '{"room_id": "74472952-7837-4ac9-a361-17216641ec70"}', true, '2026-01-05 17:27:35.202657+00');
INSERT INTO public.user_notifications VALUES ('419f0454-700c-4371-994a-4f73ab7927fe', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'You have a new message: สนใจลูกตัวนี้', '{"room_id": "7504d9a5-75f6-4afa-8452-3b8542b8f08e"}', true, '2026-01-05 16:43:16.87564+00');
INSERT INTO public.user_notifications VALUES ('6f295ff9-aabc-449d-8aaf-e2167cfad82d', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: บุญนำ', '{"room_id": "7504d9a5-75f6-4afa-8452-3b8542b8f08e"}', true, '2026-01-05 16:42:51.105624+00');
INSERT INTO public.user_notifications VALUES ('e8d8ae5f-2cfe-4980-9a1c-4d1c9780b75b', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'You have a new message: good', '{"room_id": "7d22ae15-f876-45d6-9067-16459ce9078a"}', true, '2026-01-05 10:51:51.582598+00');
INSERT INTO public.user_notifications VALUES ('bee5d8de-facb-4864-b10d-321055e40da9', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'Sent a pet inquiry: บุญพิง BOONPING', '{"room_id": "dbb94f49-296e-4258-837a-8b7513956263"}', true, '2026-01-05 09:30:06.712226+00');
INSERT INTO public.user_notifications VALUES ('eab45bf1-3921-43ff-93eb-8bd9c96230cd', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'Tawat Talpolkrang', 'You have a new message: i forgot it ehat dog', '{"room_id": "1080817f-63d8-41ad-bcf6-f4f8df3a78a2"}', true, '2026-01-05 09:28:38.404649+00');
INSERT INTO public.user_notifications VALUES ('8860d189-4979-4c88-a730-39ca54ae66dd', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'New Message', 'You have a new message: helo i want to know about pupp...', '{"room_id": "1080817f-63d8-41ad-bcf6-f4f8df3a78a2"}', true, '2026-01-05 08:50:58.911773+00');
INSERT INTO public.user_notifications VALUES ('d93c0f7d-8c97-44d7-9261-30aa3b9e72de', '6c8b31bd-9262-4591-a47f-d51e86369be5', 'chat_message', 'New Message', 'You have a new message: น้องหมายังไม่คลอดครับ ถ้าคลอดแ...', '{"room_id": "fb3518b4-0cfc-441f-bd35-40d9d01e8afb"}', true, '2026-01-05 08:23:49.595696+00');


--
-- Data for Name: waiting_lists; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- PostgreSQL database dump complete
--

\unrestrict jqOw6fj2VR3HhGQ1Isv8ScVfeCQ0G2zsLrDCIbXNiw0YpwmaLX9iKjvJm11GKUJ

