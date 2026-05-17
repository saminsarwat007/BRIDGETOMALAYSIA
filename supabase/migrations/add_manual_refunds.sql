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

alter table public.refunds enable row level security;

drop policy if exists "refunds_admin_all" on public.refunds;
create policy "refunds_admin_all" on public.refunds
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
