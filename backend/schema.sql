-- SQL script to create tables on Neon PostgreSQL database
-- Make sure to run this script in your Neon console or SQL query editor.

-- 1. Create Teachers Table
CREATE TABLE IF NOT EXISTS teachers (
    id UUID PRIMARY KEY,
    teacher_id VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    bootcamp VARCHAR(100) NOT NULL,
    region VARCHAR(50) NOT NULL,
    qr_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 2. Create Workshops Table
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    facilitators JSONB NOT NULL DEFAULT '[]'::jsonb,
    expected_participants INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 3. Create Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    sync_status VARCHAR(20) NOT NULL DEFAULT 'synced',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint to prevent duplicate check-ins for the same teacher and workshop
    UNIQUE (teacher_id, workshop_id)
);
