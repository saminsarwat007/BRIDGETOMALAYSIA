"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteStudentAction } from "@/app/admin/actions/students";

interface Props {
  studentId: string;
  studentName: string;
}

export function DeleteStudentButton({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteStudentAction(studentId);
        router.push("/admin/students");
      } catch (e: any) {
        alert(`Delete failed: ${e.message}`);
        setOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost border border-red-200 text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" /> Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="font-display text-xl text-brand-ink">Delete student?</h3>
            <p className="mt-2 text-sm text-brand-muted">
              This will permanently delete <strong>{studentName}</strong> and all
              associated data (invoices, payments, contracts, stage history). This
              action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="btn-ghost border border-brand-stone"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="btn-ghost bg-red-600 text-white border-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
