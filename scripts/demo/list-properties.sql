-- =============================================
-- List properties with city, hotel, room types and rates
-- Run this first during a review to grab IDs you'll need.
-- =============================================

SELECT
    p.id               AS property_id,
    p.name             AS property_name,
    p.hotel_id,
    c.name             AS city,
    c.dane_code,
    p.status,
    p.rating_avg,
    p.review_count,
    p.address
FROM catalog.property p
JOIN catalog.city c ON c.id = p.city_id
ORDER BY c.name, p.name;

-- Room types + current rate + inventory for today
SELECT
    p.name             AS property,
    rt.id              AS room_type_id,
    rt.name            AS room_type,
    rt.capacity,
    rp.id              AS rate_plan_id,
    rc.price_amount    AS price_today,
    rc.currency_code,
    ic.available_units AS inventory_today
FROM catalog.property p
JOIN catalog.room_type rt    ON rt.property_id = p.id
LEFT JOIN catalog.rate_plan rp        ON rp.room_type_id = rt.id
LEFT JOIN catalog.rate_calendar rc    ON rc.rate_plan_id = rp.id AND rc.day = CURRENT_DATE
LEFT JOIN catalog.inventory_calendar ic ON ic.room_type_id = rt.id AND ic.day = CURRENT_DATE
ORDER BY p.name, rt.name;

-- Handy: city id lookup by name fragment
-- SELECT id, dane_code, name, department, country FROM catalog.city WHERE name ILIKE '%cancún%';
