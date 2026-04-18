-- =============================================
-- Update an existing property
-- Pick one block, edit the values, run. Keep inside BEGIN/COMMIT so you can
-- ROLLBACK if something looks wrong before committing.
-- =============================================

BEGIN;

-- ── Change name / address / description / status ─────────
UPDATE catalog.property
SET name        = 'Sol Caribe Cancún Premium',
    address     = 'Blvd. Kukulcán Km 12.5, Zona Hotelera, 77500 Cancún',
    description = 'Resort frente al mar, totalmente renovado en 2026.',
    status      = 'ACTIVE',              -- 'ACTIVE' | 'INACTIVE'
    updated_at  = now()
WHERE id = '30000000-0000-0000-0000-000000000001';

-- ── Move a property to a different city ──────────────────
-- UPDATE catalog.property
-- SET city_id    = (SELECT id FROM catalog.city WHERE dane_code = 'D.42.1741.480381'),  -- CDMX
--     updated_at = now()
-- WHERE id = '30000000-0000-0000-0000-000000000001';

-- ── Deactivate (soft delete) ─────────────────────────────
-- UPDATE catalog.property
-- SET status = 'INACTIVE', updated_at = now()
-- WHERE id = '30000000-0000-0000-0000-000000000001';

-- ── Change the default cancellation policy ───────────────
-- Policies: 10000000-...-001 = FULL, ...-002 = PARTIAL, ...-003 = NON_REFUNDABLE
-- UPDATE catalog.property
-- SET default_cancellation_policy_id = '10000000-0000-0000-0000-000000000003',
--     updated_at = now()
-- WHERE id = '30000000-0000-0000-0000-000000000001';

-- Verify
SELECT p.id, p.name, p.address, p.status, c.name AS city
FROM catalog.property p
JOIN catalog.city c ON c.id = p.city_id
WHERE p.id = '30000000-0000-0000-0000-000000000001';

COMMIT;
-- ROLLBACK;  -- ← if the verify query looks wrong, run this instead of COMMIT