"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createNoteAction(studentId: string, content: string) {
  if (!content.trim()) throw new Error("Note content is required");
  const supabase = createClient();
  const { error } = await supabase
    .from("student_notes")
    .insert({ student_id: studentId, content: content.trim() });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${studentId}`);
}

export async function updateNoteAction(id: string, studentId: string, content: string) {
  if (!content.trim()) throw new Error("Note content is required");
  const supabase = createClient();
  const { error } = await supabase
    .from("student_notes")
    .update({ content: content.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${studentId}`);
}

export async function deleteNoteAction(id: string, studentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("student_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/students/${studentId}`);
}
