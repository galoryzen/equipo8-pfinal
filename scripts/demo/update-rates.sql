-- =============================================
-- Change prices for a rate_plan across a date range
-- Edit the values at the top and run.
-- =============================================

-- Find the rate_plan_id you want:
-- SELECT rp.id, p.name AS property, rt.name AS room_type
-- FROM catalog.rate_plan rp
-- JOIN catalog.room_type rt ON rt.id = rp.room_type_id
-- JOIN catalog.property p ON p.id = rt.property_id
-- ORDER BY p.name, rt.name;

BEGIN;

-- Update price within a range (updates existing rows)
UPDATE catalog.rate_calendar
SET price_amount = 150.00
WHERE rate_plan_id = '70000000-0000-0000-0000-000000000001'  -- Cancún Standard
  AND day BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days';

-- Or: extend calendar by N more days (inserts new rows, skips duplicates)
-- INSERT INTO catalog.rate_calendar (id, rate_plan_id, day, currency_code, price_amount)
-- SELECT gen_random_uuid(), '70000000-0000-0000-0000-000000000001', d::date, 'USD', 120.00
-- FROM generate_series(CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '59 days', '1 day') AS d
-- ON CONFLICT (rate_plan_id, day) DO NOTHING;

-- Verify
SELECT day, price_amount, currency_code
FROM catalog.rate_calendar
WHERE rate_plan_id = '70000000-0000-0000-0000-000000000001'
  AND day BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '9 days'
ORDER BY day;

COMMIT;
