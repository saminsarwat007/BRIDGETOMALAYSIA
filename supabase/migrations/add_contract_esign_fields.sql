-- Add e-signature metadata to contracts table
alter table public.contracts add column if not exists signed_at timestamptz;
alter table public.contracts add column if not exists signed_ip text;

-- Update the tracking RPC to include contracts
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'invoice_number', i.invoice_number,
    'invoice_type', i.invoice_type,
    'total_amount', i.total_amount,
    'currency', i.currency,
    'status', i.status,
    'due_date', i.due_date,
    'created_at', i.created_at
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
      'upload_enabled', v_student.upload_enabled
    ),
    'invoices', v_invoices,
    'stage_history', v_history,
    'contracts', v_contracts
  );
end;
$$;
