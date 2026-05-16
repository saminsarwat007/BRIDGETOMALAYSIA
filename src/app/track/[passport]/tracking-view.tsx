"use client";

import { useState, useMemo } from "react";
import { STAGES, stageIndex, formatDate, formatCurrency, formatDateTime } from "@/lib/utils";
import type { TrackingPayload } from "@/types/database";
import {
  Check,
  Clock,
  FileText,
  Upload,
  ExternalLink,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { ReceiptUploadSheet } from "./receipt-upload-sheet";
import { DocumentUploadSheet } from "./document-upload-sheet";
import { REQUIRED_DOCUMENTS } from "@/lib/documents";

interface DocumentRow {
  doc_type: string;
  status: "pending" | "received" | "rejected";
  rejection_reason: string | null;
  drive_link: string | null;
}

interface Props {
  payload: TrackingPayload;
  passport: string;
  documents: DocumentRow[];
}

const attachmentLabels: Record<string, string> = {
  offer_letter: "Offer Letter",
  evisa: "E-Visa",
  emgs_approval: "EMGS Approval",
  tuition_receipt: "Tuition Receipt",
  visa: "Visa",
  medical: "Medical Report",
  flight_ticket: "Flight Ticket",
  other: "Document",
};

export function TrackingView({ payload, passport, documents }: Props) {
  const { student, invoices, stage_history } = payload;
  const currentIdx = stageIndex(student.current_stage);

  // Group history items by stage
  const historyByStage = useMemo(() => {
    const map = new Map<string, typeof stage_history>();
    for (const h of stage_history) {
      const arr = map.get(h.stage) ?? [];
      arr.push(h);
      map.set(h.stage, arr);
    }
    return map;
  }, [stage_history]);

  const firstName = student.full_name.split(" ")[0];

  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null);
  const openInvoice = invoices.find((i) => i.id === openInvoiceId) ?? null;

  const [openDocKey, setOpenDocKey] = useState<string | null>(null);
  const docByType = useMemo(() => {
    const m = new Map<string, DocumentRow>();
    for (const d of documents) m.set(d.doc_type, d);
    return m;
  }, [documents]);
  const openDoc = REQUIRED_DOCUMENTS.find((d) => d.key === openDocKey) ?? null;
  const requiredCount = REQUIRED_DOCUMENTS.filter((d) => d.required).length;
  const receivedCount = REQUIRED_DOCUMENTS.filter(
    (d) => d.required && docByType.get(d.label)?.status === "received"
  ).length;

  return (
    <>
      <section className="mt-10 sm:mt-14 animate-fade-up">
        <p className="label-eyebrow">Welcome back</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl text-brand-ink leading-tight">
          Hello, <span className="text-brand-bridge italic">{firstName}</span>.
        </h1>
        <p className="mt-3 text-brand-ink/75 max-w-xl">
          Here's where your application stands. We update this every time something moves forward.
        </p>

        {student.university && (
          <div className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-brand-ink/70">
            <span className="font-medium text-brand-ink">{student.university}</span>
            {student.campus && <><span className="text-brand-stone">·</span><span>{student.campus}</span></>}
            {student.intake && <><span className="text-brand-stone">·</span><span>Intake: {student.intake}</span></>}
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="mt-12 sm:mt-16">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-display text-2xl text-brand-ink">Your roadmap</h2>
          <div className="text-xs uppercase tracking-[0.2em] text-brand-muted">
            Stage {currentIdx + 1} of {STAGES.length}
          </div>
        </div>

        <ol className="relative space-y-3">
          {STAGES.map((stage, idx) => {
            const state =
              idx < currentIdx ? "completed" : idx === currentIdx ? "current" : "future";
            const history = historyByStage.get(stage.value) ?? [];
            return (
              <StageRow
                key={stage.value}
                index={idx}
                total={STAGES.length}
                label={stage.label}
                short={stage.short}
                state={state}
                history={history}
              />
            );
          })}
        </ol>
      </section>

      {/* Documents */}
      {student.upload_enabled && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl text-brand-ink">Your documents</h2>
            <div className="text-xs uppercase tracking-[0.2em] text-brand-muted">
              {receivedCount} of {requiredCount} received
            </div>
          </div>
          <p className="text-sm text-brand-ink/70 max-w-xl mb-5">
            Upload clear scans or photos of each document. Tap a card to see the
            requirements for that one before uploading.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REQUIRED_DOCUMENTS.map((d) => {
              const row = docByType.get(d.label);
              const status = row?.status ?? "pending";
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setOpenDocKey(d.key)}
                  className="card-paper p-4 text-left hover:border-brand-bridge/50 transition group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase tracking-wider text-brand-muted">
                          {d.required ? "Required" : "If applicable"}
                        </span>
                        <DocStatusBadge status={status} />
                      </div>
                      <div className="mt-1 font-medium text-brand-ink">{d.shortLabel}</div>
                      {row?.rejection_reason && status === "rejected" && (
                        <p className="text-xs text-rose-700 mt-1.5 leading-snug">
                          {row.rejection_reason}
                        </p>
                      )}
                    </div>
                    {row?.drive_link && status === "received" && (
                      <a
                        href={row.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] font-semibold text-brand-bridge hover:text-brand-ink"
                      >
                        View
                      </a>
                    )}
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-bridge group-hover:text-brand-ink">
                    {status === "received"
                      ? "Re-upload"
                      : status === "rejected"
                      ? "Upload again"
                      : "Upload"}
                    <Upload className="h-3 w-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Invoices */}
      {invoices.length > 0 && (
        <section className="mt-16">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-2xl text-brand-ink">Invoices</h2>
            <div className="text-xs uppercase tracking-[0.2em] text-brand-muted">
              {invoices.filter((i) => i.status !== "paid" && i.status !== "overpaid").length} unpaid
            </div>
          </div>

          <div className="space-y-3">
            {invoices.map((inv) => {
              const isPaid = inv.status === "paid" || inv.status === "overpaid";
              const isPartial = inv.status === "partially_paid";
              return (
                <article
                  key={inv.id}
                  className="card-paper p-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-xs text-brand-muted">{inv.invoice_number}</span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="mt-1.5 font-medium text-brand-ink">{inv.invoice_type}</div>
                    {inv.due_date && (
                      <div className="text-xs text-brand-muted mt-0.5">
                        Due {formatDate(inv.due_date)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                    <div className="font-display text-xl text-brand-ink">
                      {formatCurrency(inv.total_amount, inv.currency)}
                    </div>
                    {!isPaid && student.upload_enabled && (
                      <button
                        onClick={() => setOpenInvoiceId(inv.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-brand-ink px-4 py-2 text-xs font-semibold text-brand-paper hover:bg-brand-bridge transition"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {isPartial ? "Upload another receipt" : "Upload receipt"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-20 card-paper p-6 flex items-start gap-4">
        <div className="rounded-lg bg-brand-gold/15 p-2.5">
          <Sparkles className="h-5 w-5 text-brand-bridge" />
        </div>
        <div>
          <div className="font-semibold text-brand-ink">Need to talk to us?</div>
          <p className="text-sm text-brand-ink/70 mt-1">
            We're a WhatsApp message away. Mention your passport number so we can pull up your file faster.
          </p>
          <a
            href="https://wa.me/8801749913165"
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-bridge hover:text-brand-ink"
          >
            Message on WhatsApp <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </section>

      <footer className="mt-16 text-center text-xs text-brand-muted">
        Looked up by passport ending in <span className="font-mono">{passport.slice(-4).padStart(passport.length, "•")}</span> ·
        Last refreshed {formatDateTime(new Date().toISOString())}
      </footer>

      {openInvoice && (
        <ReceiptUploadSheet
          passport={passport}
          invoice={openInvoice}
          onClose={() => setOpenInvoiceId(null)}
        />
      )}

      {openDoc && (
        <DocumentUploadSheet
          passport={passport}
          doc={openDoc}
          existing={docByType.get(openDoc.label) ?? null}
          onClose={() => setOpenDocKey(null)}
        />
      )}
    </>
  );
}

function DocStatusBadge({ status }: { status: "pending" | "received" | "rejected" }) {
  const config = {
    received: { label: "Received", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Re-upload needed", cls: "bg-rose-50 text-rose-700 border-rose-200" },
    pending: { label: "Pending", cls: "bg-brand-stone/40 text-brand-muted border-brand-stone" },
  } as const;
  const c = config[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
}

interface StageRowProps {
  index: number;
  total: number;
  label: string;
  short: string;
  state: "completed" | "current" | "future";
  history: TrackingPayload["stage_history"];
}

function StageRow({ index, label, state, history }: StageRowProps) {
  const [open, setOpen] = useState(state === "current");
  const hasContent = history.length > 0;

  const nodeClass =
    state === "completed"
      ? "node-completed"
      : state === "current"
      ? "node-current"
      : "node-future";

  return (
    <li
      className="relative pl-14 sm:pl-16"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      {/* connector */}
      <span
        aria-hidden
        className={`absolute left-[18px] sm:left-[22px] top-9 bottom-[-12px] w-px ${
          state === "future" ? "bg-brand-stone/60 border-l border-dashed border-brand-stone" : "bg-brand-bridge/40"
        }`}
      />

      {/* node */}
      <div
        className={`absolute left-0 top-0 grid place-items-center h-9 w-9 sm:h-11 sm:w-11 rounded-full border-2 ${nodeClass}`}
      >
        {state === "completed" ? (
          <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} />
        ) : state === "current" ? (
          <span className="font-display text-sm font-semibold">{index + 1}</span>
        ) : (
          <span className="text-xs">{index + 1}</span>
        )}
      </div>

      <button
        type="button"
        onClick={() => hasContent && setOpen((v) => !v)}
        className={`group w-full text-left rounded-lg p-3 -ml-3 ${
          hasContent ? "hover:bg-brand-cream cursor-pointer" : "cursor-default"
        } transition`}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <div
              className={`text-[10px] uppercase tracking-[0.18em] ${
                state === "current" ? "text-brand-bridge" : "text-brand-muted"
              }`}
            >
              {state === "completed" ? "Done" : state === "current" ? "In progress" : "Upcoming"}
            </div>
            <div
              className={`mt-0.5 font-medium ${
                state === "future" ? "text-brand-ink/60" : "text-brand-ink"
              }`}
            >
              {label}
            </div>
          </div>
          {hasContent && (
            <ChevronDown
              className={`h-4 w-4 text-brand-muted transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          )}
        </div>
      </button>

      {hasContent && open && (
        <div className="mt-1 ml-0 space-y-3 animate-fade-up">
          {history.map((h) => (
            <div key={h.id} className="card-paper p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.16em] text-brand-muted">
                  {formatDate(h.changed_at)}
                </span>
                {h.attachment_kind && (
                  <span className="text-[11px] font-medium text-brand-bridge">
                    {attachmentLabels[h.attachment_kind] ?? "Document"}
                  </span>
                )}
              </div>
              {h.comment && (
                <p className="mt-2 text-sm text-brand-ink/85 leading-relaxed whitespace-pre-line">
                  {h.comment}
                </p>
              )}
              {h.attachment_drive_link && (
                <a
                  href={h.attachment_drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-bridge/30 bg-brand-bridge/5 px-3.5 py-1.5 text-xs font-semibold text-brand-bridge hover:bg-brand-bridge hover:text-brand-paper transition"
                >
                  <FileText className="h-3.5 w-3.5" />
                  View {h.attachment_label ?? attachmentLabels[h.attachment_kind ?? "other"]}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string; icon?: React.ReactNode }> = {
    paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Check className="h-3 w-3" /> },
    overpaid: { label: "Overpaid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <Check className="h-3 w-3" /> },
    partially_paid: { label: "Partially paid", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    sent: { label: "Unpaid", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: <Clock className="h-3 w-3" /> },
    draft: { label: "Draft", cls: "bg-brand-stone/40 text-brand-muted border-brand-stone" },
    cancelled: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const c = config[status] ?? config.sent;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.cls}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}
