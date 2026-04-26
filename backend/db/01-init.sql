-- =============================================
-- TravelHub — Full DDL
-- =============================================
-- Executed by postgres initdb on first container start.
-- Order: schemas → enums → tables (respecting FK deps).

BEGIN;

-- ── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tear down any prior schema so this script is fully re-runnable.
-- Workflow assumption: every run wipes and reseeds. Schemas drop their tables
-- + indexes + FKs via CASCADE; enum types live in ``public`` so they need a
-- separate drop. (``CREATE TYPE`` has no ``IF NOT EXISTS``, hence the wipe.)
DROP SCHEMA IF EXISTS notifications CASCADE;
DROP SCHEMA IF EXISTS payments CASCADE;
DROP SCHEMA IF EXISTS booking CASCADE;
DROP SCHEMA IF EXISTS catalog CASCADE;
DROP SCHEMA IF EXISTS users CASCADE;
DROP TYPE IF EXISTS
    user_role, partner_status,
    cancellation_policy_type, property_status, room_type_status,
    policy_category, discount_type,
    booking_status,
    payment_status, payment_intent_status,
    notification_channel, notification_status
CASCADE;

-- ── Schemas ─────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS booking;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS notifications;

-- ── Enums ───────────────────────────────────────────────

-- users
CREATE TYPE user_role AS ENUM ('TRAVELER','HOTEL','AGENCY','ADMIN');
CREATE TYPE partner_status AS ENUM ('ACTIVE','INACTIVE','SUSPENDED');

-- catalog
CREATE TYPE cancellation_policy_type AS ENUM ('FULL','PARTIAL','NON_REFUNDABLE');
CREATE TYPE property_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE room_type_status AS ENUM ('ACTIVE','INACTIVE');
CREATE TYPE policy_category AS ENUM ('CHECK_IN','CHECK_OUT','PETS','SMOKING','CHILDREN','GENERAL');
CREATE TYPE discount_type AS ENUM ('PERCENT','FIXED');

-- booking
CREATE TYPE booking_status AS ENUM ('CART','PENDING_PAYMENT','PENDING_CONFIRMATION','CONFIRMED','REJECTED','CANCELLED','EXPIRED');

-- payments
CREATE TYPE payment_status AS ENUM ('PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELLED');
CREATE TYPE payment_intent_status AS ENUM ('PENDING','SUCCEEDED','FAILED');

-- notifications
CREATE TYPE notification_channel AS ENUM ('EMAIL','PUSH');
CREATE TYPE notification_status AS ENUM ('PENDING','SENT','FAILED');

-- =============================================
-- Schema: users
-- =============================================

CREATE TABLE users.users (
    id          UUID PRIMARY KEY,
    full_name   VARCHAR,
    email       VARCHAR NOT NULL UNIQUE,
    phone       VARCHAR,
    role        user_role NOT NULL,
    country_code CHAR(2),
    password    BYTEA NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users.hotel (
    id          UUID PRIMARY KEY,
    name        VARCHAR NOT NULL,
    tax_id      VARCHAR,
    status      partner_status NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users.hotel_user (
    id          UUID PRIMARY KEY,
    hotel_id    UUID NOT NULL REFERENCES users.hotel(id),
    user_id     UUID NOT NULL REFERENCES users.users(id),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (hotel_id, user_id)
);

CREATE TABLE users.agency (
    id                  UUID PRIMARY KEY,
    name                VARCHAR NOT NULL,
    tax_id              VARCHAR,
    status              partner_status NOT NULL DEFAULT 'ACTIVE',
    commission_default  DECIMAL(5,2) NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users.agency_user (
    id          UUID PRIMARY KEY,
    agency_id   UUID NOT NULL REFERENCES users.agency(id),
    user_id     UUID NOT NULL REFERENCES users.users(id),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (agency_id, user_id)
);

-- =============================================
-- Schema: catalog
-- =============================================

CREATE TABLE catalog.city (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dane_code   VARCHAR UNIQUE,
    name        VARCHAR NOT NULL,
    department  VARCHAR,
    country     VARCHAR NOT NULL,
    continent   VARCHAR,
    image_url   TEXT
);
CREATE INDEX idx_city_name ON catalog.city (name);

CREATE TABLE catalog.cancellation_policy (
    id              UUID PRIMARY KEY,
    name            VARCHAR NOT NULL,
    type            cancellation_policy_type NOT NULL,
    hours_limit     INT,
    refund_percent  INT,
    active          BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE catalog.property (
    id                              UUID PRIMARY KEY,
    hotel_id                        UUID NOT NULL REFERENCES users.hotel(id),
    name                            VARCHAR NOT NULL,
    description                     TEXT,
    city_id                         UUID NOT NULL REFERENCES catalog.city(id),
    address                         TEXT,
    check_in_time                   TIME,
    check_out_time                  TIME,
    phone                           VARCHAR(30),
    email                           VARCHAR(255),
    website                         VARCHAR(500),
    status                          property_status NOT NULL DEFAULT 'ACTIVE',
    rating_avg                      DECIMAL(3,2) DEFAULT 0,
    review_count                    INT NOT NULL DEFAULT 0,
    popularity_score                DECIMAL(8,2) NOT NULL DEFAULT 0,
    default_cancellation_policy_id  UUID REFERENCES catalog.cancellation_policy(id),
    created_at                      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at                      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_property_city_status ON catalog.property (city_id, status);

CREATE TABLE catalog.property_image (
    id              UUID PRIMARY KEY,
    property_id     UUID NOT NULL REFERENCES catalog.property(id),
    url             TEXT NOT NULL,
    caption         VARCHAR,
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_property_image_order ON catalog.property_image (property_id, display_order);

CREATE TABLE catalog.amenity (
    id      UUID PRIMARY KEY,
    code    VARCHAR NOT NULL UNIQUE,
    name    VARCHAR NOT NULL
);

CREATE TABLE catalog.property_amenity (
    property_id UUID NOT NULL REFERENCES catalog.property(id),
    amenity_id  UUID NOT NULL REFERENCES catalog.amenity(id),
    PRIMARY KEY (property_id, amenity_id)
);

CREATE TABLE catalog.property_policy (
    id              UUID PRIMARY KEY,
    property_id     UUID NOT NULL REFERENCES catalog.property(id),
    category        policy_category NOT NULL,
    description     TEXT NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_property_policy_cat ON catalog.property_policy (property_id, category);

CREATE TABLE catalog.room_type (
    id          UUID PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES catalog.property(id),
    name        VARCHAR NOT NULL,
    description TEXT,
    capacity    INT NOT NULL,
    status      room_type_status NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_room_type_search ON catalog.room_type (property_id, capacity, status);

CREATE TABLE catalog.room_type_amenity (
    room_type_id UUID NOT NULL REFERENCES catalog.room_type(id),
    amenity_id   UUID NOT NULL REFERENCES catalog.amenity(id),
    PRIMARY KEY (room_type_id, amenity_id)
);

CREATE TABLE catalog.room_type_image (
    id              UUID PRIMARY KEY,
    room_type_id    UUID NOT NULL REFERENCES catalog.room_type(id),
    url             TEXT NOT NULL,
    caption         VARCHAR,
    display_order   INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_room_type_image_order ON catalog.room_type_image (room_type_id, display_order);

CREATE TABLE catalog.rate_plan (
    id                      UUID PRIMARY KEY,
    room_type_id            UUID NOT NULL REFERENCES catalog.room_type(id),
    name                    VARCHAR NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT true,
    cancellation_policy_id  UUID REFERENCES catalog.cancellation_policy(id),
    created_at              TIMESTAMP NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_rate_plan_active ON catalog.rate_plan (room_type_id, is_active);

CREATE TABLE catalog.rate_calendar (
    id              UUID PRIMARY KEY,
    rate_plan_id    UUID NOT NULL REFERENCES catalog.rate_plan(id),
    day             DATE NOT NULL,
    currency_code   CHAR(3) NOT NULL,
    price_amount    DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (rate_plan_id, day, currency_code)
);

CREATE TABLE catalog.inventory_calendar (
    id              UUID PRIMARY KEY,
    room_type_id    UUID NOT NULL REFERENCES catalog.room_type(id),
    day             DATE NOT NULL,
    available_units INT NOT NULL CHECK (available_units >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (room_type_id, day)
);

CREATE TABLE catalog.promotion (
    id              UUID PRIMARY KEY,
    rate_plan_id    UUID NOT NULL REFERENCES catalog.rate_plan(id),
    name            VARCHAR NOT NULL,
    discount_type   discount_type NOT NULL,
    discount_value  DECIMAL(12,2) NOT NULL CHECK (discount_value > 0),
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (end_date >= start_date)
);
CREATE INDEX idx_promotion_plan_active
    ON catalog.promotion (rate_plan_id, is_active, start_date, end_date);

CREATE TABLE catalog.review (
    id          UUID PRIMARY KEY,
    booking_id  UUID NOT NULL UNIQUE,
    user_id     UUID NOT NULL REFERENCES users.users(id),
    property_id UUID NOT NULL REFERENCES catalog.property(id),
    rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- =============================================
-- Schema: booking
-- =============================================

CREATE TABLE booking.booking (
    id                          UUID PRIMARY KEY,
    user_id                     UUID NOT NULL REFERENCES users.users(id),
    status                      booking_status NOT NULL,
    checkin                     DATE NOT NULL,
    checkout                    DATE NOT NULL,
    hold_expires_at             TIMESTAMP,
    total_amount                DECIMAL(12,2) NOT NULL,
    currency_code               CHAR(3) NOT NULL,
    property_id                 UUID NOT NULL,
    room_type_id                UUID NOT NULL,
    rate_plan_id                UUID NOT NULL,
    unit_price                  DECIMAL(12,2) NOT NULL,
    policy_type_applied         cancellation_policy_type NOT NULL,
    policy_hours_limit_applied  INT,
    policy_refund_percent_applied INT,
    -- True once Catalog has been told to release the hold (on CANCELLED/EXPIRED).
    -- New CARTs start as FALSE because Catalog is already holding inventory;
    -- legacy rows (pre-integration) default to TRUE (nothing to release).
    inventory_released          BOOLEAN NOT NULL DEFAULT TRUE,
    guests_count                INT NOT NULL DEFAULT 1 CHECK (guests_count BETWEEN 1 AND 20),
    -- Per-night price breakdown captured at cart creation. Authoritative for the
    -- booking total. Shape: [{"day": "YYYY-MM-DD", "price": "140.00", "original_price": "150.00" | null}, ...].
    -- Null on legacy carts created before the variable-pricing rollout.
    nightly_breakdown           JSONB,
    -- Standardised additional charges captured at cart creation. Computed from
    -- subtotal (= total_amount) × shared.pricing constants so search/detail/cart/payment all agree.
    taxes                       DECIMAL(12,2) NOT NULL DEFAULT 0,
    service_fee                 DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at                  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_room_status ON booking.booking (property_id, room_type_id, status);
-- Partial index used by the reconcile job; tiny hot set compared to full booking table.
CREATE INDEX idx_booking_pending_release
    ON booking.booking (status, hold_expires_at)
    WHERE inventory_released = FALSE;

CREATE TABLE booking.guest (
    id          UUID PRIMARY KEY,
    booking_id  UUID NOT NULL REFERENCES booking.booking(id) ON DELETE CASCADE,
    is_primary  BOOLEAN NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    email       VARCHAR(255),
    phone       VARCHAR(32),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_guest_primary_per_booking
    ON booking.guest (booking_id) WHERE is_primary = TRUE;
CREATE INDEX idx_guest_booking ON booking.guest (booking_id);

CREATE TABLE booking.booking_status_history (
    id          UUID PRIMARY KEY,
    booking_id  UUID NOT NULL REFERENCES booking.booking(id),
    from_status booking_status,
    to_status   booking_status NOT NULL,
    reason      VARCHAR,
    changed_by  UUID,
    changed_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- =============================================
-- Schema: payments
-- =============================================

CREATE TABLE payments.payment (
    id                  UUID PRIMARY KEY,
    booking_id          UUID NOT NULL REFERENCES booking.booking(id),
    provider            VARCHAR NOT NULL,
    status              payment_status NOT NULL,
    authorized_amount   DECIMAL(12,2) NOT NULL,
    captured_amount     DECIMAL(12,2),
    currency_code       CHAR(3) NOT NULL,
    payment_token       VARCHAR,
    provider_reference  VARCHAR,
    processed_at        TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE payments.payment_intent (
    id                      UUID PRIMARY KEY,
    booking_id              UUID NOT NULL REFERENCES booking.booking(id),
    user_id                 UUID NOT NULL REFERENCES users.users(id),
    amount                  DECIMAL(12,2) NOT NULL,
    currency_code           CHAR(3) NOT NULL,
    status                  payment_intent_status NOT NULL DEFAULT 'PENDING',
    mock_payment_token      VARCHAR NOT NULL,
    start_idempotency_key   VARCHAR UNIQUE,
    webhook_signing_secret  VARCHAR NOT NULL,
    payment_id              UUID REFERENCES payments.payment(id),
    created_at              TIMESTAMP NOT NULL DEFAULT now(),
    updated_at              TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_intent_booking ON payments.payment_intent (booking_id);
CREATE INDEX idx_payment_intent_user ON payments.payment_intent (user_id);

CREATE TABLE payments.payment_attempt (
    id                  UUID PRIMARY KEY,
    payment_intent_id   UUID NOT NULL REFERENCES payments.payment_intent(id) ON DELETE CASCADE,
    outcome             VARCHAR NOT NULL,
    detail              VARCHAR,
    created_at          TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE payments.webhook_event (
    idempotency_key     VARCHAR PRIMARY KEY,
    payment_intent_id   UUID NOT NULL REFERENCES payments.payment_intent(id),
    received_at         TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE booking.booking
    ADD COLUMN confirmation_payment_intent_id UUID REFERENCES payments.payment_intent(id);

CREATE TABLE payments.refund (
    id          UUID PRIMARY KEY,
    payment_id  UUID NOT NULL REFERENCES payments.payment(id),
    amount      DECIMAL(12,2) NOT NULL,
    status      VARCHAR NOT NULL,
    reason      VARCHAR,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- =============================================
-- Schema: notifications
-- =============================================

CREATE TABLE notifications.notification (
    id                   UUID PRIMARY KEY,
    event_id             UUID NOT NULL UNIQUE,
    booking_id           UUID NOT NULL REFERENCES booking.booking(id),
    user_id              UUID NOT NULL REFERENCES users.users(id),
    channel              notification_channel NOT NULL,
    type                 VARCHAR NOT NULL,
    status               notification_status NOT NULL DEFAULT 'PENDING',
    to_email             VARCHAR,
    provider_message_id  VARCHAR,
    sent_at              TIMESTAMP,
    created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE notifications.device_token (
    id          UUID PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES users.users(id),
    platform    VARCHAR NOT NULL,
    token       TEXT NOT NULL UNIQUE,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_token_user ON notifications.device_token (user_id, platform);

COMMIT;
