-- Run this in Neon SQL editor if you already created the original tables.
-- Safe to run multiple times (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    address VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS facilitators (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(50),
    role VARCHAR(100),
    organization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS ministry_contacts (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    ministry VARCHAR(255),
    email VARCHAR(100),
    phone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS fund_requisitions (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    requested_by VARCHAR(100) NOT NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    facilitator_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    ministry_contact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE IF NOT EXISTS fund_line_items (
    id UUID PRIMARY KEY,
    requisition_id UUID NOT NULL REFERENCES fund_requisitions(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0
);
