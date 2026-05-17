"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractDriveFolderId } from "@/lib/utils";

const StudentSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  passport_no: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  university: z.string().optional().nullable(),
  campus: z.string().optional().nullable(),
  intake: z.string().optional().nullable(),
  subject_1: z.string().optional().nullable(),
  subject_2: z.string().optional().nullable(),
  drive_folder_url: z.string().url().optional().or(z.literal("")).nullable(),
  whatsapp_group_url: z.string().url().optional().or(z.literal("")).nullable(),
  contract_required: z.boolean().optional(),
  notes: z.string().optional().nullable(),
  referred_by_name: z.string().optional().nullable(),
  referred_by_phone: z.string().optional().nullable(),
  upload_enabled: z.boolean().optional(),
});

export type StudentFormState =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | null;

function clean<T extends Record<string, unknown>>(input: T): T {
  return Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, v === "" ? null : v])
  ) as T;
}

export async function createStudentAction(
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
  raw.contract_required = formData.get("contract_required") === "on";
  raw.upload_enabled = formData.get("upload_enabled") === "on";

  const parsed = StudentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message])
      ),
    };
  }
  const payload = clean(parsed.data);
  const drive_folder_id = extractDriveFolderId(
    typeof payload.drive_folder_url === "string" ? payload.drive_folder_url : null
  );

  const supabase = createClient();
  const { data, error } = await supabase
    .from("students")
    .insert({ ...payload, drive_folder_id })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/admin/students");
  return { ok: true, id: data.id };
}

export async function updateStudentAction(
  id: string,
  _prev: StudentFormState,
  formData: FormData
): Promise<StudentFormState> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
  raw.contract_required = formData.get("contract_required") === "on";
  raw.upload_enabled = formData.get("upload_enabled") === "on";

  const parsed = StudentSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: Object.fromEntries(
        parsed.error.issues.map((i) => [i.path.join("."), i.message])
      ),
    };
  }
  const payload = clean(parsed.data);
  const drive_folder_id = extractDriveFolderId(
    typeof payload.drive_folder_url === "string" ? payload.drive_folder_url : null
  );

  const supabase = createClient();
  const { error } = await supabase
    .from("students")
    .update({ ...payload, drive_folder_id })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  return { ok: true, id };
}

export async function toggleUploadEnabledAction(id: string, enabled: boolean) {
  const supabase = createClient();
  await supabase.from("students").update({ upload_enabled: enabled }).eq("id", id);
  revalidatePath(`/admin/students/${id}`);
}

export async function deleteStudentAction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/students");
}
