"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { X, Upload, Loader2, CheckCircle2 } from "lucide-react";
import type { TrackingPayload } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

interface Props {
  passport: string;
  invoice: TrackingPayload["invoices"][number];
  onClose: () => void;
}

export function ReceiptUploadSheet({ passport, invoice, onClose }: Props) {
  const [amount, setAmount] = useState<string>(String(invoice.total_amount));
  const [method, setMethod] = useState("Bank Transfer");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please attach a payment screenshot");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("passport", passport);
        fd.append("invoice_id", invoice.id);
        fd.append("amount", amount);
        fd.append("method", method);
        fd.append("description", description);

        const res = await fetch("/api/public/upload-receipt", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          toast.error(data.error ?? "Couldn't upload receipt");
          return;
        }
        setDone(true);
        toast.success("Receipt submitted!");
      } catch (err) {
        console.error(err);
        toast.error("Network error — please try again");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-brand-ink/40 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-md bg-brand-paper rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 rounded-full p-2 hover:bg-brand-stone/40"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="mt-4 font-display text-2xl text-brand-ink">Receipt submitted</h2>
            <p className="mt-2 text-sm text-brand-ink/70">
              Our team will review and confirm shortly. You'll see this invoice marked as paid once we verify.
            </p>
            <button onClick={onClose} className="btn-gold mt-6 w-full">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 pb-8">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-brand-stone sm:hidden mb-4" />

            <p className="label-eyebrow">Submit payment</p>
            <h2 className="mt-1 font-display text-2xl text-brand-ink">{invoice.invoice_type}</h2>
            <div className="mt-1 text-sm text-brand-muted font-mono">{invoice.invoice_number}</div>
            <div className="mt-3 text-brand-ink/70 text-sm">
              Invoice total: <span className="font-semibold text-brand-ink">{formatCurrency(invoice.total_amount, invoice.currency)}</span>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label htmlFor="amount" className="text-sm font-medium text-brand-ink">
                  Amount paid ({invoice.currency})
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-paper mt-1.5"
                />
              </div>

              <div>
                <label htmlFor="method" className="text-sm font-medium text-brand-ink">
                  Payment method
                </label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="input-paper mt-1.5"
                >
                  <option>Bank Transfer</option>
                  <option>bKash</option>
                  <option>Nagad</option>
                  <option>Rocket</option>
                  <option>Cash Deposit</option>
                  <option>Wise / Remitly</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="text-sm font-medium text-brand-ink">
                  Note (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Transaction reference, or anything we should know"
                  className="input-paper mt-1.5 resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-brand-ink">
                  Payment screenshot
                </label>
                <label
                  htmlFor="file"
                  className={`mt-1.5 flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed py-6 px-4 transition ${
                    file ? "border-brand-gold bg-brand-gold/10" : "border-brand-stone bg-brand-cream/40 hover:bg-brand-cream"
                  }`}
                >
                  <Upload className="h-5 w-5 text-brand-bridge" />
                  {file ? (
                    <div className="text-sm text-brand-ink text-center">
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-brand-muted">Tap to change</div>
                    </div>
                  ) : (
                    <div className="text-sm text-brand-ink/70 text-center">
                      <div>Tap to upload or take a photo</div>
                      <div className="text-xs text-brand-muted mt-0.5">PNG, JPG or PDF up to 10MB</div>
                    </div>
                  )}
                  <input
                    id="file"
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
            </div>

            <button type="submit" disabled={isPending} className="btn-gold mt-6 w-full">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                </>
              ) : (
                "Submit receipt"
              )}
            </button>
            <p className="mt-3 text-xs text-brand-muted text-center">
              Your receipt is saved to our secure team folder and reviewed by an admin.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
