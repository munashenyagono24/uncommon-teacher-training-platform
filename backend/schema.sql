-- SQL script to create tables on Neon PostgreSQL database
-- Make sure to run this script in your Neon console or SQL query editor.

-- 1. Create Teachers Table
CREATE TABLE IF NOT EXISTS teachers
(
    id UUID PRIMARY KEY,
    teacher_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    bootcamp VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    age INTEGER,
    gender VARCHAR(20)
);

-- 2. Create Workshops Table
CREATE TABLE IF NOT EXISTS workshops
(
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    facilitators JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_participants INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    location_id UUID,
    fund_requisition_id UUID,
    status VARCHAR(20) DEFAULT 'planned',
    comments TEXT,
    ministry_contacts JSONB DEFAULT '[]'::jsonb
);

-- 3. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance
(
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    attendance_date VARCHAR(50) NOT NULL,
    -- Unique constraint per teacher, workshop and specific day/date
    UNIQUE (teacher_id, workshop_id, attendance_date)
);

-- ── Step 1: Funds Requisitions Foundation ─────────────────

-- 4. Locations (normalized workshop venues)
CREATE TABLE
IF NOT EXISTS locations
(
    id UUID PRIMARY KEY,
    name VARCHAR
(255) NOT NULL,
    region VARCHAR
(50),
    address VARCHAR
(500),
    created_at TIMESTAMP
WITH TIME ZONE NOT NULL
);

-- 5. Facilitators (people who run workshops)
CREATE TABLE
IF NOT EXISTS facilitators
(
    id UUID PRIMARY KEY,
    name VARCHAR
(100) NOT NULL,
    email VARCHAR
(100),
    phone VARCHAR
(50),
    role VARCHAR
(100),
    organization VARCHAR
(255),
    created_at TIMESTAMP
WITH TIME ZONE NOT NULL
);

-- 6. Ministry contacts
CREATE TABLE
IF NOT EXISTS ministry_contacts
(
    id UUID PRIMARY KEY,
    name VARCHAR
(100) NOT NULL,
    title VARCHAR
(100),
    ministry VARCHAR
(255),
    email VARCHAR
(100),
    phone VARCHAR
(50),
    created_at TIMESTAMP
WITH TIME ZONE NOT NULL
);

-- 7. Fund requisitions (starting point for all workshop data)
CREATE TABLE
IF NOT EXISTS fund_requisitions
(
    id UUID PRIMARY KEY,
    title VARCHAR
(255) NOT NULL,
    status VARCHAR
(20) NOT NULL DEFAULT 'draft',
    requested_by VARCHAR
(100) NOT NULL,
    location_id UUID REFERENCES locations
(id) ON
DELETE
SET NULL
,
    start_date VARCHAR
(50),
    end_date VARCHAR
(50),
    currency VARCHAR
(10) NOT NULL DEFAULT 'USD',
    total_amount DECIMAL
(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    facilitator_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    ministry_contact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP
WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP
WITH TIME ZONE NOT NULL
);

-- 8. Fund line items (budget breakdown per requisition)
CREATE TABLE
IF NOT EXISTS fund_line_items
(
    id UUID PRIMARY KEY,
    requisition_id UUID NOT NULL REFERENCES fund_requisitions
(id) ON
DELETE CASCADE,
    category VARCHAR(100)
NOT NULL,
    description VARCHAR
(500) NOT NULL,
    quantity DECIMAL
(10, 2) NOT NULL DEFAULT 1,
    unit_cost DECIMAL
(12, 2) NOT NULL DEFAULT 0,
    amount DECIMAL
(12, 2) NOT NULL DEFAULT 0
);

-- Add to workshops
start_date DATE NOT NULL,
end_date DATE NOT NULL,          -- same as start_date for single-day
location_id UUID REFERENCES locations
(id),
fund_requisition_id UUID REFERENCES fund_requisitions
(id),
status VARCHAR
(20) DEFAULT 'planned',  -- planned | active | completed
comments TEXT,
ministry_contacts JSONB DEFAULT '[]',  -- or junction table