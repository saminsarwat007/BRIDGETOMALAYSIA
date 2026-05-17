"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { findDocument } from "@/lib/documents";

const DocumentActionSchema = z.object({
  student_id: z.string().uuid(),
  doc_key: z.string().min(1),
  rejection_reason: z.string().optional(),
});

export async function markDocumentReceivedAction(formData: FormData) {
  const parsed = DocumentActionSchema.safeParse({
    student_id: formData.get("student_id"),
    doc_key: formData.get("doc_key"),
  });

  if (!parsed.success) throw new Error("Invalid document request");

  const docDef = findDocument(parsed.data.doc_key);
  if (!docDef) throw new Error("Unknown document type");

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("documents")
    .select("id")
    .eq("student_id", parsed.data.student_id)
    .eq("doc_type", docDef.label)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const payload = {
    status: "received" as const,
    rejection_reason: null,
    updated_at: new Date().toISOString(),
  };

  const result = existing
    ? await supabase.from("documents").update(payload).eq("id", existing.id)
    : await supabase.from("documents").insert({
        student_id: parsed.data.student_id,
        doc_type: docDef.label,
        ...payload,
      });

  if (result.error) throw new Error(result.error.message);

  revalidatePath(`/admin/students/${parsed.data.student_id}`);
  revalidatePath(`/admin/students/${parsed.data.student_id}?tab=documents`);
}

export async function requestDocumentReuploadAction(formData: FormData) {
  const parsed = DocumentActionSchema.safeParse({
    student_id: formData.get("student_id"),
    doc_key: formData.get("doc_key"),
    rejection_reason: formData.get("rejection_reason"),
  });

  if (!parsed.success) throw new Error("Invalid document request");

  const reason = parsed.data.rejection_reason?.trim();
  if (!reason) throw new Error("Please write why the student needs to upload again");

  const docDef = findDocument(parsed.data.doc_key);
  if (!docDef) throw new Error("Unknown document type");

  const supabase = createClient();
  const { data: existing, error: lookupError } = await supabase
    .from("documents")
    .select("id")
    .eq("student_id", parsed.data.student_id)
    .eq("doc_type", docDef.label)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);

  const payload = {
    status: "rejected" as const,
    rejection_reason: reason,
    updated_at: new Date().toISOString(),
  };

  const result = existing
    ? await supabase.from("documents").update(payload).eq("id", existing.id)
    : await supabase.from("documents").insert({
        student_id: parsed.data.student_id,
        doc_type: docDef.label,
        ...payload,
      });

  if (result.error) throw new Error(result.error.message);

  revalidatePath(`/admin/students/${parsed.data.student_id}`);
  revalidatePath(`/admin/students/${parsed.data.student_id}?tab=documents`);
}
