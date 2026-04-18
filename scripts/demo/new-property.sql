-- =============================================
-- Create a new property (hotel) end-to-end
-- Edit values in the "PARAMETERS" block, then run the whole script.
-- Re-runnable: all internal IDs are generated with gen_random_uuid(),
-- so running again just creates another property — no edits needed.
-- =============================================

BEGIN;

-- ── PARAMETERS ───────────────────────────────────────────
WITH params AS (
    SELECT
        'e0000000-0000-0000-0000-000000000001'::uuid AS hotel_id,              -- existing hotel (Sol / Luna / Estrella)
        'Hotel Demo Review'::varchar                  AS property_name,
        'Propiedad creada durante la revisión del sprint. Totalmente funcional.'::varchar AS property_description,
        'D.42.1755.477409'::varchar                   AS city_dane_code,        -- Cancún: D.42.1755.477409 | CDMX: D.42.1741.480381 | Bogotá: D.82.11.1 | Madrid: D.28.650.62172 | Buenos Aires: D.5.1818.790234 | Barcelona: D.28.648.61405
        'Av. Demo 123, Centro'::varchar               AS property_address,
        '10000000-0000-0000-0000-000000000002'::uuid  AS default_cancel_policy, -- FULL: ...001 | PARTIAL: ...002 | NON_REFUNDABLE: ...003
        95.00::numeric                                 AS price_standard,
        210.00::numeric                                AS price_suite,
        6::int                                         AS units_standard,
        3::int                                         AS units_suite
)
-- Generate fresh UUIDs for every entity and resolve city_id once.
SELECT
    p.*,
    c.id                 AS city_id,
    gen_random_uuid()    AS property_id,
    gen_random_uuid()    AS room_type_std_id,
    gen_random_uuid()    AS room_type_suite_id,
    gen_random_uuid()    AS rate_plan_std_id,
    gen_random_uuid()    AS rate_plan_suite_id
INTO TEMP TABLE _demo_params
FROM params p
JOIN catalog.city c ON c.dane_code = p.city_dane_code;

-- ── Property ─────────────────────────────────────────────
INSERT INTO catalog.property (id, hotel_id, name, description, city_id, address, status, rating_avg, review_count, popularity_score, default_cancellation_policy_id)
SELECT property_id, hotel_id, property_name, property_description, city_id, property_address,
       'ACTIVE', 0.00, 0, 0.00, default_cancel_policy
FROM _demo_params;

-- ── Images ───────────────────────────────────────────────
INSERT INTO catalog.property_image (id, property_id, url, caption, display_order)
SELECT gen_random_uuid(), property_id, 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=500&fit=crop', 'Fachada',       0 FROM _demo_params
UNION ALL
SELECT gen_random_uuid(), property_id, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=500&fit=crop', 'Habitación',    1 FROM _demo_params
UNION ALL
SELECT gen_random_uuid(), property_id, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=500&fit=crop', 'Áreas comunes', 2 FROM _demo_params;

-- ── Amenities (wifi, breakfast, gym, ac) ─────────────────
INSERT INTO catalog.property_amenity (property_id, amenity_id)
SELECT property_id, '20000000-0000-0000-0000-000000000001'::uuid FROM _demo_params
UNION ALL
SELECT property_id, '20000000-0000-0000-0000-000000000003'::uuid FROM _demo_params
UNION ALL
SELECT property_id, '20000000-0000-0000-0000-000000000004'::uuid FROM _demo_params
UNION ALL
SELECT property_id, '20000000-0000-0000-0000-000000000009'::uuid FROM _demo_params;

-- ── Policies ─────────────────────────────────────────────
INSERT INTO catalog.property_policy (id, property_id, category, description)
SELECT gen_random_uuid(), property_id, 'CHECK_IN'::policy_category,  'Check-in a partir de las 15:00 h' FROM _demo_params
UNION ALL
SELECT gen_random_uuid(), property_id, 'CHECK_OUT'::policy_category, 'Check-out antes de las 12:00 h'  FROM _demo_params
UNION ALL
SELECT gen_random_uuid(), property_id, 'PETS'::policy_category,      'No se admiten mascotas'          FROM _demo_params;

-- ── Room types ───────────────────────────────────────────
INSERT INTO catalog.room_type (id, property_id, name, capacity)
SELECT room_type_std_id,   property_id, 'Estándar', 2 FROM _demo_params
UNION ALL
SELECT room_type_suite_id, property_id, 'Suite',    4 FROM _demo_params;

-- Room-type amenities: both get wifi+ac, suite also gets breakfast
INSERT INTO catalog.room_type_amenity (room_type_id, amenity_id)
SELECT room_type_std_id,   '20000000-0000-0000-0000-000000000001'::uuid FROM _demo_params
UNION ALL
SELECT room_type_std_id,   '20000000-0000-0000-0000-000000000009'::uuid FROM _demo_params
UNION ALL
SELECT room_type_suite_id, '20000000-0000-0000-0000-000000000001'::uuid FROM _demo_params
UNION ALL
SELECT room_type_suite_id, '20000000-0000-0000-0000-000000000009'::uuid FROM _demo_params
UNION ALL
SELECT room_type_suite_id, '20000000-0000-0000-0000-000000000003'::uuid FROM _demo_params;

-- ── Rate plans ───────────────────────────────────────────
INSERT INTO catalog.rate_plan (id, room_type_id, name, is_active, cancellation_policy_id)
SELECT rate_plan_std_id,   room_type_std_id,   'Tarifa Base', true, default_cancel_policy FROM _demo_params
UNION ALL
SELECT rate_plan_suite_id, room_type_suite_id, 'Tarifa Base', true, default_cancel_policy FROM _demo_params;

-- ── Rate calendar: 30 days ───────────────────────────────
INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), (SELECT rate_plan_std_id FROM _demo_params), d::date, 'USD', (SELECT price_standard FROM _demo_params)
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
SELECT gen_random_uuid(), (SELECT rate_plan_suite_id FROM _demo_params), d::date, 'USD', (SELECT price_suite FROM _demo_params)
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- ── Inventory calendar: 30 days ──────────────────────────
INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), (SELECT room_type_std_id FROM _demo_params), d::date, (SELECT units_standard FROM _demo_params)
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

INSERT INTO catalog.inventory_calendar (id, room_type_id, day, available_units)
SELECT gen_random_uuid(), (SELECT room_type_suite_id FROM _demo_params), d::date, (SELECT units_suite FROM _demo_params)
FROM generate_series(CURRENT_DATE, CURRENT_DATE + INTERVAL '29 days', '1 day') AS d;

-- Show what we just created (grab the property_id from this result to reference later)
SELECT property_id, property_name, city_id FROM _demo_params;

DROP TABLE _demo_params;

COMMIT;
