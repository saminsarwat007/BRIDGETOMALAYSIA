"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Upload, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import type { DocumentGuideline } from "@/lib/documents";

interface ExistingDoc {
  doc_type: string;
  status: "pending" | "received" | "rejected";
  rejection_reason: string | null;
  drive_link: string | null;
}

interface Props {
  passport: string;
  doc: DocumentGuideline;
  existing: ExistingDoc | null;
  onClose: () => void;
}

export function DocumentUploadSheet({ passport, doc, existing, onClose }: Props) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function submit() {
    if (!file) {
      toast.error("Pick a file first");
      return;
    }
    if (file.size > doc.maxSizeMB * 1024 * 1024) {
      toast.error(`File too large (max ${doc.maxSizeMB}MB)`);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.append("passport", passport);
      fd.append("doc_type", doc.key);
      fd.append("file", file);
      try {
        const res = await fetch("/api/public/upload-document", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast.error(json.error ?? "Upload failed");
          return;
        }
        toast.success("Uploaded — thank you!");
        onClose();
        router.refresh();
      } catch {
        toast.error("Network error — please try again");
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center sm:justify-center"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-brand-paper rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-brand-paper z-10 px-5 py-4 flex items-start justify-between border-b border-brand-stone">
          <div className="flex-1 min-w-0">
            <p className="label-eyebrow">Upload document</p>
            <h2 className="font-display text-xl text-brand-ink mt-1">{doc.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-brand-stone/40"
          >
            <X className="h-5 w-5 text-brand-muted" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {existing?.status === "rejected" && existing.rejection_reason && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Re-upload requested
              </p>
              <p className="text-sm text-rose-800 mt-1">{existing.rejection_reason}</p>
            </div>
          )}

          {existing?.status === "received" && existing.drive_link && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-emerald-800">Already received</p>
                <p className="text-xs text-emerald-700">
                  Uploading again will replace what we have on file.
                </p>
              </div>
              <a
                href={existing.drive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 shrink-0"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <div>
            <p className="label-eyebrow mb-2">Guidelines</p>
            <ul className="space-y-1.5 text-sm text-brand-ink/80">
              {doc.guidelines.map((g, i) => (
                <li key={i} className="flex gap-2 leading-snug">
                  <span className="text-brand-bridge mt-0.5">·</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-brand-muted">
              Accepted: {doc.acceptedFormats} · Max {doc.maxSizeMB}MB
            </p>
          </div>

          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-brand-stone bg-brand-cream/40 py-8 px-4 hover:bg-brand-cream transition">
            {file ? (
              <>
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <span className="text-sm font-medium text-brand-ink truncate max-w-full">
                  {file.name}
                </span>
                <span className="text-xs text-brand-muted">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · tap to change
                </span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-brand-bridge" />
                <span className="text-sm font-medium text-brand-ink">Choose a file</span>
                <span className="text-xs text-brand-muted">{doc.acceptedFormats}</span>
              </>
            )}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              capture="environment"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={isPending || !file}
            className="btn-gold w-full justify-center"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Upload to my folder
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
