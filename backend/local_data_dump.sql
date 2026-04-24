--
-- PostgreSQL database dump
--

\restrict 8FXdL2iBhcacjboil2F8iozk99rDH8lwg5oXsNJInFwmQNZMeaarMBRgaMpRVDK

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

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
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE public.departments DISABLE TRIGGER ALL;

INSERT INTO public.departments VALUES (8, 'Conception', '', '#3b82f6', '📐', 13, '2026-04-22 11:18:57.609838+02', '2026-04-23 16:48:04.195306+02');
INSERT INTO public.departments VALUES (7, 'IT', '', '#3b82f6', '💻', 13, '2026-04-22 11:18:57.607201+02', '2026-04-23 16:48:11.387048+02');
INSERT INTO public.departments VALUES (11, 'Production', '', '#3b82f6', '🏭', 13, '2026-04-22 11:18:57.61255+02', '2026-04-23 16:48:21.482739+02');
INSERT INTO public.departments VALUES (10, 'Qualite', '', '#3b82f6', '✅', 13, '2026-04-22 11:18:57.61166+02', '2026-04-23 16:48:25.87448+02');
INSERT INTO public.departments VALUES (9, 'Logistique', '', '#3b82f6', '📦', 13, '2026-04-22 11:18:57.610788+02', '2026-04-23 17:23:08.229415+02');
INSERT INTO public.departments VALUES (12, 'Achat', '', '#3b82f6', '🛒', 20, '2026-04-22 11:18:57.613306+02', '2026-04-23 17:23:16.058772+02');


ALTER TABLE public.departments ENABLE TRIGGER ALL;

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.users DISABLE TRIGGER ALL;

INSERT INTO public.users VALUES (12, 'zahrouni.aymen@benozzi.com', 'Aymen Zahrouni', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'employee', 7, NULL, 8, true, '2026-04-22 11:18:58.018656+02', '2026-04-22 11:18:58.018656+02');
INSERT INTO public.users VALUES (13, 'oussama.dhouib@benozzi.com', 'Oussama Dhouib', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'super_admin', NULL, NULL, 8, true, '2026-04-22 11:18:58.020512+02', '2026-04-22 11:18:58.020512+02');
INSERT INTO public.users VALUES (15, 'louaybenhamda@benozzi.com', 'Louay Ben Hamda', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'employee', 7, NULL, 8, true, '2026-04-22 11:18:58.022682+02', '2026-04-22 11:18:58.022682+02');
INSERT INTO public.users VALUES (16, 'hamdi.saidi@benozzi.com', 'Hamdi Saidi', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'employee', 8, NULL, 8, true, '2026-04-22 11:18:58.023765+02', '2026-04-22 11:18:58.023765+02');
INSERT INTO public.users VALUES (17, 'aladinbenmahmoud@benozzi.com', 'Aladin Ben Mahmoud', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'employee', 9, NULL, 8, true, '2026-04-22 11:18:58.02482+02', '2026-04-22 11:18:58.02482+02');
INSERT INTO public.users VALUES (18, 'med.salah.bouagga@benozzi.com', 'Med Salah Bouagga', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'employee', 10, NULL, 8, true, '2026-04-22 11:18:58.025814+02', '2026-04-22 11:18:58.025814+02');
INSERT INTO public.users VALUES (19, 'firas.hajjem@benozzi.com', 'Firas Hajjem', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'employee', 11, NULL, 8, true, '2026-04-22 11:18:58.026826+02', '2026-04-22 11:18:58.026826+02');
INSERT INTO public.users VALUES (20, 'berradhi.riadh@benozzi.com', 'Riadh Berradhi', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'manager', 12, NULL, 8, true, '2026-04-22 11:18:58.027738+02', '2026-04-22 11:18:58.027738+02');
INSERT INTO public.users VALUES (14, 'wiem.hsairi@benozzi.com', 'Wiem Hsairi', NULL, '$2b$12$mvySAoOFUE0TSNCV/VarNu/oj.VQL1f0ouHLH0NyOOUS/WSdpK2DS', 'super_admin', 7, NULL, 8, true, '2026-04-22 11:18:58.021549+02', '2026-04-22 11:18:58.021549+02');
INSERT INTO public.users VALUES (21, 'Jebali.Nizar@benozzi.com', 'Nizar Jebali', NULL, '$2b$12$RBE3DRnDwz3EghORuTFH8OQJKnCALBdh.EVln3etgQGfqZ5.KvadG', 'employee', 11, NULL, 8, true, '2026-04-23 09:41:18.594692+02', '2026-04-23 09:41:18.594692+02');
INSERT INTO public.users VALUES (22, 'Bouslah.Souhail@benozzi.com', 'Souhail Bouslah', NULL, '$2b$12$RBE3DRnDwz3EghORuTFH8OQJKnCALBdh.EVln3etgQGfqZ5.KvadG', 'employee', 11, NULL, 8, true, '2026-04-23 09:41:18.598996+02', '2026-04-23 09:41:18.598996+02');
INSERT INTO public.users VALUES (23, 'Agerbi.Adam@benozzi.com', 'Adam Agerbi', NULL, '$2b$12$RBE3DRnDwz3EghORuTFH8OQJKnCALBdh.EVln3etgQGfqZ5.KvadG', 'employee', 11, NULL, 8, true, '2026-04-23 09:41:18.600221+02', '2026-04-23 09:41:18.600221+02');
INSERT INTO public.users VALUES (24, 'Benturkia.Marwen@benozzi.com', 'Marwen Benturkia', NULL, '$2b$12$RBE3DRnDwz3EghORuTFH8OQJKnCALBdh.EVln3etgQGfqZ5.KvadG', 'employee', 11, NULL, 8, true, '2026-04-23 09:41:18.601414+02', '2026-04-23 09:41:18.601414+02');
INSERT INTO public.users VALUES (25, 'admin@smarttask.local', 'Super Admin', NULL, '$2b$12$LJ3m4ys3hz.wF4JGRKcFNOnzH5JH5r6FO2KQb8l66IG2Rk8ByLLSe', 'super_admin', NULL, NULL, 8, true, '2026-04-24 09:52:30.17018+02', '2026-04-24 09:52:30.17018+02');


ALTER TABLE public.users ENABLE TRIGGER ALL;

--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.tasks DISABLE TRIGGER ALL;

INSERT INTO public.tasks VALUES (76, 'Add all your project', 'In New app GESTIONNE PROGETTI', 14, 12, 'in_progress', 3, 2.0, NULL, 16.66, NULL, '2026-04-24 10:14:35.88293+02', NULL, '2026-04-24 10:05:46.255935+02', '2026-04-24 10:14:35.883134+02', 7, NULL, NULL);
INSERT INTO public.tasks VALUES (77, 'Achats ', 'Fournitures bureaux ', 20, 13, 'done', 5, 2.0, '2026-04-24 13:30:00+02', 43.60, NULL, NULL, '2026-04-24 11:40:02.58808+02', '2026-04-24 11:29:19.00211+02', '2026-04-24 11:40:02.588299+02', 12, NULL, NULL);
INSERT INTO public.tasks VALUES (74, 'test--app', '', 14, 12, 'done', 5, 0.5, '2026-04-23 13:30:00+02', 43.60, NULL, '2026-04-23 12:25:57.609837+02', '2026-04-23 12:25:26.296171+02', '2026-04-23 12:25:11.660897+02', '2026-04-24 09:46:43.446959+02', 7, NULL, '2026-04-23 13:44:44.775771+02');


ALTER TABLE public.tasks ENABLE TRIGGER ALL;

--
-- Data for Name: flags; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.flags DISABLE TRIGGER ALL;

INSERT INTO public.flags VALUES (13, 76, 13, 14, 'technical', 'critical', 'open', 'Tu as fais un retard ', NULL, '2026-04-24 14:13:09.906446+02', NULL, '00:00:00', '2026-04-24 10:13:09.906633+02', NULL, NULL, 13, NULL);


ALTER TABLE public.flags ENABLE TRIGGER ALL;

--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.attachments DISABLE TRIGGER ALL;



ALTER TABLE public.attachments ENABLE TRIGGER ALL;

--
-- Data for Name: google_calendar_events; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.google_calendar_events DISABLE TRIGGER ALL;

INSERT INTO public.google_calendar_events VALUES (42, 14, 74, NULL, 'pte4db2lo1ldsrib3jdnuvuqp8', 'primary', '2026-04-23 12:25:15.476323+02');
INSERT INTO public.google_calendar_events VALUES (45, 14, 76, NULL, 'uus4uihef4othirrlclegabai0', 'primary', '2026-04-24 10:05:50.337242+02');
INSERT INTO public.google_calendar_events VALUES (46, 20, 77, NULL, '1v6h6ku0vlt0fqlod0h9ncl5r4', 'primary', '2026-04-24 11:29:23.281575+02');


ALTER TABLE public.google_calendar_events ENABLE TRIGGER ALL;

--
-- Data for Name: knowledge_base; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_base DISABLE TRIGGER ALL;



ALTER TABLE public.knowledge_base ENABLE TRIGGER ALL;

--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.notifications DISABLE TRIGGER ALL;



ALTER TABLE public.notifications ENABLE TRIGGER ALL;

--
-- Data for Name: task_dependencies; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.task_dependencies DISABLE TRIGGER ALL;



ALTER TABLE public.task_dependencies ENABLE TRIGGER ALL;

--
-- Data for Name: user_stats; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE public.user_stats DISABLE TRIGGER ALL;



ALTER TABLE public.user_stats ENABLE TRIGGER ALL;

--
-- Name: attachments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.attachments_id_seq', 13, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.departments_id_seq', 12, true);


--
-- Name: flags_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.flags_id_seq', 13, true);


--
-- Name: google_calendar_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.google_calendar_events_id_seq', 46, true);


--
-- Name: knowledge_base_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.knowledge_base_id_seq', 1, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.tasks_id_seq', 77, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 538, true);


--
-- PostgreSQL database dump complete
--

\unrestrict 8FXdL2iBhcacjboil2F8iozk99rDH8lwg5oXsNJInFwmQNZMeaarMBRgaMpRVDK

