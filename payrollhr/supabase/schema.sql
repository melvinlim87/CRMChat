-- PayrollHR Schema for Supabase PostgreSQL
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text default '',
  logo_url text default '',
  created_at timestamptz default now()
);

create table staff (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  role text not null default 'staff',
  title text default '',
  dept text default '',
  email text default '',
  dob date,
  residency text default 'citizen',
  monthly_wage numeric(12,2) default 0,
  join_date date,
  exit_date date,
  probation_months int default 3,
  community text default 'chinese',
  gender text default 'M',
  nationality text default 'Singaporean',
  nric text default '',
  phone text default '',
  address text default '',
  work_area text default 'singapore',
  work_country text default '',
  other_currency text default '',
  nat_currency text default '',
  nat_basic numeric(12,2),
  nat_allow numeric(12,2),
  nat_bonus numeric(12,2),
  marital_status text default 'single',
  work_days int[] default array[1,2,3,4,5],
  manager_id uuid references staff(id) on delete set null,
  temp_pw boolean default true,
  is_system boolean default false,
  created_at timestamptz default now()
);

create table staff_allowances (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  name text not null,
  amount numeric(10,2) default 0
);

create table staff_children (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  name text not null,
  dob date
);

create table staff_documents (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  doc_type text not null,
  name text not null,
  uploaded_at date default current_date,
  locked boolean default false
);

create table leave_entitlements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  leave_type text not null,
  days int default 0,
  unique(company_id, leave_type)
);

create table staff_entitlements (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  leave_type text not null,
  days int,
  unique(staff_id, leave_type)
);

create table brought_forward (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  leave_type text not null,
  year int not null,
  days numeric(5,1) default 0,
  remark text default '',
  unique(staff_id, leave_type, year)
);

create table leave_applications (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  leave_type text not null,
  from_date date not null,
  to_date date not null,
  days int not null,
  reason text default '',
  mc_filename text default '',
  status text default 'pending',
  verified boolean default false,
  applied_at date default current_date,
  created_at timestamptz default now()
);

create table payroll_vars (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  month int not null,
  year int not null,
  bonus numeric(12,2) default 0,
  ot_hours numeric(6,2) default 0,
  ph_worked int default 0,
  unique(staff_id, month, year)
);

create table payroll_published (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  month int not null,
  year int not null,
  published boolean default false,
  published_at timestamptz,
  unique(company_id, month, year)
);

create table absences (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  absence_date date not null,
  unique(staff_id, absence_date)
);

create table extra_work (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  work_date date not null,
  unique(staff_id, work_date)
);

create table clock_data (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid references staff(id) on delete cascade,
  clock_date date not null,
  clock_in time,
  clock_out time,
  unique(staff_id, clock_date)
);

create table work_hours (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  start_time time default '09:00',
  end_time time default '18:00',
  unique(company_id)
);

create table company_holidays (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  holiday_date date not null,
  name text not null,
  in_lieu boolean default false,
  unique(company_id, holiday_date)
);

create table announcements (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  title text not null,
  body text not null,
  by_name text not null,
  created_at timestamptz default now()
);

-- RLS
alter table companies enable row level security;
alter table staff enable row level security;
alter table staff_allowances enable row level security;
alter table staff_children enable row level security;
alter table staff_documents enable row level security;
alter table leave_entitlements enable row level security;
alter table staff_entitlements enable row level security;
alter table brought_forward enable row level security;
alter table leave_applications enable row level security;
alter table payroll_vars enable row level security;
alter table payroll_published enable row level security;
alter table absences enable row level security;
alter table extra_work enable row level security;
alter table clock_data enable row level security;
alter table work_hours enable row level security;
alter table company_holidays enable row level security;
alter table announcements enable row level security;

create policy "Authenticated full access" on companies for all to authenticated using (true);
create policy "Authenticated full access" on staff for all to authenticated using (true);
create policy "Authenticated full access" on staff_allowances for all to authenticated using (true);
create policy "Authenticated full access" on staff_children for all to authenticated using (true);
create policy "Authenticated full access" on staff_documents for all to authenticated using (true);
create policy "Authenticated full access" on leave_entitlements for all to authenticated using (true);
create policy "Authenticated full access" on staff_entitlements for all to authenticated using (true);
create policy "Authenticated full access" on brought_forward for all to authenticated using (true);
create policy "Authenticated full access" on leave_applications for all to authenticated using (true);
create policy "Authenticated full access" on payroll_vars for all to authenticated using (true);
create policy "Authenticated full access" on payroll_published for all to authenticated using (true);
create policy "Authenticated full access" on absences for all to authenticated using (true);
create policy "Authenticated full access" on extra_work for all to authenticated using (true);
create policy "Authenticated full access" on clock_data for all to authenticated using (true);
create policy "Authenticated full access" on work_hours for all to authenticated using (true);
create policy "Authenticated full access" on company_holidays for all to authenticated using (true);
create policy "Authenticated full access" on announcements for all to authenticated using (true);

-- Seed data
insert into companies (id, name, address) values
  ('00000000-0000-0000-0000-000000000001', 'AlgoVenture Pte Ltd', '10 Anson Road, #20-01, International Plaza, Singapore 079903'),
  ('00000000-0000-0000-0000-000000000002', 'ClawDeploy SG Pte Ltd', '71 Ayer Rajah Crescent, Singapore 139951');

insert into leave_entitlements (company_id, leave_type, days) values
  ('00000000-0000-0000-0000-000000000001', 'annual', 14),
  ('00000000-0000-0000-0000-000000000001', 'medical', 14),
  ('00000000-0000-0000-0000-000000000001', 'hospital', 60),
  ('00000000-0000-0000-0000-000000000001', 'paternity', 14),
  ('00000000-0000-0000-0000-000000000001', 'maternity', 112),
  ('00000000-0000-0000-0000-000000000001', 'childcare', 6),
  ('00000000-0000-0000-0000-000000000001', 'unpaid', 0);

insert into work_hours (company_id, start_time, end_time) values
  ('00000000-0000-0000-0000-000000000001', '09:00', '18:00');

insert into company_holidays (company_id, holiday_date, name, in_lieu) values
  ('00000000-0000-0000-0000-000000000001', '2026-01-01', 'New Year''s Day', false),
  ('00000000-0000-0000-0000-000000000001', '2026-02-17', 'Chinese New Year', false),
  ('00000000-0000-0000-0000-000000000001', '2026-02-18', 'Chinese New Year', false),
  ('00000000-0000-0000-0000-000000000001', '2026-03-21', 'Hari Raya Puasa', false),
  ('00000000-0000-0000-0000-000000000001', '2026-04-03', 'Good Friday', false),
  ('00000000-0000-0000-0000-000000000001', '2026-05-01', 'Labour Day', false),
  ('00000000-0000-0000-0000-000000000001', '2026-05-27', 'Hari Raya Haji', false),
  ('00000000-0000-0000-0000-000000000001', '2026-05-31', 'Vesak Day', false),
  ('00000000-0000-0000-0000-000000000001', '2026-06-01', 'Vesak Day (in lieu)', true),
  ('00000000-0000-0000-0000-000000000001', '2026-08-09', 'National Day', false),
  ('00000000-0000-0000-0000-000000000001', '2026-08-10', 'National Day (in lieu)', true),
  ('00000000-0000-0000-0000-000000000001', '2026-11-08', 'Deepavali', false),
  ('00000000-0000-0000-0000-000000000001', '2026-11-09', 'Deepavali (in lieu)', true),
  ('00000000-0000-0000-0000-000000000001', '2026-12-25', 'Christmas Day', false);
