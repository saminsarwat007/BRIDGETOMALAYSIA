"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentAdminId } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { emailTemplates } from "@/lib/email/templates";

const StageUpdateSchema = z.object({
  student_id: z.string().uuid(),
  stage: z.string(),
  comment: z.string().optional().nullable(),
  attachment_label: z.string().optional().nullable(),
  attachment_kind: z.string().optional().nullable(),
  attachment_drive_link: z.string().url().optional().or(z.literal("")).nullable(),
  notify_student: z.boolean().optional(),
});

export async function addStageUpdateAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
  raw.notify_student = formData.get("notify_student") === "on";

  const parsed = StageUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const data = parsed.data;
  const supabase = createClient();
  const adminId = await getCurrentAdminId();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, email, passport_no")
    .eq("id", data.student_id)
    .single();

  if (!student) throw new Error("Student not found");

  // Insert history record
  const { error: histErr } = await supabase.from("stage_history").insert({
    student_id: data.student_id,
    stage: data.stage,
    comment: data.comment || null,
    attachment_label: data.attachment_label || null,
    attachment_kind: data.attachment_kind || null,
    attachment_drive_link: data.attachment_drive_link || null,
    notify_student: data.notify_student ?? false,
    changed_by: adminId,
  });
  if (histErr) throw new Error(histErr.message);

  // Update current_stage
  const { error: stuErr } = await supabase
    .from("students")
    .update({ current_stage: data.stage })
    .eq("id", data.student_id);
  if (stuErr) throw new Error(stuErr.message);

  // Email student if requested
  if (data.notify_student && student.email) {
    const trackingUrl =
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track/${encodeURIComponent(student.passport_no ?? "")}`;
    const tpl = emailTemplates.stageChange({
      studentName: student.full_name,
      stage: data.stage,
      comment: data.comment ?? undefined,
      attachmentLink: data.attachment_drive_link ?? undefined,
      attachmentLabel: data.attachment_label ?? undefined,
      trackingUrl,
    });
    try {
      await sendEmail({ to: student.email, ...tpl });
    } catch (err) {
      console.error("email send failed", err);
    }
  }

  revalidatePath(`/admin/students/${data.student_id}`);
  revalidatePath("/admin");
}

const QuickStageSchema = z.object({
  student_id: z.string().uuid(),
  stage: z.string(),
});

export async function quickSetStageAction(formData: FormData) {
  const parsed = QuickStageSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error("Invalid payload");

  const supabase = createClient();
  const adminId = await getCurrentAdminId();

  await supabase.from("stage_history").insert({
    student_id: parsed.data.student_id,
    stage: parsed.data.stage,
    changed_by: adminId,
  });

  const { error } = await supabase
    .from("students")
    .update({ current_stage: parsed.data.stage })
    .eq("id", parsed.data.student_id);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/students/${parsed.data.student_id}`);
  revalidatePath("/admin/students");
}

export async function deleteStageHistoryAction(id: string, studentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("stage_history").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${studentId}`);
}
