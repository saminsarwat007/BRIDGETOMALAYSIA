"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  Mail,
} from "lucide-react";
import {
  previewAgencyReferral,
  sendAgencyReferral,
} from "@/app/admin/actions/agency-referral";
import { formatDateTime } from "@/lib/utils";

interface Props {
  studentId: string;
  agencyReferredAt: string | null;
  agencyReferredTo: string | null;
}

interface PreviewState {
  loading: boolean;
  ok: boolean;
  error?: string;
  agency?: { key: string; name: string; email: string };
  email?: {
    subject: string;
    html: string;
    text: string;
    to: string;
    cc?: string[];
    missing: string[];
  };
  from?: string;
  replyTo?: string | null;
  fromIsSandbox?: boolean;
}

export function AgencyReferralButton({
  studentId,
  agencyReferredAt,
  agencyReferredTo,
}: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewState>({ loading: false, ok: false });
  const [isSending, startSending] = useTransition();

  async function openModal() {
    setOpen(true);
    setPreview({ loading: true, ok: false });
    const result = await previewAgencyReferral(studentId);
    if (!result.ok) {
      setPreview({ loading: false, ok: false, error: result.error });
      return;
    }
    setPreview({
      loading: false,
      ok: true,
      agency: result.agency,
      email: result.email,
      from: result.from,
      replyTo: result.replyTo,
      fromIsSandbox: result.fromIsSandbox,
    });
  }

  function close() {
    setOpen(false);
  }

  function send() {
    startSending(async () => {
      const r = await sendAgencyReferral(studentId);
      if (!r.ok) {
        toast.error(r.error ?? "Failed to send");
        return;
      }
      toast.success(`Forwarded to ${r.sentTo}`);
      close();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="btn-ghost border border-brand-stone"
      >
        <Send className="h-4 w-4" />
        {agencyReferredAt ? "Resend to agency" : "Forward to agency"}
      </button>

      {agencyReferredAt && (
        <div className="text-[11px] text-brand-muted">
          Last sent {formatDateTime(agencyReferredAt)}
          {agencyReferredTo ? ` · ${agencyReferredTo}` : ""}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
          onClick={close}
        >
          <div
            className="w-full sm:max-w-2xl bg-brand-paper rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-brand-paper z-10 px-5 py-4 flex items-start justify-between border-b border-brand-stone">
              <div className="flex-1 min-w-0">
                <p className="label-eyebrow">Forward to agency</p>
                <h2 className="font-display text-xl text-brand-ink mt-1">
                  Preview before sending
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="p-2 -mr-2 rounded-full hover:bg-brand-stone/40"
              >
                <X className="h-5 w-5 text-brand-muted" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {preview.loading && (
                <div className="flex items-center gap-2 text-sm text-brand-muted py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing preview…
                </div>
              )}

              {!preview.loading && !preview.ok && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-rose-800">Can't send yet</p>
                    <p className="text-sm text-rose-700 mt-1">{preview.error}</p>
                  </div>
                </div>
              )}

              {preview.ok && preview.email && preview.agency && (
                <>
                  <div className="rounded-xl border border-brand-stone bg-brand-cream/40 p-4 space-y-2 text-sm">
                    {preview.from && (
                      <Row label="From">
                        <span className="font-mono break-all">{preview.from}</span>
                      </Row>
                    )}
                    <Row label="To">
                      <span className="font-mono">
                        {preview.agency.name} &lt;
                        {preview.email.to || (
                          <span className="text-rose-600">no email configured</span>
                        )}
                        &gt;
                      </span>
                    </Row>
                    {preview.email.cc && preview.email.cc.length > 0 && (
                      <Row label="CC">
                        <span className="font-mono">{preview.email.cc.join(", ")}</span>
                      </Row>
                    )}
                    {preview.replyTo && (
                      <Row label="Reply-To">
                        <span className="font-mono">{preview.replyTo}</span>
                      </Row>
                    )}
                    <Row label="Subject">
                      <span className="font-medium text-brand-ink">
                        {preview.email.subject}
                      </span>
                    </Row>
                  </div>

                  {preview.fromIsSandbox && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-amber-900">
                        <p className="font-semibold">Still sending from Resend's sandbox</p>
                        <p className="mt-1">
                          The agency will see <span className="font-mono">{preview.from}</span>.
                          That works for testing but lands in spam for real recipients and
                          looks unprofessional.
                        </p>
                        <p className="mt-1">
                          Add a verified domain in Resend → set{" "}
                          <span className="font-mono">RESEND_FROM_EMAIL</span> to e.g.{" "}
                          <span className="font-mono">referrals@bridgetomalaysia.com</span>{" "}
                          and restart the server.
                        </p>
                      </div>
                    </div>
                  )}

                  {preview.email.missing.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 text-sm">
                          Some details are missing
                        </p>
                        <ul className="text-sm text-amber-900 mt-1 list-disc pl-5">
                          {preview.email.missing.map((m) => (
                            <li key={m}>{m}</li>
                          ))}
                        </ul>
                        <p className="text-xs text-amber-800 mt-2">
                          You can still send, but consider editing the student's record
                          first so the agency has everything they need.
                        </p>
                      </div>
                    </div>
                  )}

                  {agencyReferredAt && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-emerald-900">
                        <p className="font-semibold">Already forwarded</p>
                        <p className="mt-0.5">
                          Sent {formatDateTime(agencyReferredAt)}
                          {agencyReferredTo ? ` to ${agencyReferredTo}` : ""}.
                          Sending again will create a fresh email.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="label-eyebrow mb-2">Email body</p>
                    <div
                      className="rounded-xl border border-brand-stone bg-brand-paper p-5 max-h-[420px] overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: preview.email.html }}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="sticky bottom-0 bg-brand-paper z-10 px-5 py-4 border-t border-brand-stone flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={close}
                className="btn-ghost border border-brand-stone"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={send}
                disabled={
                  isSending ||
                  preview.loading ||
                  !preview.ok ||
                  !preview.email?.to
                }
                className="btn-gold"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" /> Send to {preview.agency?.name ?? "agency"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3 items-baseline">
      <div className="text-[11px] uppercase tracking-wider text-brand-muted">{label}</div>
      <div className="text-sm text-brand-ink break-all">{children}</div>
    </div>
  );
}
