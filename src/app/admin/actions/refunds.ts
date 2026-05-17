"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { defaultAccountForCurrency } from "@/lib/utils";

const CreateRefundSchema = z.object({
  student_id: z.string().uuid(),
  invoice_id: z.string().uuid().optional().or(z.literal("")),
  amount: z.coerce.number().positive(),
  currency: z.enum(["BDT", "MYR"]),
  company_account_key: z.enum(["bangladesh_bdt", "malaysia_myr"]).optional().or(z.literal("")),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const MarkRefundedSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  refund_method: z.string().optional().nullable(),
  bank_reference: z.string().optional().nullable(),
  proof_drive_link: z.string().url().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
});

export async function createRefundAction(formData: FormData) {
  const parsed = CreateRefundSchema.parse(Object.fromEntries(formData.entries()));
  const accountKey = parsed.company_account_key || defaultAccountForCurrency(parsed.currency);

  const supabase = createClient();
  const { error } = await supabase.from("refunds").insert({
    student_id: parsed.student_id,
    invoice_id: parsed.invoice_id || null,
    amount: parsed.amount,
    currency: parsed.currency,
    company_account_key: accountKey,
    reason: parsed.reason || "Overpayment / refundable balance",
    notes: parsed.notes || null,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/students/${parsed.student_id}`);
  revalidatePath(`/admin/students/${parsed.student_id}?tab=refunds`);
  revalidatePath("/admin/finance");
}

export async function markRefundedAction(formData: FormData) {
  const parsed = MarkRefundedSchema.parse(Object.fromEntries(formData.entries()));

  const supabase = createClient();
  const { error } = await supabase
    .from("refunds")
    .update({
      status: "refunded",
      refund_method: parsed.refund_method || null,
      bank_reference: parsed.bank_reference || null,
      proof_drive_link: parsed.proof_drive_link || null,
      notes: parsed.notes || null,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/students/${parsed.student_id}`);
  revalidatePath(`/admin/students/${parsed.student_id}?tab=refunds`);
  revalidatePath("/admin/finance");
}

export async function cancelRefundAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");

  if (!id || !studentId) throw new Error("Missing refund details");

  const supabase = createClient();
  const { error } = await supabase
    .from("refunds")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/admin/students/${studentId}`);
  revalidatePath(`/admin/students/${studentId}?tab=refunds`);
  revalidatePath("/admin/finance");
}
