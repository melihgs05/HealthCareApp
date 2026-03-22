-- ============================================================
-- CareBridge Healthcare App — Neon PostgreSQL Schema
-- ============================================================
-- Run this SQL in your Neon project:
-- Dashboard → SQL Editor → paste & run
-- ============================================================
-- DIFFERENCES FROM supabase/schema.sql:
--  • profiles.id is a standalone UUID primary key (no auth.users FK)
--  • profiles.password_hash column added for custom auth
--  • No Supabase auth.uid() / auth.role() RLS policies
--  • No Supabase auth triggers (handle_new_user)
--  • audit_logs table added
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- USER PROFILES
-- ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  email         text        not null unique,
  role          text        not null check (role in ('patient','doctor','admin','personnel')),
  subrole       text        check (subrole in ('lab','nurse','desk') or subrole is null),
  avatar_url    text,
  phone         text,
  password_hash text,
  created_at    timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- PATIENTS (extra medical info)
-- ──────────────────────────────────────────────────────────────
create table if not exists patients (
  id                uuid references profiles(id) on delete cascade primary key,
  mrn               text unique not null,
  dob               date        not null,
  insurance         text,
  primary_doctor_id uuid        references profiles(id),
  city              text,
  address           text
);

-- ──────────────────────────────────────────────────────────────
-- DOCTORS (extra info)
-- ──────────────────────────────────────────────────────────────
create table if not exists doctors (
  id                uuid references profiles(id) on delete cascade primary key,
  specialty         text,
  license_number    text,
  bio               text,
  consultation_room text
);

-- ──────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ──────────────────────────────────────────────────────────────
create table if not exists appointments (
  id         uuid        primary key default gen_random_uuid(),
  patient_id uuid        not null references profiles(id) on delete cascade,
  doctor_id  uuid        not null references profiles(id),
  date       date        not null,
  time       time        not null,
  type       text        not null,
  location   text,
  status     text        not null default 'Upcoming'
             check (status in ('Upcoming','Completed','Cancelled','No-show')),
  notes      text,
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- DOCTOR AVAILABILITY (weekly recurring slots)
-- ──────────────────────────────────────────────────────────────
create table if not exists doctor_availability (
  id                    uuid primary key default gen_random_uuid(),
  doctor_id             uuid not null references profiles(id) on delete cascade,
  day_of_week           int  not null check (day_of_week between 0 and 6),
  start_time            time not null,
  end_time              time not null,
  slot_duration_minutes int  not null default 30,
  unique (doctor_id, day_of_week, start_time)
);

-- ──────────────────────────────────────────────────────────────
-- DOCTOR BLOCKED TIMES (vacation, lunch, etc.)
-- ──────────────────────────────────────────────────────────────
create table if not exists doctor_blocked_times (
  id         uuid primary key default gen_random_uuid(),
  doctor_id  uuid not null references profiles(id) on delete cascade,
  date       date not null,
  start_time time not null,
  end_time   time not null,
  reason     text
);

-- ──────────────────────────────────────────────────────────────
-- MEDICATIONS
-- ──────────────────────────────────────────────────────────────
create table if not exists medications (
  id            uuid        primary key default gen_random_uuid(),
  patient_id    uuid        not null references profiles(id) on delete cascade,
  prescribed_by uuid        references profiles(id),
  name          text        not null,
  dosage        text        not null,
  schedule      text        not null,
  active        boolean     not null default true,
  start_date    date,
  end_date      date,
  notes         text,
  created_at    timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- PRESCRIPTIONS (e-prescribe)
-- ──────────────────────────────────────────────────────────────
create table if not exists prescriptions (
  id            uuid        primary key default gen_random_uuid(),
  medication_id uuid        references medications(id) on delete set null,
  doctor_id     uuid        not null references profiles(id),
  patient_id    uuid        not null references profiles(id) on delete cascade,
  issued_date   date        not null default current_date,
  refills       int         not null default 0,
  pharmacy      text,
  instructions  text        not null,
  created_at    timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- TEST RESULTS
-- ──────────────────────────────────────────────────────────────
create table if not exists test_results (
  id         uuid        primary key default gen_random_uuid(),
  patient_id uuid        not null references profiles(id) on delete cascade,
  ordered_by uuid        references profiles(id),
  date       date        not null,
  type       text        not null,
  summary    text        not null,
  status     text        not null default 'In progress'
             check (status in ('Normal','Follow up','In progress')),
  file_url   text,
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- MESSAGES (internal messaging)
-- ──────────────────────────────────────────────────────────────
create table if not exists messages (
  id           uuid        primary key default gen_random_uuid(),
  from_user_id uuid        not null references profiles(id),
  to_user_id   uuid        not null references profiles(id),
  subject      text        not null,
  body         text        not null,
  read         boolean     not null default false,
  parent_id    uuid        references messages(id),
  created_at   timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- PATIENT NOTES (with role visibility)
-- ──────────────────────────────────────────────────────────────
create table if not exists patient_notes (
  id             uuid        primary key default gen_random_uuid(),
  patient_id     uuid        not null references profiles(id) on delete cascade,
  author_id      uuid        not null references profiles(id),
  content        text        not null,
  visibility     text        not null default '["doctor"]',
  appointment_id uuid        references appointments(id) on delete set null,
  created_at     timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- ACTIVITY LOG
-- ──────────────────────────────────────────────────────────────
create table if not exists activity_log (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references profiles(id) on delete cascade,
  type        text        not null,
  description text        not null,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- AUDIT LOGS (HIPAA PHI access tracking)
-- ──────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id            uuid        primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       text,
  user_name     text,
  user_role     text,
  action        text        not null,
  resource_type text,
  resource_id   text,
  patient_id    text,
  patient_name  text,
  device        text
);

-- ──────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ──────────────────────────────────────────────────────────────
create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       text        not null default 'info'
             check (type in ('info','success','warning','alert')),
  title      text        not null,
  message    text        not null,
  read       boolean     not null default false,
  created_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- PERSONNEL TASKS (nurse, lab, desk todo items)
-- ──────────────────────────────────────────────────────────────
create table if not exists personnel_tasks (
  id          uuid        primary key default gen_random_uuid(),
  assigned_to uuid        not null references profiles(id),
  assigned_by uuid        not null references profiles(id),
  patient_id  uuid        references profiles(id),
  title       text        not null,
  description text,
  priority    text        not null default 'medium'
              check (priority in ('low','medium','high','urgent')),
  status      text        not null default 'pending'
              check (status in ('pending','in_progress','completed','cancelled')),
  due_date    timestamptz,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- PERSONNEL PERMISSIONS (admin-configurable per subrole)
-- ──────────────────────────────────────────────────────────────
create table if not exists personnel_permissions (
  id         uuid        primary key default gen_random_uuid(),
  subrole    text        not null check (subrole in ('lab','nurse','desk')),
  permission text        not null,
  granted    boolean     not null default false,
  updated_by uuid        references profiles(id),
  updated_at timestamptz default now(),
  unique (subrole, permission)
);

-- ──────────────────────────────────────────────────────────────
-- SYSTEM SETTINGS (includes demo_mode flag)
-- ──────────────────────────────────────────────────────────────
create table if not exists system_settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- SEED DEFAULT DATA
-- ──────────────────────────────────────────────────────────────
insert into system_settings (key, value) values
  ('demo_mode',      'false'),
  ('app_name',       'CareBridge'),
  ('hospital_name',  'CareBridge Medical Center')
on conflict (key) do nothing;

insert into personnel_permissions (subrole, permission, granted) values
  ('desk',  'create_patient',        true),
  ('desk',  'view_appointments',     true),
  ('desk',  'manage_appointments',   true),
  ('desk',  'view_patient_basic',    true),
  ('desk',  'send_messages',         false),
  ('nurse', 'view_patient_basic',    true),
  ('nurse', 'view_medications',      true),
  ('nurse', 'add_vitals',            true),
  ('nurse', 'view_tasks',            true),
  ('nurse', 'complete_tasks',        true),
  ('nurse', 'send_messages',         true),
  ('lab',   'view_patient_basic',    true),
  ('lab',   'view_test_results',     true),
  ('lab',   'create_test_results',   true),
  ('lab',   'update_test_results',   true),
  ('lab',   'view_tasks',            true),
  ('lab',   'complete_tasks',        true)
on conflict (subrole, permission) do nothing;

-- ──────────────────────────────────────────────────────────────
-- MRN AUTO-GENERATION FUNCTION
-- ──────────────────────────────────────────────────────────────
create or replace function generate_mrn() returns text as $$
declare
  new_mrn text;
  counter int;
begin
  select count(*) + 1 into counter from patients;
  new_mrn := 'MRN-' || lpad(counter::text, 6, '0');
  return new_mrn;
end;
$$ language plpgsql;

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-create patient/doctor record after profile insert
-- ──────────────────────────────────────────────────────────────
create or replace function handle_new_profile() returns trigger as $$
begin
  if new.role = 'patient' then
    insert into patients (id, mrn, dob)
    values (new.id, generate_mrn(), current_date)
    on conflict (id) do nothing;
  elsif new.role = 'doctor' then
    insert into doctors (id)
    values (new.id)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger on_profile_created
  after insert on profiles
  for each row execute procedure handle_new_profile();
