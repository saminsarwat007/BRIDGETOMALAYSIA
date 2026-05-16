"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  FileText,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Send,
  ExternalLink,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  INVOICE_TYPES,
  buildInvoiceFilename,
} from "@/lib/utils";
import type { Student, Invoice, Payment } from "@/types/database";
import {
  createInvoiceAction,
  deleteInvoiceAction,
  recordPaymentAction,
  approvePaymentAction,
  rejectPaymentAction,
  updateInvoiceAction,
} from "@/app/admin/actions/invoices";

interface Props {
  student: Student;
  invoices: Invoice[];
  payments: Payment[];
}

export function StudentInvoices({ student, invoices, payments }: Props) {
  const [composer, setComposer] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-brand-ink/70">
          {invoices.length === 0
            ? "No invoices yet."
            : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"} on record`}
        </p>
        <button onClick={() => setComposer((v) => !v)} className="btn-gold text-sm">
          <Plus className="h-4 w-4" /> New invoice
        </button>
      </div>

      {composer && (
        <InvoiceComposer
          student={student}
          onClose={() => setComposer(false)}
          onCreated={() => setComposer(false)}
        />
      )}

      {invoices.map((inv) => {
        const invPayments = payments.filter((p) => p.invoice_id === inv.id);
        return (
          <InvoiceCard
            key={inv.id}
            student={student}
            invoice={inv}
            payments={invPayments}
          />
        );
      })}
    </div>
  );
}

function InvoiceComposer({
  student,
  onClose,
  onCreated,
}: {
  student: Student;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<string>(INVOICE_TYPES[0]);
  const [customType, setCustomType] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [dueDate, setDueDate] = useState("");
  const [items, setItems] = useState([{ description: "", amount: 0, quantity: 1 }]);
  const [status, setStatus] = useState<"draft" | "sent">("draft");
  const [bankDetails, setBankDetails] = useState(
    "Bank: ___________\nAccount Name: ___________\nAccount #: ___________\nbKash / Nagad: ___________"
  );
  const [isPending, startTransition] = useTransition();

  const finalType = type === "Other" ? customType.trim() : type;
  const total = items.reduce((s, i) => s + Number(i.amount || 0) * Number(i.quantity || 1), 0);
  const previewFilename = buildInvoiceFilename(student.full_name, finalType || "invoice");

  function handleSubmit() {
    if (!finalType) {
      toast.error("Please specify an invoice type");
      return;
    }
    if (items.some((i) => !i.description.trim() || !i.amount)) {
      toast.error("Each line item needs a description and amount");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createInvoiceAction({
          student_id: student.id,
          invoice_type: finalType,
          currency,
          due_date: dueDate || null,
          line_items: items,
          field_values: { bank_details: bankDetails },
          status,
        });
        toast.success(`Invoice ${res.invoice_number} created`);
        onCreated();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't create invoice");
      }
    });
  }

  return (
    <div className="card-paper p-5 space-y-4 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="label-eyebrow">New invoice</p>
          <h3 className="mt-1 font-display text-lg text-brand-ink">For {student.full_name}</h3>
        </div>
        <span className="text-xs font-mono text-brand-muted truncate max-w-[200px]">
          {previewFilename}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label>
          <span className="text-sm font-medium text-brand-ink">Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} className="input-paper mt-1.5">
            {INVOICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {type === "Other" && (
          <label>
            <span className="text-sm font-medium text-brand-ink">Custom type</span>
            <input
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="e.g. Visa Stamping"
              className="input-paper mt-1.5"
            />
          </label>
        )}
        <label>
          <span className="text-sm font-medium text-brand-ink">Currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="input-paper mt-1.5">
            <option value="BDT">BDT (৳)</option>
            <option value="MYR">MYR (RM)</option>
            <option value="USD">USD ($)</option>
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-brand-ink">Due date</span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="input-paper mt-1.5"
          />
        </label>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-brand-ink">Line items</span>
          <button
            type="button"
            onClick={() => setItems([...items, { description: "", amount: 0, quantity: 1 }])}
            className="text-xs text-brand-bridge hover:text-brand-ink inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add row
          </button>
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2">
              <input
                value={it.description}
                onChange={(e) => {
                  const copy = [...items];
                  copy[idx].description = e.target.value;
                  setItems(copy);
                }}
                placeholder="Description"
                className="input-paper col-span-7 sm:col-span-8"
              />
              <input
                type="number"
                step="0.01"
                value={it.amount || ""}
                onChange={(e) => {
                  const copy = [...items];
                  copy[idx].amount = Number(e.target.value);
                  setItems(copy);
                }}
                placeholder="Amount"
                className="input-paper col-span-4 sm:col-span-3 font-mono text-right"
              />
              <button
                type="button"
                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                disabled={items.length === 1}
                className="col-span-1 grid place-items-center text-brand-muted hover:text-rose-600 disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-baseline justify-between text-brand-ink">
          <span className="text-sm">Total</span>
          <span className="font-display text-2xl">
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-brand-bridge font-medium">
          Payment instructions (printed on the invoice)
        </summary>
        <textarea
          value={bankDetails}
          onChange={(e) => setBankDetails(e.target.value)}
          rows={5}
          className="input-paper mt-2 font-mono text-xs resize-none"
        />
      </details>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-brand-stone">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={status === "sent"}
            onChange={(e) => setStatus(e.target.checked ? "sent" : "draft")}
            className="h-4 w-4 rounded border-brand-stone text-brand-bridge"
          />
          <span className="text-sm text-brand-ink">Send to student now (email)</span>
        </label>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost border border-brand-stone">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={isPending} className="btn-gold">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceCard({
  student,
  invoice,
  payments,
}: {
  student: Student;
  invoice: Invoice;
  payments: Payment[];
}) {
  const [showRecord, setShowRecord] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function approve(id: string) {
    startTransition(async () => {
      await approvePaymentAction(id);
      toast.success("Payment approved");
    });
  }
  async function reject(id: string) {
    startTransition(async () => {
      await rejectPaymentAction(id);
      toast.success("Payment rejected");
    });
  }
  async function send() {
    startTransition(async () => {
      await updateInvoiceAction(invoice.id, { status: "sent" });
      toast.success("Invoice sent");
    });
  }
  async function remove() {
    if (!confirm("Delete this invoice and all its payments?")) return;
    startTransition(async () => {
      await deleteInvoiceAction(invoice.id, student.id);
      toast.success("Deleted");
    });
  }

  const totalPaid = payments
    .filter((p) => p.status === "approved")
    .reduce((s, p) => s + Number(p.amount_received), 0);
  const remaining = Number(invoice.total_amount) - totalPaid;

  return (
    <article className="card-paper p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-brand-muted">
              {invoice.invoice_number}
            </span>
            <StatusBadge status={invoice.status} />
          </div>
          <h3 className="mt-1 font-display text-lg text-brand-ink">{invoice.invoice_type}</h3>
          <p className="text-xs text-brand-muted mt-0.5">
            Created {formatDate(invoice.created_at)}
            {invoice.due_date && ` · Due ${formatDate(invoice.due_date)}`}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-brand-ink">
            {formatCurrency(invoice.total_amount, invoice.currency)}
          </div>
          {totalPaid > 0 && (
            <div className="text-xs text-brand-muted mt-0.5">
              Paid {formatCurrency(totalPaid, invoice.currency)}
              {remaining > 0 && ` · ${formatCurrency(remaining, invoice.currency)} left`}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/admin/invoices/${invoice.id}/pdf`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-stone bg-brand-paper px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-cream transition"
        >
          <Download className="h-3.5 w-3.5" /> Download PDF
        </Link>
        {invoice.drive_link && (
          <a
            href={invoice.drive_link}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-stone bg-brand-paper px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-cream transition"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View in Drive
          </a>
        )}
        {invoice.status === "draft" && (
          <button
            onClick={send}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 rounded-md border border-brand-stone bg-brand-paper px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-cream transition"
          >
            <Send className="h-3.5 w-3.5" /> Mark sent
          </button>
        )}
        <button
          onClick={() => setShowRecord((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-ink text-brand-paper px-3 py-1.5 text-xs font-medium hover:bg-brand-bridge transition"
        >
          <Plus className="h-3.5 w-3.5" /> Record payment
        </button>
        <button
          onClick={remove}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-brand-muted hover:text-rose-600 transition"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {showRecord && (
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await recordPaymentAction(fd);
                toast.success("Payment recorded");
                setShowRecord(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't record");
              }
            })
          }
          className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-2 border-t border-brand-stone pt-4"
        >
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <input
            type="number"
            step="0.01"
            name="amount_received"
            defaultValue={remaining > 0 ? remaining : invoice.total_amount}
            placeholder="Amount"
            required
            className="input-paper font-mono"
          />
          <input
            type="date"
            name="payment_date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
            className="input-paper"
          />
          <input
            name="payment_method"
            placeholder="Bank transfer, bKash…"
            className="input-paper"
          />
          <input
            name="bank_reference"
            placeholder="Ref / Trx ID"
            className="input-paper font-mono"
          />
          <input
            name="receipt_drive_link"
            placeholder="Optional Drive link"
            className="input-paper sm:col-span-3"
          />
          <button type="submit" disabled={isPending} className="btn-gold">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </button>
        </form>
      )}

      {payments.length > 0 && (
        <div className="mt-4 border-t border-brand-stone pt-3 space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono">
                    {formatCurrency(p.amount_received, invoice.currency)}
                  </span>
                  <PaymentStatusBadge status={p.status} source={p.source} />
                </div>
                <div className="text-xs text-brand-muted truncate">
                  {formatDate(p.payment_date)}
                  {p.payment_method && ` · ${p.payment_method}`}
                  {p.bank_reference && ` · ${p.bank_reference}`}
                </div>
                {p.description && (
                  <div className="text-xs text-brand-ink/70 mt-0.5">{p.description}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {p.receipt_drive_link && (
                  <a
                    href={p.receipt_drive_link}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 text-xs text-brand-bridge hover:text-brand-ink"
                  >
                    <FileText className="h-3 w-3" /> Receipt <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
                {p.status === "pending" && (
                  <>
                    <button
                      onClick={() => approve(p.id)}
                      className="text-emerald-600 hover:text-emerald-700"
                      title="Approve"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => reject(p.id)}
                      className="text-rose-500 hover:text-rose-600"
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    paid: { label: "Paid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    overpaid: { label: "Overpaid", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    partially_paid: { label: "Partially paid", cls: "bg-amber-50 text-amber-800 border-amber-200" },
    sent: { label: "Sent", cls: "bg-sky-50 text-sky-700 border-sky-200" },
    draft: { label: "Draft", cls: "bg-brand-stone/40 text-brand-muted border-brand-stone" },
    cancelled: { label: "Cancelled", cls: "bg-rose-50 text-rose-700 border-rose-200" },
  };
  const c = config[status] ?? config.draft;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.cls}`}>
      {c.label}
    </span>
  );
}

function PaymentStatusBadge({ status, source }: { status: string; source: string }) {
  const cfg: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${cfg[status] ?? cfg.pending}`}>
      {status}
      {source === "student" && <span className="ml-1 opacity-70">· student</span>}
    </span>
  );
}
