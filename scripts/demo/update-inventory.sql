-- =============================================
-- Change available units for a room_type across a date range
-- Useful demos: "sell out a room", "double capacity", "close a date"
-- =============================================

-- Find room_type_id:
-- SELECT rt.id, p.name AS property, rt.name AS room_type, rt.capacity
-- FROM catalog.room_type rt
-- JOIN catalog.property p ON p.id = rt.property_id
-- ORDER BY p.name, rt.name;

BEGIN;

-- Set available units within a date range
UPDATE catalog.inventory_calendar
SET available_units = 10
WHERE room_type_id = '60000000-0000-0000-0000-000000000001'  -- Cancún Estándar
  AND day BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 days';

-- Sell out (0 units) for a range:
-- UPDATE catalog.inventory_calendar
-- SET available_units = 0
-- WHERE room_type_id = '60000000-0000-0000-0000-000000000001'
--   AND day BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '2 days';

-- Verify
SELECT day, available_units
FROM catalog.inventory_calendar
WHERE room_type_id = '60000000-0000-0000-0000-000000000001'
  AND day BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '9 days'
ORDER BY day;

COMMIT;
