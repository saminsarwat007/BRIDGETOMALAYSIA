"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildContractFilename } from "@/lib/utils";

const ContractSchema = z.object({
  student_id: z.string().uuid(),
  field_values: z.record(z.unknown()).default({}),
  notes: z.string().optional().nullable(),
});

export type ContractInput = z.infer<typeof ContractSchema>;

export async function createContractAction(input: ContractInput) {
  const parsed = ContractSchema.parse(input);
  const supabase = createClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("id", parsed.student_id)
    .single();
  if (!student) throw new Error("Student not found");

  const year = new Date().getFullYear();
  const { data: next, error: numErr } = await supabase.rpc("next_number", {
    p_scope: `contract_${year}`,
  });
  if (numErr) throw new Error(numErr.message);
  const contractNumber = `BTM-C-${year}-${String(next).padStart(4, "0")}`;

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      student_id: parsed.student_id,
      contract_number: contractNumber,
      field_values: parsed.field_values,
      notes: parsed.notes ?? null,
    })
    .select("id, contract_number")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/students/${parsed.student_id}`);
  return {
    ok: true,
    id: data.id,
    contract_number: data.contract_number,
    pdf_filename: buildContractFilename(student.full_name),
  };
}

const UpdateSchema = z.object({
  field_values: z.record(z.unknown()).optional(),
  signed: z.boolean().optional(),
  notes: z.string().optional().nullable(),
});

export async function updateContractAction(id: string, input: z.infer<typeof UpdateSchema>) {
  const parsed = UpdateSchema.parse(input);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contracts")
    .update(parsed)
    .eq("id", id)
    .select("student_id")
    .single();
  if (error) throw new Error(error.message);
  if (data?.student_id) revalidatePath(`/admin/students/${data.student_id}`);
  return { ok: true };
}

export async function deleteContractAction(id: string, studentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${studentId}`);
}
