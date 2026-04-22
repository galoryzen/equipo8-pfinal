-- =============================================
-- TravelHub — Seed Data
-- =============================================

BEGIN;

-- ── users.users ─────────────────────────────────────────
-- All seed users share the dev password: "travelhub"
-- Travelers
INSERT INTO users.users (id, full_name, email, phone, role, country_code, password) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Carlos García',    'carlos@example.com',   '+5215512345678', 'TRAVELER', 'MX', crypt('travelhub', gen_salt('bf'))::bytea),
  ('a0000000-0000-0000-0000-000000000002', 'María López',      'maria@example.com',    '+573001234567',  'TRAVELER', 'CO', crypt('travelhub', gen_salt('bf'))::bytea),
  ('a0000000-0000-0000-0000-000000000003', 'Lucía Fernández',  'lucia@example.com',    '+5491123456789', 'TRAVELER', 'AR', crypt('travelhub', gen_salt('bf'))::bytea),
  ('a0000000-0000-0000-0000-000000000004', 'Pablo Ruiz',       'pablo@example.com',    '+34612345678',   'TRAVELER', 'ES', crypt('travelhub', gen_salt('bf'))::bytea),
  ('a0000000-0000-0000-0000-000000000005', 'Emily Johnson',    'emily@example.com',    '+12025551234',   'TRAVELER', 'US', crypt('travelhub', gen_salt('bf'))::bytea);

-- Hotel managers
INSERT INTO users.users (id, full_name, email, phone, role, country_code, password) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'Roberto Sol',      'roberto@cadenadelsol.com',  '+5215598761234', 'HOTEL', 'MX', crypt('travelhub', gen_salt('bf'))::bytea),
  ('b0000000-0000-0000-0000-000000000002', 'Andrea Luna',      'andrea@hotelesluna.com',    '+573009876543',  'HOTEL', 'CO', crypt('travelhub', gen_salt('bf'))::bytea),
  ('b0000000-0000-0000-0000-000000000003', 'Javier Estrella',  'javier@grupoestrella.com',  '+34698765432',   'HOTEL', 'ES', crypt('travelhub', gen_salt('bf'))::bytea);

-- Agency user
INSERT INTO users.users (id, full_name, email, phone, role, country_code, password) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Diana Viajes',     'diana@viajesexpress.com',   '+5215534567890', 'AGENCY', 'MX', crypt('travelhub', gen_salt('bf'))::bytea);

-- Admin
INSERT INTO users.users (id, full_name, email, phone, role, country_code, password) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Admin TravelHub',  'admin@travelhub.com',       NULL,             'ADMIN',  NULL, crypt('travelhub', gen_salt('bf'))::bytea);

-- ── users.hotel ─────────────────────────────────────────
INSERT INTO users.hotel (id, name, tax_id, status) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Cadena del Sol',   'CSOL850101AAA', 'ACTIVE'),
  ('e0000000-0000-0000-0000-000000000002', 'Hoteles Luna',     'HLUN900215BBB', 'ACTIVE'),
  ('e0000000-0000-0000-0000-000000000003', 'Grupo Estrella',   'GEST880430CCC', 'ACTIVE');

-- ── users.hotel_user ────────────────────────────────────
INSERT INTO users.hotel_user (id, hotel_id, user_id) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003');

-- ── users.agency ────────────────────────────────────────
INSERT INTO users.agency (id, name, tax_id, status, commission_default) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Viajes Express', 'VEXP950101DDD', 'ACTIVE', 12.50);

-- ── users.agency_user ───────────────────────────────────
INSERT INTO users.agency_user (id, agency_id, user_id) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');

-- =============================================
-- catalog
-- =============================================

-- ── catalog.cancellation_policy ─────────────────────────
INSERT INTO catalog.cancellation_policy (id, name, type, hours_limit, refund_percent) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Cancelación gratuita 48h',  'FULL',             48, 100),
  ('10000000-0000-0000-0000-000000000002', 'Cancelación parcial 24h',   'PARTIAL',          24,  50),
  ('10000000-0000-0000-0000-000000000003', 'No reembolsable',           'NON_REFUNDABLE', NULL, NULL);

-- ── catalog.amenity ─────────────────────────────────────
INSERT INTO catalog.amenity (id, code, name) VALUES
  ('20000000-0000-0000-0000-000000000001', 'wifi',       'Wi-Fi gratuito'),
  ('20000000-0000-0000-0000-000000000002', 'pool',       'Piscina'),
  ('20000000-0000-0000-0000-000000000003', 'breakfast',  'Desayuno incluido'),
  ('20000000-0000-0000-0000-000000000004', 'gym',        'Gimnasio'),
  ('20000000-0000-0000-0000-000000000005', 'spa',        'Spa'),
  ('20000000-0000-0000-0000-000000000006', 'parking',    'Estacionamiento'),
  ('20000000-0000-0000-0000-000000000007', 'restaurant', 'Restaurante'),
  ('20000000-0000-0000-0000-000000000008', 'bar',        'Bar'),
  ('20000000-0000-0000-0000-000000000009', 'ac',         'Aire acondicionado'),
  ('20000000-0000-0000-0000-00000000000a', 'pet_friendly','Acepta mascotas');

-- ── catalog.property ────────────────────────────────────
-- 6 properties: 2 per hotel, spread across cities
-- city_id is looked up by dane_code from the loaded cities

INSERT INTO catalog.property (id, hotel_id, name, description, city_id, address, check_in_time, check_out_time, phone, email, website, status, rating_avg, review_count, popularity_score, default_cancellation_policy_id) VALUES
  ('30000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001',
   'Sol Caribe Cancún',
   'Resort frente al mar en la zona hotelera de Cancún. Disfruta de playas de arena blanca, piscinas infinitas y gastronomía internacional.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.42.1755.477409'),
   'Blvd. Kukulcán Km 12.5, Zona Hotelera, 77500 Cancún',
   '15:00', '12:00', '+52 998 555 0101', 'reservas@solcaribe.mx', 'https://solcaribe.mx',
   'ACTIVE', 4.60, 124, 920.00,
   '10000000-0000-0000-0000-000000000001'),

  ('30000000-0000-0000-0000-000000000002',
   'e0000000-0000-0000-0000-000000000001',
   'Sol Reforma CDMX',
   'Hotel boutique en el corazón de la Ciudad de México, a pasos del Ángel de la Independencia y la zona de museos.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.42.1741.480381'),
   'Paseo de la Reforma 265, Cuauhtémoc, 06500 CDMX',
   '15:00', '11:00', '+52 55 5555 0202', 'reservas@solreforma.mx', 'https://solreforma.mx',
   'ACTIVE', 4.30, 87, 750.00,
   '10000000-0000-0000-0000-000000000002'),

  ('30000000-0000-0000-0000-000000000003',
   'e0000000-0000-0000-0000-000000000002',
   'Luna Andina Bogotá',
   'Hotel moderno en el barrio de Usaquén con vistas a los cerros orientales. Ideal para viajes de negocios y turismo.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.82.11.1'),
   'Cra. 7 #118-09, Usaquén, Bogotá',
   '14:00', '12:00', '+57 1 555 0303', 'reservas@lunaandina.co', 'https://lunaandina.co',
   'ACTIVE', 4.10, 63, 580.00,
   '10000000-0000-0000-0000-000000000001'),

  ('30000000-0000-0000-0000-000000000004',
   'e0000000-0000-0000-0000-000000000002',
   'Luna Porteña Buenos Aires',
   'Elegante hotel en Palermo Soho con diseño contemporáneo, rooftop bar y fácil acceso a la vida nocturna porteña.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.5.1818.790234'),
   'Thames 2062, Palermo, C1425 Buenos Aires',
   '15:00', '10:00', '+54 11 5555 0404', 'reservas@lunaportena.ar', 'https://lunaportena.ar',
   'ACTIVE', 4.50, 98, 830.00,
   '10000000-0000-0000-0000-000000000002'),

  ('30000000-0000-0000-0000-000000000005',
   'e0000000-0000-0000-0000-000000000003',
   'Estrella Gran Vía Madrid',
   'Hotel clásico en plena Gran Vía madrileña. Habitaciones amplias con balcón, desayuno buffet y terraza panorámica.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.28.650.62172'),
   'Gran Vía 28, 28013 Madrid',
   '14:00', '11:00', '+34 91 555 0505', 'reservas@estrellagranvia.es', 'https://estrellagranvia.es',
   'ACTIVE', 4.80, 156, 980.00,
   '10000000-0000-0000-0000-000000000001'),

  ('30000000-0000-0000-0000-000000000006',
   'e0000000-0000-0000-0000-000000000003',
   'Estrella Gótico Barcelona',
   'Encantador hotel en el Barrio Gótico de Barcelona, a minutos de Las Ramblas y la Catedral. Arquitectura medieval restaurada.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.28.648.61405'),
   'Carrer dels Banys Nous 15, 08002 Barcelona',
   '15:00', '12:00', '+34 93 555 0606', 'reservas@estrellagotico.es', 'https://estrellagotico.es',
   'ACTIVE', 3.90, 45, 490.00,
   '10000000-0000-0000-0000-000000000003');

-- ── catalog.city images (featured destinations) ─────────
UPDATE catalog.city SET image_url = 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=800&h=600&fit=crop' WHERE dane_code = 'D.42.1755.477409'; -- Cancún
UPDATE catalog.city SET image_url = 'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=800&h=600&fit=crop' WHERE dane_code = 'D.42.1741.480381'; -- CDMX
UPDATE catalog.city SET image_url = 'https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=800&h=600&fit=crop' WHERE dane_code = 'D.82.11.1';        -- Bogotá
UPDATE catalog.city SET image_url = 'https://images.unsplash.com/photo-1589909202802-8f4aadce1849?w=800&h=600&fit=crop' WHERE dane_code = 'D.5.1818.790234';  -- Buenos Aires
UPDATE catalog.city SET image_url = 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop' WHERE dane_code = 'D.28.650.62172';   -- Madrid
UPDATE catalog.city SET image_url = 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&h=600&fit=crop' WHERE dane_code = 'D.28.648.61405';   -- Barcelona

-- ── catalog.property_image ──────────────────────────────
INSERT INTO catalog.property_image (id, property_id, url, caption, display_order) VALUES
  -- Cancún (resort/beach)
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop', 'Fachada principal',  0),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800&h=500&fit=crop', 'Piscina infinita',   1),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=500&fit=crop', 'Playa privada',      2),
  -- CDMX (boutique hotel)
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop', 'Lobby',              0),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=500&fit=crop', 'Habitación deluxe',  1),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=500&fit=crop', 'Terraza con vista',  2),
  -- Bogotá (modern hotel)
  ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&h=500&fit=crop', 'Fachada',            0),
  ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=500&fit=crop', 'Sala de estar',      1),
  ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=500&fit=crop', 'Vista a los cerros', 2),
  -- Buenos Aires (design hotel)
  ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&h=500&fit=crop', 'Fachada Palermo',    0),
  ('40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=500&fit=crop', 'Rooftop bar',        1),
  ('40000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=500&fit=crop', 'Suite premium',      2),
  -- Madrid (classic hotel)
  ('40000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&h=500&fit=crop', 'Fachada Gran Vía',   0),
  ('40000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=500&fit=crop', 'Terraza panorámica', 1),
  ('40000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=500&fit=crop', 'Desayuno buffet',    2),
  -- Barcelona (gothic hotel)
  ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&h=500&fit=crop', 'Fachada gótica',     0),
  ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=500&fit=crop', 'Patio interior',     1),
  ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=500&fit=crop', 'Habitación estándar',2);

-- ── catalog.property_amenity ────────────────────────────
-- Cancún: wifi, pool, breakfast, gym, spa, restaurant, bar, ac
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009');

-- CDMX: wifi, breakfast, gym, parking, restaurant, ac
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009');

-- Bogotá: wifi, breakfast, gym, parking, restaurant
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007');

-- Buenos Aires: wifi, pool, gym, spa, bar, ac, pet_friendly
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009'),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-00000000000a');

-- Madrid: wifi, breakfast, gym, spa, parking, restaurant, bar, ac
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000004'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000006'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000009');

-- Barcelona: wifi, restaurant, bar, pet_friendly
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000007'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-00000000000a');

-- ── catalog.property_policy ─────────────────────────────
INSERT INTO catalog.property_policy (id, property_id, category, description) VALUES
  -- Cancún
  ('50000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'CHECK_IN',  'Check-in a partir de las 15:00 h'),
  ('50000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'CHECK_OUT', 'Check-out antes de las 12:00 h'),
  ('50000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', 'PETS',      'No se admiten mascotas'),
  -- CDMX
  ('50000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'CHECK_IN',  'Check-in a partir de las 14:00 h'),
  ('50000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000002', 'CHECK_OUT', 'Check-out antes de las 11:00 h'),
  ('50000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000002', 'SMOKING',   'Hotel 100% libre de humo'),
  -- Bogotá
  ('50000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003', 'CHECK_IN',  'Check-in a partir de las 15:00 h'),
  ('50000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003', 'CHECK_OUT', 'Check-out antes de las 12:00 h'),
  -- Buenos Aires
  ('50000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000004', 'CHECK_IN',  'Check-in a partir de las 14:00 h'),
  ('50000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000004', 'CHECK_OUT', 'Check-out antes de las 11:00 h'),
  ('50000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000004', 'PETS',      'Se admiten mascotas pequeñas (hasta 10 kg) con cargo adicional'),
  -- Madrid
  ('50000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-000000000005', 'CHECK_IN',  'Check-in a partir de las 15:00 h'),
  ('50000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-000000000005', 'CHECK_OUT', 'Check-out antes de las 12:00 h'),
  ('50000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-000000000005', 'CHILDREN',  'Niños menores de 5 años se hospedan gratis'),
  -- Barcelona
  ('50000000-0000-0000-0000-00000000000f', '30000000-0000-0000-0000-000000000006', 'CHECK_IN',  'Check-in a partir de las 16:00 h'),
  ('50000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000006', 'CHECK_OUT', 'Check-out antes de las 11:00 h'),
  ('50000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000006', 'PETS',      'Mascotas bienvenidas sin cargo adicional');

-- ── catalog.room_type ───────────────────────────────────
-- 2 room types per property (Standard + Suite/Deluxe)
INSERT INTO catalog.room_type (id, property_id, name, description, capacity) VALUES
  -- Cancún
  ('60000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Estándar Vista al Mar',  'Habitación luminosa con ventanal panorámico hacia el Caribe, cama King, escritorio de trabajo y baño con ducha lluvia.', 2),
  ('60000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Suite Premium',          'Suite amplia con sala independiente, jacuzzi privado y terraza frente al mar. Incluye desayuno buffet para dos.', 4),
  -- CDMX
  ('60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'Estándar',               'Habitación moderna en el corazón de Reforma con dos camas individuales y vista a la ciudad.', 2),
  ('60000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 'Deluxe Reforma',         'Habitación deluxe con cama King, zona de estar, área de trabajo y baño de mármol con amenities premium.', 3),
  -- Bogotá
  ('60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 'Estándar',               'Habitación acogedora con cama Queen, climatización individual y escritorio ideal para viajeros de negocios.', 2),
  ('60000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', 'Suite Ejecutiva',        'Suite con sala de estar, dormitorio separado, cafetera espresso y acceso al Executive Lounge.', 3),
  -- Buenos Aires
  ('60000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004', 'Estándar Palermo',       'Habitación con estilo porteño, cama doble, pisos de madera y vista a las calles de Palermo.', 2),
  ('60000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000004', 'Loft Premium',           'Loft en dos niveles con sala lounge, cocineta, cama King en mezzanina y gran ventanal de piso a techo.', 4),
  -- Madrid
  ('60000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000005', 'Clásica Gran Vía',       'Habitación clásica con decoración castellana, cama Queen y balcón con vista a la Gran Vía.', 2),
  ('60000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-000000000005', 'Suite Imperial',         'Suite espaciosa con salón, comedor privado, cama King y baño con bañera de hidromasaje.', 4),
  -- Barcelona
  ('60000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-000000000006', 'Estándar Gótico',        'Habitación con estética medieval en el Barrio Gótico, cama doble, paredes de piedra y vigas de madera originales.', 2),
  ('60000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-000000000006', 'Suite Medieval',         'Suite temática con sala privada, chimenea ornamental, cama con dosel y amplio baño con bañera independiente.', 6);

-- ── catalog.room_type_amenity ───────────────────────────
-- Suites get more amenities than standard rooms
-- Standard rooms: wifi, ac
INSERT INTO catalog.room_type_amenity (room_type_id, amenity_id) VALUES
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-000000000009');

-- Suites: wifi, ac, spa, breakfast
INSERT INTO catalog.room_type_amenity (room_type_id, amenity_id) VALUES
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-000000000008', '20000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000003'),
  ('60000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-00000000000c', '20000000-0000-0000-0000-000000000003');

-- ── catalog.rate_plan ───────────────────────────────────
INSERT INTO catalog.rate_plan (id, room_type_id, name, is_active, cancellation_policy_id) VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000005', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000006', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000007', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000008', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000009', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-00000000000a', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-00000000000b', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000003'),
  ('70000000-0000-0000-0000-00000000000c', '60000000-0000-0000-0000-00000000000c', 'Tarifa Base',  true, '10000000-0000-0000-0000-000000000003');

-- ── catalog.rate_calendar ───────────────────────────────
-- 30 days of prices starting from today, using generate_series
-- Prices vary by property tier (USD)

-- Cancún Standard $120/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000001', d::date, 'USD', 120.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Cancún Suite $280/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000002', d::date, 'USD', 280.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- CDMX Standard $75/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000003', d::date, 'USD', 75.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- CDMX Deluxe $150/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000004', d::date, 'USD', 150.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Bogotá Standard $60/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000005', d::date, 'USD', 60.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Bogotá Suite $130/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000006', d::date, 'USD', 130.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Buenos Aires Standard $85/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000007', d::date, 'USD', 85.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Buenos Aires Loft $200/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000008', d::date, 'USD', 200.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Madrid Clásica $140/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000009', d::date, 'USD', 140.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Madrid Suite $300/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-00000000000a', d::date, 'USD', 300.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Barcelona Standard $90/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-00000000000b', d::date, 'USD', 90.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Barcelona Suite $180/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-00000000000c', d::date, 'USD', 180.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- ── catalog.inventory_calendar ──────────────────────────
-- 30 days of availability per room type

-- Cancún Standard: 8 units, Suite: 4 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000001', d::date, 8
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000002', d::date, 4
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- CDMX Standard: 6 units, Deluxe: 3 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000003', d::date, 6
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000004', d::date, 3
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Bogotá Standard: 5 units, Suite: 3 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000005', d::date, 5
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000006', d::date, 3
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Buenos Aires Standard: 7 units, Loft: 3 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000007', d::date, 7
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000008', d::date, 3
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Madrid Clásica: 10 units, Suite: 5 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-000000000009', d::date, 10
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-00000000000a', d::date, 5
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Barcelona Standard: 4 units, Suite: 2 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-00000000000b', d::date, 4
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-00000000000c', d::date, 2
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- ── catalog.review ──────────────────────────────────────
-- Reviews from travelers (booking_id uses placeholder UUIDs since bookings come next)
INSERT INTO catalog.review (id, booking_id, user_id, property_id, rating, comment) VALUES
  -- Cancún reviews
  ('80000000-0000-0000-0000-000000000001', '99000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 5, 'Increíble resort, la playa es espectacular y el servicio de primera.'),
  ('80000000-0000-0000-0000-000000000002', '99000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 4, 'Muy buena experiencia. La piscina infinita es hermosa.'),
  ('80000000-0000-0000-0000-000000000003', '99000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001', 5, 'Best vacation ever! The beach is pristine.'),
  -- CDMX reviews
  ('80000000-0000-0000-0000-000000000004', '99000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', 4, 'Excelente ubicación, a pasos de todo. Habitación cómoda.'),
  ('80000000-0000-0000-0000-000000000005', '99000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 5, 'Hotel boutique con mucho encanto. Repetiría sin duda.'),
  -- Bogotá reviews
  ('80000000-0000-0000-0000-000000000006', '99000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 4, 'Buena relación calidad-precio. El barrio de Usaquén es encantador.'),
  ('80000000-0000-0000-0000-000000000007', '99000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003', 4, 'Habitación limpia y cómoda. El desayuno podría mejorar.'),
  -- Buenos Aires reviews
  ('80000000-0000-0000-0000-000000000008', '99000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004', 5, 'El rooftop bar tiene las mejores vistas de Palermo. Hermoso hotel.'),
  ('80000000-0000-0000-0000-000000000009', '99000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', 4, 'Muy lindo hotel, el diseño es increíble. Un poco ruidoso por la noche.'),
  -- Madrid reviews
  ('80000000-0000-0000-0000-00000000000a', '99000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000005', 5, 'El mejor hotel en el que me he hospedado. La terraza es mágica.'),
  ('80000000-0000-0000-0000-00000000000b', '99000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000005', 5, 'Outstanding hotel! The breakfast buffet is world-class.'),
  ('80000000-0000-0000-0000-00000000000c', '99000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000005', 4, 'Excelente en todo. Solo le falta piscina para ser perfecto.'),
  -- Barcelona reviews
  ('80000000-0000-0000-0000-00000000000d', '99000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000006', 4, 'El edificio tiene mucho carácter. Ubicación inmejorable.'),
  ('80000000-0000-0000-0000-00000000000e', '99000000-0000-0000-0000-00000000000e', 'a0000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000006', 4, 'Bonito hotel en el corazón del Gótico. Las habitaciones son pequeñas pero con encanto.'),
  ('80000000-0000-0000-0000-00000000000f', '99000000-0000-0000-0000-00000000000f', 'a0000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000006', 3, 'Good location but rooms could use renovation. A bit noisy at night.');

-- =============================================
-- booking
-- =============================================

-- Booking 1: CONFIRMED (Carlos in Cancún, 3 nights)
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'CONFIRMED',
   CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '13 days',
   360.00, 'USD',
   '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 120.00,
   'FULL', 48, 100);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, changed_by) VALUES
  ('92000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', NULL,                     'CART',                   'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'CART',                   'PENDING_PAYMENT',        'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL),
  ('92000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001', 'PENDING_CONFIRMATION',   'CONFIRMED',              'b0000000-0000-0000-0000-000000000001');

-- Booking 2: PENDING_CONFIRMATION (María in Madrid, 2 nights)
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, hold_expires_at, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'PENDING_CONFIRMATION',
   CURRENT_DATE + INTERVAL '15 days', CURRENT_DATE + INTERVAL '17 days',
   now() + INTERVAL '15 minutes',
   280.00, 'USD',
   '30000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000009', 140.00,
   'FULL', 48, 100);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, changed_by) VALUES
  ('92000000-0000-0000-0000-000000000005', '90000000-0000-0000-0000-000000000002', NULL,                     'CART',                   'a0000000-0000-0000-0000-000000000002'),
  ('92000000-0000-0000-0000-000000000006', '90000000-0000-0000-0000-000000000002', 'CART',                   'PENDING_PAYMENT',        'a0000000-0000-0000-0000-000000000002'),
  ('92000000-0000-0000-0000-000000000007', '90000000-0000-0000-0000-000000000002', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL);

-- Booking 7: PENDING_CONFIRMATION (for Roberto's hotel in Cancún, 2 nights)
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, hold_expires_at, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'PENDING_CONFIRMATION',
   CURRENT_DATE + INTERVAL '8 days', CURRENT_DATE + INTERVAL '10 days',
   now() + INTERVAL '20 minutes',
   240.00, 'USD',
   '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 120.00,
   'FULL', 48, 100);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, changed_by) VALUES
  ('92000000-0000-0000-0000-000000000018', '90000000-0000-0000-0000-000000000007', NULL,                     'CART',                   'a0000000-0000-0000-0000-000000000004'),
  ('92000000-0000-0000-0000-000000000019', '90000000-0000-0000-0000-000000000007', 'CART',                   'PENDING_PAYMENT',        'a0000000-0000-0000-0000-000000000004'),
  ('92000000-0000-0000-0000-000000000020', '90000000-0000-0000-0000-000000000007', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL);

-- Booking 3: CANCELLED (Lucía in Buenos Aires, 4 nights)
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'CANCELLED',
   CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '9 days',
   340.00, 'USD',
   '30000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000007', 85.00,
   'PARTIAL', 24, 50);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, reason, changed_by) VALUES
  ('92000000-0000-0000-0000-000000000008', '90000000-0000-0000-0000-000000000003', NULL,                     'CART',                   NULL, 'a0000000-0000-0000-0000-000000000003'),
  ('92000000-0000-0000-0000-000000000009', '90000000-0000-0000-0000-000000000003', 'CART',                   'PENDING_PAYMENT',        NULL, 'a0000000-0000-0000-0000-000000000003'),
  ('92000000-0000-0000-0000-00000000000a', '90000000-0000-0000-0000-000000000003', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL, NULL),
  ('92000000-0000-0000-0000-00000000000b', '90000000-0000-0000-0000-000000000003', 'PENDING_CONFIRMATION',   'CANCELLED',              'Cancelado por el usuario', 'a0000000-0000-0000-0000-000000000003');

-- Booking 4: CONFIRMED past (Carlos in CDMX, completed 2 months ago) — "past" tab
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'CONFIRMED',
   CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '57 days',
   300.00, 'USD',
   '30000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000003', 100.00,
   'FULL', 48, 100);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, changed_by) VALUES
  ('92000000-0000-0000-0000-00000000000c', '90000000-0000-0000-0000-000000000004', NULL,                     'CART',                   'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-00000000000d', '90000000-0000-0000-0000-000000000004', 'CART',                   'PENDING_PAYMENT',        'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-00000000000e', '90000000-0000-0000-0000-000000000004', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL),
  ('92000000-0000-0000-0000-00000000000f', '90000000-0000-0000-0000-000000000004', 'PENDING_CONFIRMATION',   'CONFIRMED',              'b0000000-0000-0000-0000-000000000001');

-- Booking 5: CANCELLED (Carlos tried Bogotá last month) — "past" tab
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'CANCELLED',
   CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '28 days',
   190.00, 'USD',
   '30000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000005', 95.00,
   'PARTIAL', 24, 50);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, reason, changed_by) VALUES
  ('92000000-0000-0000-0000-000000000010', '90000000-0000-0000-0000-000000000005', NULL,                     'CART',                   NULL, 'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000011', '90000000-0000-0000-0000-000000000005', 'CART',                   'PENDING_PAYMENT',        NULL, 'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000012', '90000000-0000-0000-0000-000000000005', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL, NULL),
  ('92000000-0000-0000-0000-000000000013', '90000000-0000-0000-0000-000000000005', 'PENDING_CONFIRMATION',   'CANCELLED',              'Cambio de planes', 'a0000000-0000-0000-0000-000000000001');

-- Booking 6: REJECTED (Carlos, Palermo — hotel rechazó la solicitud) — "past" tab
INSERT INTO booking.booking (id, user_id, status, checkin, checkout, total_amount, currency_code, property_id, room_type_id, rate_plan_id, unit_price, policy_type_applied, policy_hours_limit_applied, policy_refund_percent_applied) VALUES
  ('90000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'REJECTED',
   CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '17 days',
   255.00, 'USD',
   '30000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000007', 85.00,
   'NON_REFUNDABLE', NULL, NULL);

INSERT INTO booking.booking_status_history (id, booking_id, from_status, to_status, reason, changed_by) VALUES
  ('92000000-0000-0000-0000-000000000014', '90000000-0000-0000-0000-000000000006', NULL,                     'CART',                   NULL, 'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000015', '90000000-0000-0000-0000-000000000006', 'CART',                   'PENDING_PAYMENT',        NULL, 'a0000000-0000-0000-0000-000000000001'),
  ('92000000-0000-0000-0000-000000000016', '90000000-0000-0000-0000-000000000006', 'PENDING_PAYMENT',        'PENDING_CONFIRMATION',   NULL, NULL),
  ('92000000-0000-0000-0000-000000000017', '90000000-0000-0000-0000-000000000006', 'PENDING_CONFIRMATION',   'REJECTED',               'Sin disponibilidad confirmada por el hotel', 'b0000000-0000-0000-0000-000000000002');

-- =============================================
-- payments
-- =============================================

-- Payment for booking 1 (CAPTURED)
INSERT INTO payments.payment (id, booking_id, provider, status, authorized_amount, captured_amount, currency_code, payment_token, provider_reference, processed_at) VALUES
  ('a1000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001',
   'stripe', 'CAPTURED', 360.00, 360.00, 'USD',
   'tok_test_cancun_001', 'pi_3abc123', now() - INTERVAL '2 days');

-- Payment for booking 3 (CANCELLED — was authorized then cancelled)
INSERT INTO payments.payment (id, booking_id, provider, status, authorized_amount, captured_amount, currency_code, payment_token, provider_reference, processed_at) VALUES
  ('a1000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000003',
   'stripe', 'CANCELLED', 340.00, NULL, 'USD',
   'tok_test_bsas_001', 'pi_3def456', now() - INTERVAL '1 day');

-- Refund for cancelled booking 3 (partial — 50%)
INSERT INTO payments.refund (id, payment_id, amount, status, reason) VALUES
  ('a2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002',
   170.00, 'COMPLETED', 'Cancelación parcial según política (50%)');

-- =============================================
-- notifications
-- =============================================

-- Email confirmation for booking 1
INSERT INTO notifications.notification (id, booking_id, user_id, channel, type, status, sent_at) VALUES
  ('b1000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'EMAIL', 'BOOKING_CONFIRMED', 'SENT', now() - INTERVAL '2 days');

-- Push confirmation for booking 1
INSERT INTO notifications.notification (id, booking_id, user_id, channel, type, status, sent_at) VALUES
  ('b1000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'PUSH', 'BOOKING_CONFIRMED', 'SENT', now() - INTERVAL '2 days');

-- Email cancellation for booking 3
INSERT INTO notifications.notification (id, booking_id, user_id, channel, type, status, sent_at) VALUES
  ('b1000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003',
   'EMAIL', 'BOOKING_CANCELLED', 'SENT', now() - INTERVAL '1 day');

-- Device tokens
INSERT INTO notifications.device_token (id, user_id, platform, token) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'android', 'ExponentPushToken[carlos-android-test-token-001]'),
  ('b2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'ios',     'ExponentPushToken[maria-ios-test-token-001]');

-- =============================================
-- Additional property: Luna Maya Cancún
-- Same city as Sol Caribe Cancún, operated by hotel Luna
-- =============================================

INSERT INTO catalog.property (id, hotel_id, name, description, city_id, address, status, rating_avg, review_count, popularity_score, default_cancellation_policy_id) VALUES
  ('30000000-0000-0000-0000-000000000007',
   'e0000000-0000-0000-0000-000000000002',
   'Luna Maya Cancún',
   'Hotel boutique a pocos pasos de la Zona Hotelera de Cancún. Rodeado de cenotes y vida nocturna, con spa maya y gastronomía local.',
   (SELECT id FROM catalog.city WHERE dane_code = 'D.42.1755.477409'),
   'Av. Tulum 210, Centro, 77500 Cancún',
   'ACTIVE', 4.40, 72, 680.00,
   '10000000-0000-0000-0000-000000000002');

INSERT INTO catalog.property_image (id, property_id, url, caption, display_order) VALUES
  ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=500&fit=crop', 'Fachada boutique',   0),
  ('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=500&fit=crop', 'Spa maya',           1),
  ('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop', 'Piscina tropical',   2);

-- wifi, pool, breakfast, spa, bar, ac, pet_friendly
INSERT INTO catalog.property_amenity (property_id, amenity_id) VALUES
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000005'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000008'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000009'),
  ('30000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-00000000000a');

INSERT INTO catalog.property_policy (id, property_id, category, description) VALUES
  ('50000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000007', 'CHECK_IN',  'Check-in a partir de las 15:00 h'),
  ('50000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000007', 'CHECK_OUT', 'Check-out antes de las 12:00 h'),
  ('50000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000007', 'PETS',      'Mascotas pequeñas bienvenidas sin cargo');

INSERT INTO catalog.room_type (id, property_id, name, description, capacity) VALUES
  ('60000000-0000-0000-0000-00000000000d', '30000000-0000-0000-0000-000000000007', 'Estándar Tropical', 'Habitación con motivos mayas, cama Queen, ventilador de techo y balcón con vista al jardín tropical.', 2),
  ('60000000-0000-0000-0000-00000000000e', '30000000-0000-0000-0000-000000000007', 'Suite Maya',        'Suite con sala de estar, terraza privada con hamaca, cama King y amenidades de spa maya.', 4);

-- Standard: wifi, ac | Suite: wifi, ac, spa, breakfast
INSERT INTO catalog.room_type_amenity (room_type_id, amenity_id) VALUES
  ('60000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000d', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000009'),
  ('60000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-00000000000e', '20000000-0000-0000-0000-000000000003');

INSERT INTO catalog.rate_plan (id, room_type_id, name, is_active, cancellation_policy_id) VALUES
  ('70000000-0000-0000-0000-00000000000d', '60000000-0000-0000-0000-00000000000d', 'Tarifa Base', true, '10000000-0000-0000-0000-000000000002'),
  ('70000000-0000-0000-0000-00000000000e', '60000000-0000-0000-0000-00000000000e', 'Tarifa Base', true, '10000000-0000-0000-0000-000000000002');

-- Luna Maya Standard $95/night, Suite $210/night
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-00000000000d', d::date, 'USD', 95.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), '70000000-0000-0000-0000-00000000000e', d::date, 'USD', 210.00
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Standard: 6 units, Suite: 3 units
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-00000000000d', d::date, 6
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), '60000000-0000-0000-0000-00000000000e', d::date, 3
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- =============================================
-- catalog.room_type_image — 3 fotos por tipo de habitación
-- =============================================
INSERT INTO catalog.room_type_image (id, room_type_id, url, caption, display_order) VALUES
  -- Cancún · Estándar Vista al Mar
  ('d0000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop', 'Vista principal', 0),
  ('d0000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop', 'Cama King frente al mar', 1),
  ('d0000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1551776245-ca5c7f8f34f2?w=800&h=600&fit=crop', 'Baño con ducha lluvia', 2),
  -- Cancún · Suite Premium
  ('d0000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop', 'Sala de la suite', 0),
  ('d0000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&h=600&fit=crop', 'Terraza privada', 1),
  ('d0000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop', 'Jacuzzi con vista', 2),
  -- CDMX · Estándar
  ('d0000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop', 'Camas individuales', 0),
  ('d0000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop', 'Vista de la ciudad', 1),
  ('d0000000-0000-0000-0000-000000000009', '60000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&h=600&fit=crop', 'Área de escritorio', 2),
  -- CDMX · Deluxe Reforma
  ('d0000000-0000-0000-0000-00000000000a', '60000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop', 'Cama King con zona de estar', 0),
  ('d0000000-0000-0000-0000-00000000000b', '60000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&h=600&fit=crop', 'Baño de mármol', 1),
  ('d0000000-0000-0000-0000-00000000000c', '60000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop', 'Ambiente principal', 2),
  -- Bogotá · Estándar
  ('d0000000-0000-0000-0000-00000000000d', '60000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop', 'Cama Queen', 0),
  ('d0000000-0000-0000-0000-00000000000e', '60000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', 'Zona de trabajo', 1),
  ('d0000000-0000-0000-0000-00000000000f', '60000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop', 'Baño privado', 2),
  -- Bogotá · Suite Ejecutiva
  ('d0000000-0000-0000-0000-000000000010', '60000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1587985064135-0366536eab42?w=800&h=600&fit=crop', 'Sala ejecutiva', 0),
  ('d0000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&h=600&fit=crop', 'Dormitorio separado', 1),
  ('d0000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1601565415267-72ce0e2f7d12?w=800&h=600&fit=crop', 'Cafetera espresso', 2),
  -- Buenos Aires · Estándar Palermo
  ('d0000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&h=600&fit=crop', 'Cama doble', 0),
  ('d0000000-0000-0000-0000-000000000014', '60000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop', 'Piso de madera', 1),
  ('d0000000-0000-0000-0000-000000000015', '60000000-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop', 'Vista a Palermo', 2),
  -- Buenos Aires · Loft Premium
  ('d0000000-0000-0000-0000-000000000016', '60000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop', 'Sala lounge del loft', 0),
  ('d0000000-0000-0000-0000-000000000017', '60000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&h=600&fit=crop', 'Cocineta', 1),
  ('d0000000-0000-0000-0000-000000000018', '60000000-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800&h=600&fit=crop', 'Cama en mezzanina', 2),
  -- Madrid · Clásica Gran Vía
  ('d0000000-0000-0000-0000-000000000019', '60000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&h=600&fit=crop', 'Decoración castellana', 0),
  ('d0000000-0000-0000-0000-00000000001a', '60000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&h=600&fit=crop', 'Balcón a Gran Vía', 1),
  ('d0000000-0000-0000-0000-00000000001b', '60000000-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=600&fit=crop', 'Cama Queen', 2),
  -- Madrid · Suite Imperial
  ('d0000000-0000-0000-0000-00000000001c', '60000000-0000-0000-0000-00000000000a', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=600&fit=crop', 'Salón privado', 0),
  ('d0000000-0000-0000-0000-00000000001d', '60000000-0000-0000-0000-00000000000a', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop', 'Comedor', 1),
  ('d0000000-0000-0000-0000-00000000001e', '60000000-0000-0000-0000-00000000000a', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop', 'Baño con hidromasaje', 2),
  -- Barcelona · Estándar Gótico
  ('d0000000-0000-0000-0000-00000000001f', '60000000-0000-0000-0000-00000000000b', 'https://images.unsplash.com/photo-1565031491910-e57fac031c41?w=800&h=600&fit=crop', 'Paredes de piedra', 0),
  ('d0000000-0000-0000-0000-000000000020', '60000000-0000-0000-0000-00000000000b', 'https://images.unsplash.com/photo-1605346576608-92f1346b67f2?w=800&h=600&fit=crop', 'Vigas de madera', 1),
  ('d0000000-0000-0000-0000-000000000021', '60000000-0000-0000-0000-00000000000b', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop', 'Cama doble', 2),
  -- Barcelona · Suite Medieval
  ('d0000000-0000-0000-0000-000000000022', '60000000-0000-0000-0000-00000000000c', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop', 'Sala con chimenea', 0),
  ('d0000000-0000-0000-0000-000000000023', '60000000-0000-0000-0000-00000000000c', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&h=600&fit=crop', 'Cama con dosel', 1),
  ('d0000000-0000-0000-0000-000000000024', '60000000-0000-0000-0000-00000000000c', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop', 'Bañera independiente', 2),
  -- Luna Maya · Estándar Tropical
  ('d0000000-0000-0000-0000-000000000025', '60000000-0000-0000-0000-00000000000d', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop', 'Habitación tropical', 0),
  ('d0000000-0000-0000-0000-000000000026', '60000000-0000-0000-0000-00000000000d', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop', 'Balcón al jardín', 1),
  ('d0000000-0000-0000-0000-000000000027', '60000000-0000-0000-0000-00000000000d', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&h=600&fit=crop', 'Cama Queen', 2),
  -- Luna Maya · Suite Maya
  ('d0000000-0000-0000-0000-000000000028', '60000000-0000-0000-0000-00000000000e', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop', 'Suite con sala', 0),
  ('d0000000-0000-0000-0000-000000000029', '60000000-0000-0000-0000-00000000000e', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop', 'Terraza con hamaca', 1),
  ('d0000000-0000-0000-0000-00000000002a', '60000000-0000-0000-0000-00000000000e', 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&h=600&fit=crop', 'Amenidades de spa maya', 2);

-- =============================================
-- Promociones de demo (Luna Maya Cancún)
-- =============================================
-- Standard Tropical → 15% off
-- Suite Maya        → $40 USD off
INSERT INTO catalog.promotion (id, rate_plan_id, name, discount_type, discount_value, start_date, end_date, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000001',
   '70000000-0000-0000-0000-00000000000d',
   'Oferta Tropical 15%',
   'PERCENT',
   15.00,
   CURRENT_DATE,
   CURRENT_DATE + INTERVAL '29 days',
   true),
  ('c0000000-0000-0000-0000-000000000002',
   '70000000-0000-0000-0000-00000000000e',
   'Ahorra $40 en Suite Maya',
   'FIXED',
   40.00,
   CURRENT_DATE,
   CURRENT_DATE + INTERVAL '29 days',
   true);

COMMIT;
