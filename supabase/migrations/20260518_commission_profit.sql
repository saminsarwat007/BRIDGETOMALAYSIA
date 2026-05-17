-- Migration: add profit_divided fields to commissions
-- Run this once in the Supabase SQL editor.

alter table public.commissions add column if not exists profit_divided boolean not null default false;
alter table public.commissions add column if not exists divided_at date;
alter table public.commissions add column if not exists divided_notes text;
