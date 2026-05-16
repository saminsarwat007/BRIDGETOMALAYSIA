"use client";

import { useState, useTransition } from "react";
import { Camera, Loader2, Sparkles, X, CheckCircle2 } from "lucide-react";
import type { PassportData } from "@/lib/ai/gemini";

interface Props {
  /** Called with extracted fields so the parent form can auto-fill */
  onExtracted: (data: PassportData) => void;
}

export function PassportScanner({ onExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<PassportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  function scan() {
    if (!file) return;
    setError(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);

        const res = await fetch("/api/extract-passport", {
          method: "POST",
          body: fd,
        });
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setError(json.error ?? "Failed to scan passport");
          return;
        }

        setResult(json.data);
        onExtracted(json.data);
      } catch {
        setError("Network error — please try again");
      }
    });
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="card-paper p-4 border-l-4 border-l-brand-gold">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-brand-gold/15 p-2 shrink-0">
          <Sparkles className="h-4 w-4 text-brand-bridge" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-brand-ink text-sm">AI Passport Scanner</p>
          <p className="mt-0.5 text-xs text-brand-muted leading-relaxed">
            Upload a photo of the passport bio-data page. Our AI will read and fill in the details automatically.
          </p>
        </div>
      </div>

      {!file && (
        <label className="mt-3 flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-brand-stone bg-brand-cream/40 py-6 px-4 hover:bg-brand-cream transition">
          <Camera className="h-5 w-5 text-brand-bridge" />
          <span className="text-sm font-medium text-brand-ink">Upload passport photo</span>
          <span className="text-xs text-brand-muted">JPG, PNG or WebP · max 10 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
      )}

      {file && preview && (
        <div className="mt-3 space-y-3">
          <div className="relative">
            <img
              src={preview}
              alt="Passport preview"
              className="w-full max-h-48 object-contain rounded-lg border border-brand-stone"
            />
            <button
              type="button"
              onClick={clear}
              className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow hover:bg-white"
            >
              <X className="h-3.5 w-3.5 text-brand-ink" />
            </button>
          </div>

          {!result && !error && (
            <button
              type="button"
              onClick={scan}
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-ink px-4 py-2.5 text-sm font-semibold text-brand-paper hover:bg-brand-bridge transition disabled:opacity-50"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Scanning passport…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Scan & auto-fill</>
              )}
            </button>
          )}

          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
              <p className="text-sm text-rose-700">{error}</p>
              <button
                type="button"
                onClick={scan}
                disabled={isPending}
                className="mt-2 text-xs font-semibold text-rose-700 hover:text-rose-900"
              >
                Try again
              </button>
            </div>
          )}

          {result && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  Details extracted and filled in!
                </p>
                <p className="mt-0.5 text-xs text-emerald-700">
                  Found: {result.full_name ?? "—"} · {result.passport_no ?? "—"}
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  Please verify all fields below are correct before continuing.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
