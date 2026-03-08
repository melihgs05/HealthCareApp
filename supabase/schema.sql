-- ============================================================
-- CareBridge Healthcare App — Supabase Database Schema
-- ============================================================
-- Run this SQL in your Supabase project:
-- Dashboard → SQL Editor → New query → paste & run
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- USER PROFILES (extends Supabase auth.users)
-- ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  id         uuid references auth.users(id) on delete cascade primary key,
  name       text        not null,
  email      text        not null unique,
  role       text        not null check (role in ('patient','doctor','admin','personnel')),
  subrole    text        check (subrole in ('lab','nurse','desk') or subrole is null),
  avatar_url text,
  phone      text,
  created_at timestamptz default now()
);

-- Allow users to read/write their own profile
alter table profiles enable row level security;
create policy "Users can view their own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);
-- Admin can view all profiles
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- Doctors/personnel can view patient profiles
create policy "Doctors can view patient profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','personnel'))
);
-- New users can insert their own profile
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

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

alter table patients enable row level security;
create policy "Patients can view own record" on patients for select using (auth.uid() = id);
create policy "Patients can update own record" on patients for update using (auth.uid() = id);
create policy "Doctors can view patients" on patients for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin','personnel'))
);
create policy "Admin/desk can insert patients" on patients for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','personnel'))
  or auth.uid() = id
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

alter table doctors enable row level security;
create policy "Anyone authenticated can view doctors" on doctors for select using (auth.role() = 'authenticated');
create policy "Doctors can update own record" on doctors for update using (auth.uid() = id);
create policy "Doctors can insert own record" on doctors for insert with check (auth.uid() = id);

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

alter table appointments enable row level security;
create policy "Patients can view own appointments" on appointments for select using (auth.uid() = patient_id);
create policy "Doctors can view their appointments" on appointments for select using (auth.uid() = doctor_id);
create policy "Admin/personnel can view all appointments" on appointments for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','personnel'))
);
create policy "Patients can create appointments" on appointments for insert with check (auth.uid() = patient_id);
create policy "Doctors/admin can update appointments" on appointments for update using (
  auth.uid() = doctor_id or
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Patients can cancel appointments" on appointments for update using (auth.uid() = patient_id);

-- ──────────────────────────────────────────────────────────────
-- DOCTOR AVAILABILITY (weekly recurring slots)
-- ──────────────────────────────────────────────────────────────
create table if not exists doctor_availability (
  id                     uuid primary key default gen_random_uuid(),
  doctor_id              uuid not null references profiles(id) on delete cascade,
  day_of_week            int  not null check (day_of_week between 0 and 6),
  start_time             time not null,
  end_time               time not null,
  slot_duration_minutes  int  not null default 30,
  unique (doctor_id, day_of_week, start_time)
);

alter table doctor_availability enable row level security;
create policy "Anyone authenticated can view availability" on doctor_availability for select using (auth.role() = 'authenticated');
create policy "Doctors can manage own availability" on doctor_availability for all using (auth.uid() = doctor_id);

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

alter table doctor_blocked_times enable row level security;
create policy "Anyone authenticated can view blocked times" on doctor_blocked_times for select using (auth.role() = 'authenticated');
create policy "Doctors can manage own blocked times" on doctor_blocked_times for all using (auth.uid() = doctor_id);

-- ──────────────────────────────────────────────────────────────
-- MEDICATIONS
-- ──────────────────────────────────────────────────────────────
create table if not exists medications (
  id           uuid        primary key default gen_random_uuid(),
  patient_id   uuid        not null references profiles(id) on delete cascade,
  prescribed_by uuid       references profiles(id),
  name         text        not null,
  dosage       text        not null,
  schedule     text        not null,
  active       boolean     not null default true,
  start_date   date,
  end_date     date,
  notes        text,
  created_at   timestamptz default now()
);

alter table medications enable row level security;
create policy "Patients can view own medications" on medications for select using (auth.uid() = patient_id);
create policy "Doctors/personnel can view medications" on medications for select using (
  auth.uid() = prescribed_by or
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin','personnel'))
);
create policy "Doctors can manage medications" on medications for all using (
  auth.uid() = prescribed_by or
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin'))
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

alter table prescriptions enable row level security;
create policy "Patients can view own prescriptions" on prescriptions for select using (auth.uid() = patient_id);
create policy "Doctors can view/create prescriptions" on prescriptions for select using (auth.uid() = doctor_id);
create policy "Doctors can create prescriptions" on prescriptions for insert with check (auth.uid() = doctor_id);
create policy "Admin can view all prescriptions" on prescriptions for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
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

alter table test_results enable row level security;
create policy "Patients can view own results" on test_results for select using (auth.uid() = patient_id);
create policy "Doctors/personnel can view results" on test_results for select using (
  auth.uid() = ordered_by or
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin','personnel'))
);
create policy "Doctors/personnel can create results" on test_results for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin','personnel'))
);
create policy "Authorized can update results" on test_results for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin','personnel'))
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

alter table messages enable row level security;
create policy "Users can view messages they received" on messages for select using (auth.uid() = to_user_id);
create policy "Users can view messages they sent" on messages for select using (auth.uid() = from_user_id);
create policy "Users can send messages" on messages for insert with check (auth.uid() = from_user_id);
create policy "Recipients can mark messages read" on messages for update using (auth.uid() = to_user_id);

-- ──────────────────────────────────────────────────────────────
-- PATIENT NOTES (with role visibility)
-- ──────────────────────────────────────────────────────────────
create table if not exists patient_notes (
  id             uuid        primary key default gen_random_uuid(),
  patient_id     uuid        not null references profiles(id) on delete cascade,
  author_id      uuid        not null references profiles(id),
  content        text        not null,
  visibility     text        not null default 'doctor'
                 check (visibility in ('doctor','admin','all')),
  appointment_id uuid        references appointments(id) on delete set null,
  created_at     timestamptz default now()
);

alter table patient_notes enable row level security;
-- Patient sees only notes with visibility='all'
create policy "Patients can view public notes" on patient_notes for select using (
  auth.uid() = patient_id and visibility = 'all'
);
-- Doctor sees notes where they are the author OR notes with at least doctor visibility for their patients
create policy "Doctors can view doctor-level notes" on patient_notes for select using (
  auth.uid() = author_id or
  (visibility in ('doctor','admin','all') and
   exists (select 1 from appointments a where a.patient_id = patient_notes.patient_id and a.doctor_id = auth.uid()))
);
-- Admin sees everything
create policy "Admin can view all notes" on patient_notes for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Doctors/personnel can create notes" on patient_notes for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin','personnel'))
);
create policy "Authors can update own notes" on patient_notes for update using (auth.uid() = author_id);

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

alter table activity_log enable row level security;
create policy "Users can view own activity" on activity_log for select using (auth.uid() = user_id);
create policy "Admin can view all activity" on activity_log for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Authenticated can insert activity" on activity_log for insert with check (auth.uid() = user_id);

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

alter table notifications enable row level security;
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users can mark notifications read" on notifications for update using (auth.uid() = user_id);
create policy "System can create notifications" on notifications for insert with check (true);

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

alter table personnel_tasks enable row level security;
create policy "Personnel can view assigned tasks" on personnel_tasks for select using (
  auth.uid() = assigned_to or auth.uid() = assigned_by
);
create policy "Doctors/admin can create tasks" on personnel_tasks for insert with check (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin'))
);
create policy "Personnel can update assigned tasks" on personnel_tasks for update using (
  auth.uid() = assigned_to or auth.uid() = assigned_by or
  exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('doctor','admin'))
);
create policy "Admin can view all tasks" on personnel_tasks for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
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

alter table personnel_permissions enable row level security;
create policy "Admin can manage permissions" on personnel_permissions for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Personnel can view own subrole permissions" on personnel_permissions for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.subrole = personnel_permissions.subrole)
);

-- ──────────────────────────────────────────────────────────────
-- SYSTEM SETTINGS (includes demo_mode flag)
-- ──────────────────────────────────────────────────────────────
create table if not exists system_settings (
  key        text        primary key,
  value      text        not null,
  updated_at timestamptz default now()
);

alter table system_settings enable row level security;
create policy "Admin can manage system settings" on system_settings for all using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
create policy "Anyone can read demo_mode setting" on system_settings for select using (key = 'demo_mode');

-- ──────────────────────────────────────────────────────────────
-- SEED DEFAULT SYSTEM SETTINGS
-- ──────────────────────────────────────────────────────────────
insert into system_settings (key, value) values
  ('demo_mode', 'false'),
  ('app_name', 'CareBridge'),
  ('hospital_name', 'CareBridge Medical Center')
on conflict (key) do nothing;

-- Seed default personnel permissions
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
-- TRIGGER: auto-create profile after auth signup
-- ──────────────────────────────────────────────────────────────
create or replace function handle_new_user() returns trigger as $$
begin
  insert into profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'patient')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: create patient/doctor record after profile insert
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
$$ language plpgsql security definer;

create or replace trigger on_profile_created
  after insert on profiles
  for each row execute procedure handle_new_profile();

-- ──────────────────────────────────────────────────────────────
-- INDEXES for common queries
-- ──────────────────────────────────────────────────────────────
create index if not exists idx_appointments_patient on appointments(patient_id, date);
create index if not exists idx_appointments_doctor  on appointments(doctor_id, date);
create index if not exists idx_medications_patient  on medications(patient_id, active);
create index if not exists idx_messages_to_user     on messages(to_user_id, read);
create index if not exists idx_messages_from_user   on messages(from_user_id);
create index if not exists idx_notifications_user   on notifications(user_id, read);
create index if not exists idx_activity_user        on activity_log(user_id, created_at);
create index if not exists idx_tasks_assigned_to    on personnel_tasks(assigned_to, status);
create index if not exists idx_patient_notes        on patient_notes(patient_id, created_at);
create index if not exists idx_prescriptions_patient on prescriptions(patient_id);
create index if not exists idx_test_results_patient on test_results(patient_id, date);
