import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { StudentForm } from "@/components/admin/student-form";

export const metadata = { title: "New Student — Bridge to Malaysia Admin" };

export default function NewStudentPage() {
  return (
    <div className="p-5 sm:p-8 max-w-3xl">
      <Link href="/admin/students" className="btn-ghost -ml-3">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>
      <div className="mt-4">
        <p className="label-eyebrow">New student</p>
        <h1 className="mt-1 font-display text-3xl text-brand-ink">Onboard a new student</h1>
        <p className="mt-2 text-brand-ink/70 max-w-xl text-sm">
          Add their personal info now — you can always edit, add documents, generate contracts and invoices later.
        </p>
      </div>

      <div className="mt-8">
        <StudentForm mode="create" />
      </div>
    </div>
  );
}
