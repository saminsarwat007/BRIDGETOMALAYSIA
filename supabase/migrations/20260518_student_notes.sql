-- Migration: internal admin-only notes per student
-- Run once in Supabase SQL editor.

create table if not exists public.student_notes (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.students(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_notes_student_idx on public.student_notes (student_id);

alter table public.student_notes enable row level security;

-- Trigger: keep updated_at current
create or replace function public.set_student_notes_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists student_notes_updated_at on public.student_notes;
create trigger student_notes_updated_at
  before update on public.student_notes
  for each row execute function public.set_student_notes_updated_at();
