import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StudentForm } from "@/components/admin/student-form";

export const dynamic = "force-dynamic";

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!student) notFound();

  return (
    <div className="p-5 sm:p-8 max-w-3xl">
      <Link href={`/admin/students/${params.id}`} className="btn-ghost -ml-3">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <div className="mt-4">
        <p className="label-eyebrow">Editing</p>
        <h1 className="mt-1 font-display text-3xl text-brand-ink">{student.full_name}</h1>
      </div>
      <div className="mt-8">
        <StudentForm mode="edit" student={student as any} />
      </div>
    </div>
  );
}
