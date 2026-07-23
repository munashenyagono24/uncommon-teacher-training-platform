# Supabase setup for persistent data

## 1) Create a Supabase project

1. Go to https://supabase.com and create a new project.
2. Open Project Settings -> API.
3. Copy these values:
   - Project URL
   - Project API Key (anon/public key)

## 2) Add backend environment variables

Create a file named `.env` inside the `backend` folder with:

```env
PORT=5000
JWT_SECRET=pick-a-long-random-string
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

> The backend reads these values from the `backend/.env` file.

If your Supabase tables use row-level security (RLS), the backend needs the service role key for inserts and updates. The anon key is only safe for frontend reads when policies allow it.

## 3) Create the database tables

Open the Supabase SQL Editor and run the SQL below.

```sql
create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  password text not null,
  role text not null default 'teacher',
  teacher_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists teachers (
  id uuid primary key default uuid_generate_v4(),
  teacher_id text not null unique,
  full_name text not null,
  email text not null,
  phone text not null,
  bootcamp text not null,
  region text not null,
  qr_code text not null,
  created_at timestamptz not null default now(),
  age integer,
  gender text
);

create table if not exists workshops (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  date text not null,
  location text not null,
  facilitators jsonb not null default '[]'::jsonb,
  expected_participants integer not null,
  created_at timestamptz not null default now(),
  start_date text,
  end_date text,
  location_id uuid,
  fund_requisition_id uuid,
  status text default 'planned',
  comments text,
  ministry_contacts jsonb default '[]'::jsonb
);

create table if not exists attendance (
  id uuid primary key default uuid_generate_v4(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  workshop_id uuid not null references workshops(id) on delete cascade,
  check_in_time timestamptz not null,
  status text not null default 'present',
  sync_status text not null default 'synced',
  created_at timestamptz not null default now(),
  attendance_date text not null,
  constraint attendance_unique_per_day unique (teacher_id, workshop_id, attendance_date)
);

create table if not exists locations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  region text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists facilitators (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  role text,
  organization text,
  created_at timestamptz not null default now()
);

create table if not exists ministry_contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  title text,
  ministry text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists fund_requisitions (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  status text not null default 'draft',
  requested_by text not null,
  location_id uuid references locations(id) on delete set null,
  start_date text,
  end_date text,
  currency text not null default 'USD',
  total_amount numeric(12,2) not null default 0,
  notes text,
  facilitator_ids jsonb not null default '[]'::jsonb,
  ministry_contact_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fund_line_items (
  id uuid primary key default uuid_generate_v4(),
  requisition_id uuid not null references fund_requisitions(id) on delete cascade,
  category text not null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit_cost numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0
);
```

## 4) Seed a demo admin user

You can insert one admin row directly so your existing login works:

```sql
insert into users (id, email, password, role, teacher_id, created_at)
values (
  '00000000-0000-0000-0000-000000000000',
  'anesu@uncommon.org',
  '$2b$10$6ou99UNXoIQWDRa36qP1eOfnQCUOUOh8QuaTcjTjF/fTY.djtE/9u',
  'admin',
  null,
  now()
)
on conflict (email) do nothing;
```

## 5) Restart the backend

After adding the `.env` values:

```bash
cd backend
node server.js
```

## 6) What happens next

Once Supabase is configured, the app will stop using the temporary in-memory fallback and will start reading and writing real rows to the Supabase tables.
