-- ============================================================================
-- BRIDGE TO MALAYSIA — Full Database Schema
-- ============================================================================
-- This file contains the COMPLETE database schema. To recreate the database
-- from scratch, run this file in the Supabase SQL editor.
--
-- Safe to re-run: all CREATE statements use IF NOT EXISTS and the file ends
-- with idempotent inserts.
-- ============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

do $$ begin
  create type student_stage as enum (
    'initial_consultation',
    'university_application',
    'offer_letter_received',
    'emgs_processing',
    'visa_application',
    'tuition_fee_payment',
    'flight_booking',
    'airport_pickup',
    'medical_check',
    'university_registration'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type doc_status as enum ('pending', 'received', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invoice_status as enum (
    'draft', 'sent', 'partially_paid', 'paid', 'overpaid', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_source as enum ('admin', 'student');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attachment_type as enum (
    'offer_letter', 'evisa', 'emgs_approval', 'tuition_receipt',
    'visa', 'medical', 'flight_ticket', 'other'
  );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Admin profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

-- Students (core records)
create table if not exists public.students (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null,
  passport_no text unique,
  email text,
  phone text,
  address text,
  university text,
  campus text,
  intake text,
  subject_1 text,
  subject_2 text,
  drive_folder_url text,
  drive_folder_id text,
  invoice_subfolder_id text,
  contract_required boolean not null default true,
  current_stage student_stage not null default 'initial_consultation',
  notes text,
  referred_by_name text,
  referred_by_phone text,
  upload_enabled boolean not null default true,
  whatsapp_group_url text,
  agency_referred_at timestamptz,
  agency_referred_to text,
  agency_referred_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent column adds for existing deployments
alter table public.students add column if not exists whatsapp_group_url text;
alter table public.students add column if not exists agency_referred_at timestamptz;
alter table public.students add column if not exists agency_referred_to text;
alter table public.students add column if not exists agency_referred_key text;

create index if not exists students_passport_idx on public.students (passport_no);
create index if not exists students_stage_idx on public.students (current_stage);
create index if not exists students_created_at_idx on public.students (created_at desc);

-- Applications (multiple universities per student)
create table if not exists public.applications (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  university text not null,
  campus text,
  subject text,
  stage student_stage not null default 'initial_consultation',
  status text default 'active',
  created_at timestamptz not null default now()
);

create index if not exists applications_student_idx on public.applications (student_id);

-- Document checklist
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  doc_type text not null,
  status doc_status not null default 'pending',
  rejection_reason text,
  drive_link text,
  updated_at timestamptz not null default now()
);

create index if not exists documents_student_idx on public.documents (student_id);

-- Contracts
create table if not exists public.contracts (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  contract_number text unique not null,
  field_values jsonb not null default '{}'::jsonb,
  signed boolean not null default false,
  signed_at timestamptz,
  signed_ip text,
  drive_file_id text,
  drive_link text,
  generated_at timestamptz not null default now(),
  notes text
);

-- Idempotent column adds for contracts
alter table public.contracts add column if not exists signed_at timestamptz;
alter table public.contracts add column if not exists signed_ip text;

create index if not exists contracts_student_idx on public.contracts (student_id);

-- Invoices
create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  invoice_number text unique not null,
  invoice_type text not null,
  field_values jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'BDT',
  status invoice_status not null default 'draft',
  due_date date,
  drive_file_id text,
  drive_link text,
  pdf_filename text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_student_idx on public.invoices (student_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_number_idx on public.invoices (invoice_number);

-- Payments (records, including student-uploaded receipts)
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount_received numeric(12,2) not null,
  currency text default 'BDT',
  company_account_key text default 'bangladesh_bdt',
  payment_date date not null default current_date,
  payment_method text,
  bank_reference text,
  description text,
  receipt_drive_file_id text,
  receipt_drive_link text,
  source payment_source not null default 'admin',
  status payment_status not null default 'approved',
  recorded_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_idx on public.payments (invoice_id);
create index if not exists payments_student_idx on public.payments (student_id);
create index if not exists payments_status_idx on public.payments (status);

-- Transactions ledger (auto-derived view of all payments + refunds)
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  type text not null check (type in ('payment', 'refund', 'adjustment')),
  amount numeric(12,2) not null,
  currency text default 'BDT',
  company_account_key text default 'bangladesh_bdt',
  occurred_on date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists transactions_student_idx on public.transactions (student_id);

-- Manual refunds / overpayment returns
create table if not exists public.refunds (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('BDT', 'MYR')),
  company_account_key text not null,
  status text not null default 'pending' check (status in ('pending', 'refunded', 'cancelled')),
  reason text,
  notes text,
  refund_method text,
  bank_reference text,
  proof_drive_link text,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists refunds_student_idx on public.refunds (student_id);
create index if not exists refunds_status_idx on public.refunds (status);
create index if not exists refunds_currency_idx on public.refunds (currency);

-- Company bank/cash accounts
create table if not exists public.company_accounts (
  key text primary key,
  label text not null,
  country text not null,
  currency text not null check (currency in ('BDT', 'MYR')),
  opening_balance numeric(12,2) not null default 0,
  notes text,
  updated_at timestamptz not null default now()
);

insert into public.company_accounts (key, label, country, currency, opening_balance)
values
  ('bangladesh_bdt', 'Bangladesh Account', 'Bangladesh', 'BDT', 0),
  ('malaysia_myr', 'Malaysia Account', 'Malaysia', 'MYR', 0)
on conflict (key) do nothing;

-- Referrals
create table if not exists public.referrals (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  referrer_name text not null,
  referrer_phone text,
  commission_amount numeric(12,2) default 0,
  commission_currency text default 'BDT',
  paid boolean not null default false,
  paid_on date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists referrals_student_idx on public.referrals (student_id);

-- Commissions from universities
create table if not exists public.commissions (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references public.students(id) on delete set null,
  university text not null,
  amount numeric not null,
  currency money_currency not null default 'MYR',
  company_account_key text references public.company_accounts(key),
  received_date date,
  notes text,
  created_at timestamptz not null default now()
);

-- Idempotent column adds for commissions
alter table public.commissions add column if not exists company_account_key text references public.company_accounts(key);
alter table public.commissions add column if not exists profit_divided boolean not null default false;
alter table public.commissions add column if not exists divided_at date;
alter table public.commissions add column if not exists divided_notes text;

create index if not exists commissions_student_idx on public.commissions (student_id);

-- Stage history (every stage change + attachment)
create table if not exists public.stage_history (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  stage student_stage not null,
  comment text,
  attachment_label text,
  attachment_kind attachment_type,
  attachment_drive_link text,
  notify_student boolean not null default false,
  changed_by uuid references public.profiles(id),
  changed_at timestamptz not null default now()
);

create index if not exists stage_history_student_idx on public.stage_history (student_id);
create index if not exists stage_history_changed_at_idx on public.stage_history (changed_at desc);

-- Counter sequences for invoice / contract numbering (year-scoped)
create table if not exists public.numbering_counters (
  scope text primary key,
  current_value integer not null default 0
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at on row changes
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students
  for each row execute function public.set_updated_at();

drop trigger if exists invoices_set_updated_at on public.invoices;
create trigger invoices_set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

drop trigger if exists company_accounts_set_updated_at on public.company_accounts;
create trigger company_accounts_set_updated_at before update on public.company_accounts
  for each row execute function public.set_updated_at();

-- Generate sequential number per scope (e.g., BTM-2026-0042)
create or replace function public.next_number(p_scope text) returns integer
language plpgsql as $$
declare
  v_next integer;
begin
  insert into public.numbering_counters(scope, current_value)
    values (p_scope, 1)
    on conflict (scope)
    do update set current_value = numbering_counters.current_value + 1
    returning current_value into v_next;
  return v_next;
end;
$$;

-- Create a profile row when a new auth user is created
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.applications enable row level security;
alter table public.documents enable row level security;
alter table public.contracts enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;
alter table public.refunds enable row level security;
alter table public.company_accounts enable row level security;
alter table public.referrals enable row level security;
alter table public.commissions enable row level security;
alter table public.stage_history enable row level security;
alter table public.numbering_counters enable row level security;

-- Profiles: users can read their own profile
drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select using (auth.uid() = id);

-- All admin tables: any authenticated user can read/write
-- (We trust the admin role since admin signup is controlled.)
do $$
declare t text;
begin
  foreach t in array array[
    'students','applications','documents','contracts','invoices',
    'payments','transactions','refunds','company_accounts','referrals','commissions',
    'stage_history','numbering_counters'
  ] loop
    execute format($f$drop policy if exists "%s_admin_all" on public.%I$f$, t, t);
    execute format($f$create policy "%s_admin_all" on public.%I
      for all using (auth.role() = 'authenticated')
      with check (auth.role() = 'authenticated')$f$, t, t);
  end loop;
end $$;

-- Public student tracking (anonymous lookup by passport)
-- We implement this via a SECURITY DEFINER function instead of broad RLS.

create or replace function public.get_tracking_by_passport(p_passport text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_student public.students;
  v_invoices jsonb;
  v_history jsonb;
  v_contracts jsonb;
begin
  select * into v_student from public.students where passport_no = p_passport;
  if v_student.id is null then
    return null;
  end if;

  -- Invoices with total_paid computed from approved payments
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'invoice_type', i.invoice_type,
    'total_amount', i.total_amount,
    'currency', i.currency,
    'status', i.status,
    'due_date', i.due_date,
    'created_at', i.created_at,
    'total_paid', coalesce((
      select sum(p.amount_received)
      from public.payments p
      where p.invoice_id = i.id and p.status = 'approved'
    ), 0)
  ) order by i.created_at desc), '[]'::jsonb)
  into v_invoices
  from public.invoices i
  where i.student_id = v_student.id and i.status != 'draft';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'stage', h.stage,
    'comment', h.comment,
    'attachment_label', h.attachment_label,
    'attachment_kind', h.attachment_kind,
    'attachment_drive_link', h.attachment_drive_link,
    'changed_at', h.changed_at
  ) order by h.changed_at desc), '[]'::jsonb)
  into v_history
  from public.stage_history h
  where h.student_id = v_student.id;

  -- Contracts
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'contract_number', c.contract_number,
    'signed', c.signed,
    'signed_at', c.signed_at,
    'generated_at', c.generated_at
  ) order by c.generated_at desc), '[]'::jsonb)
  into v_contracts
  from public.contracts c
  where c.student_id = v_student.id;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'id', v_student.id,
      'full_name', v_student.full_name,
      'current_stage', v_student.current_stage,
      'university', v_student.university,
      'campus', v_student.campus,
      'intake', v_student.intake,
      'upload_enabled', v_student.upload_enabled,
      'whatsapp_group_url', v_student.whatsapp_group_url
    ),
    'invoices', v_invoices,
    'stage_history', v_history,
    'contracts', v_contracts
  );
end;
$$;

grant execute on function public.get_tracking_by_passport(text) to anon, authenticated;

-- Allow anonymous to record a payment receipt (student-uploaded)
create or replace function public.submit_student_payment(
  p_passport text,
  p_invoice_id uuid,
  p_amount numeric,
  p_method text,
  p_description text,
  p_receipt_drive_file_id text,
  p_receipt_drive_link text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_student public.students;
  v_invoice public.invoices;
  v_payment_id uuid;
  v_account_key text;
begin
  select * into v_student from public.students where passport_no = p_passport;
  if v_student.id is null then
    return jsonb_build_object('ok', false, 'error', 'student_not_found');
  end if;

  if not v_student.upload_enabled then
    return jsonb_build_object('ok', false, 'error', 'uploads_disabled');
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id;
  if v_invoice.id is null or v_invoice.student_id != v_student.id then
    return jsonb_build_object('ok', false, 'error', 'invoice_not_found');
  end if;

  if coalesce(v_invoice.currency, 'BDT') = 'MYR' then
    v_account_key := 'malaysia_myr';
  else
    v_account_key := 'bangladesh_bdt';
  end if;

  insert into public.payments(
    invoice_id, student_id, amount_received, currency, company_account_key, payment_method, description,
    receipt_drive_file_id, receipt_drive_link, source, status
  ) values (
    p_invoice_id, v_student.id, p_amount, v_invoice.currency, v_account_key, p_method, p_description,
    p_receipt_drive_file_id, p_receipt_drive_link, 'student', 'pending'
  ) returning id into v_payment_id;

  return jsonb_build_object('ok', true, 'payment_id', v_payment_id);
end;
$$;

grant execute on function public.submit_student_payment(text, uuid, numeric, text, text, text, text) to anon, authenticated;

-- ============================================================================
-- SEEDS / DEFAULTS
-- ============================================================================

insert into public.numbering_counters (scope, current_value)
values
  ('invoice_' || to_char(now(), 'YYYY'), 0),
  ('contract_' || to_char(now(), 'YYYY'), 0)
on conflict (scope) do nothing;
