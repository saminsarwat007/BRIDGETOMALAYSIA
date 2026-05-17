alter table public.payments add column if not exists currency text;
alter table public.payments add column if not exists company_account_key text;
alter table public.transactions add column if not exists currency text;
alter table public.transactions add column if not exists company_account_key text;
alter table public.commissions add column if not exists company_account_key text;

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

update public.payments p
set
  currency = coalesce(p.currency, i.currency),
  company_account_key = coalesce(
    p.company_account_key,
    case when i.currency = 'MYR' then 'malaysia_myr' else 'bangladesh_bdt' end
  )
from public.invoices i
where p.invoice_id = i.id;

update public.commissions
set company_account_key = coalesce(
  company_account_key,
  case when currency = 'MYR' then 'malaysia_myr' else 'bangladesh_bdt' end
);

alter table public.payments alter column currency set default 'BDT';
alter table public.payments alter column company_account_key set default 'bangladesh_bdt';
alter table public.transactions alter column currency set default 'BDT';
alter table public.transactions alter column company_account_key set default 'bangladesh_bdt';

alter table public.company_accounts enable row level security;

drop policy if exists "company_accounts_admin_all" on public.company_accounts;
create policy "company_accounts_admin_all" on public.company_accounts
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

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
    raise exception 'Student not found';
  end if;

  select * into v_invoice
  from public.invoices
  where id = p_invoice_id and student_id = v_student.id;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  if coalesce(v_invoice.currency, 'BDT') = 'MYR' then
    v_account_key := 'malaysia_myr';
  else
    v_account_key := 'bangladesh_bdt';
  end if;

  insert into public.payments(
    invoice_id, student_id, amount_received, currency, company_account_key,
    payment_method, description, receipt_drive_file_id, receipt_drive_link,
    source, status
  ) values (
    p_invoice_id, v_student.id, p_amount, v_invoice.currency, v_account_key,
    p_method, p_description, p_receipt_drive_file_id, p_receipt_drive_link,
    'student', 'pending'
  ) returning id into v_payment_id;

  return jsonb_build_object('ok', true, 'payment_id', v_payment_id);
end;
$$;
