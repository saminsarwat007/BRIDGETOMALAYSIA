"use client";

import { useState, useTransition } from "react";
import { Upload, UploadOff } from "lucide-react";
import { toggleUploadEnabledAction } from "@/app/admin/actions/students";

export function UploadToggleButton({
  studentId,
  uploadEnabled,
}: {
  studentId: string;
  uploadEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(uploadEnabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const next = !enabled;
      setEnabled(next);
      await toggleUploadEnabledAction(studentId, next);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={enabled ? "Uploads enabled — click to disable" : "Uploads disabled — click to enable"}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
          : "border-brand-stone bg-brand-cream text-brand-muted hover:bg-brand-stone/30"
      }`}
    >
      {enabled ? <Upload className="h-3.5 w-3.5" /> : <UploadOff className="h-3.5 w-3.5" />}
      {enabled ? "Uploads on" : "Uploads off"}
    </button>
  );
}
