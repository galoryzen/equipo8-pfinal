-- =============================================
-- Experimento 2: Comunicación síncrona Booking → Catalog
-- Schema initialization
-- =============================================

-- Schemas
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS booking;

-- Enable uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Schema: catalog
-- =============================================

CREATE TABLE catalog.property (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country_code CHAR(2) NOT NULL,
    address TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE catalog.room_type (
    id UUID PRIMARY KEY,
    property_id UUID NOT NULL REFERENCES catalog.property(id),
    name VARCHAR(255) NOT NULL,
    capacity INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE catalog.rate_plan (
    id UUID PRIMARY KEY,
    room_type_id UUID NOT NULL REFERENCES catalog.room_type(id),
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_plan_room_active ON catalog.rate_plan(room_type_id, is_active);

CREATE TABLE catalog.rate_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_plan_id UUID NOT NULL REFERENCES catalog.rate_plan(id),
    day DATE NOT NULL,
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',
    price_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(rate_plan_id, day, currency_code)
);

CREATE TABLE catalog.inventory_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_type_id UUID NOT NULL REFERENCES catalog.room_type(id),
    day DATE NOT NULL,
    available_units INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(room_type_id, day)
);

-- Critical index for SELECT FOR UPDATE performance
CREATE INDEX idx_inventory_calendar_room_day
    ON catalog.inventory_calendar(room_type_id, day);

-- =============================================
-- Schema: booking
-- =============================================

CREATE TABLE booking.booking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'CART',
    checkin DATE NOT NULL,
    checkout DATE NOT NULL,
    hold_expires_at TIMESTAMP,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency_code CHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE booking.booking_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES booking.booking(id),
    property_id UUID NOT NULL,
    room_type_id UUID NOT NULL,
    rate_plan_id UUID NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

CREATE INDEX idx_booking_user ON booking.booking(user_id);
CREATE INDEX idx_booking_item_booking ON booking.booking_item(booking_id);
