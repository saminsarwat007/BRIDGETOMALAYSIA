import { CheckCircle2, ExternalLink, RotateCcw, XCircle } from "lucide-react";
import { COMPANY_ACCOUNTS, defaultAccountForCurrency, formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice, Refund, Student } from "@/types/database";
import { cancelRefundAction, createRefundAction, markRefundedAction } from "@/app/admin/actions/refunds";

interface Props {
  student: Student;
  invoices: Invoice[];
  refunds: Refund[];
}

export function StudentRefunds({ student, invoices, refunds }: Props) {
  const pending = refunds.filter((refund) => refund.status === "pending");
  const refunded = refunds.filter((refund) => refund.status === "refunded");
  const pendingBDT = pending
    .filter((refund) => refund.currency === "BDT")
    .reduce((sum, refund) => sum + Number(refund.amount), 0);
  const pendingMYR = pending
    .filter((refund) => refund.currency === "MYR")
    .reduce((sum, refund) => sum + Number(refund.amount), 0);

  return (
    <div className="space-y-5">
      <div className="card-paper p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div>
          <p className="label-eyebrow">Manual refund tracking</p>
          <h2 className="font-display text-2xl text-brand-ink mt-1">Pending refunds</h2>
          <p className="text-sm text-brand-ink/70 mt-1 max-w-xl">
            Use this when the student overpaid or has refundable money. Create it manually, then mark refunded after you actually return the money.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800">
              Pending BDT: {formatCurrency(pendingBDT, "BDT")}
            </span>
            <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800">
              Pending MYR: {formatCurrency(pendingMYR, "MYR")}
            </span>
          </div>
        </div>
        <CreateRefundForm studentId={student.id} invoices={invoices} />
      </div>

      {refunds.length === 0 ? (
        <div className="card-paper p-10 text-center text-brand-muted">
          No refunds recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {refunds.map((refund) => (
            <RefundCard key={refund.id} refund={refund} invoices={invoices} studentId={student.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRefundForm({ studentId, invoices }: { studentId: string; invoices: Invoice[] }) {
  return (
    <form action={createRefundAction} className="w-full lg:max-w-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
      <input type="hidden" name="student_id" value={studentId} />
      <select name="currency" defaultValue="BDT" className="input-paper">
        <option value="BDT">BDT refund</option>
        <option value="MYR">MYR refund</option>
      </select>
      <input
        type="number"
        step="0.01"
        min="0"
        name="amount"
        placeholder="Amount"
        required
        className="input-paper font-mono"
      />
      <select name="invoice_id" className="input-paper sm:col-span-2">
        <option value="">No specific invoice</option>
        {invoices.map((invoice) => (
          <option key={invoice.id} value={invoice.id}>
            {invoice.invoice_number} · {invoice.invoice_type} · {invoice.currency}
          </option>
        ))}
      </select>
      <select name="company_account_key" className="input-paper sm:col-span-2" defaultValue="">
        <option value="">Use default account for currency</option>
        {COMPANY_ACCOUNTS.map((account) => (
          <option key={account.key} value={account.key}>
            {account.label} ({account.currency})
          </option>
        ))}
      </select>
      <input
        name="reason"
        placeholder="Reason e.g. overpayment, refundable deposit"
        className="input-paper sm:col-span-2"
      />
      <button type="submit" className="btn-gold justify-center sm:col-span-2">
        <RotateCcw className="h-4 w-4" /> Add pending refund
      </button>
    </form>
  );
}

function RefundCard({ refund, invoices, studentId }: { refund: Refund; invoices: Invoice[]; studentId: string }) {
  const invoice = refund.invoice_id ? invoices.find((item) => item.id === refund.invoice_id) : null;

  return (
    <article className="card-paper p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-2xl text-brand-ink">
            {formatCurrency(refund.amount, refund.currency)}
          </div>
          <p className="text-xs text-brand-muted mt-0.5">
            {refund.reason ?? "Refund"} · {accountLabel(refund.company_account_key)}
          </p>
          {invoice && (
            <p className="text-xs text-brand-muted mt-1">
              From {invoice.invoice_number} · {invoice.invoice_type}
            </p>
          )}
        </div>
        <RefundStatusBadge status={refund.status} />
      </div>

      <div className="text-xs text-brand-muted">
        Created {formatDate(refund.created_at)}
        {refund.refunded_at && ` · Refunded ${formatDate(refund.refunded_at)}`}
      </div>

      {refund.status === "pending" && (
        <div className="space-y-3 border-t border-brand-stone pt-4">
          <form action={markRefundedAction} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input type="hidden" name="id" value={refund.id} />
            <input type="hidden" name="student_id" value={studentId} />
            <input name="refund_method" placeholder="Method e.g. bank transfer" className="input-paper" />
            <input name="bank_reference" placeholder="Ref / Trx ID" className="input-paper font-mono" />
            <input name="proof_drive_link" placeholder="Optional proof Drive link" className="input-paper sm:col-span-2" />
            <button type="submit" className="btn-gold justify-center sm:col-span-2">
              <CheckCircle2 className="h-4 w-4" /> Mark refunded
            </button>
          </form>
          <form action={cancelRefundAction}>
            <input type="hidden" name="id" value={refund.id} />
            <input type="hidden" name="student_id" value={studentId} />
            <button type="submit" className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700">
              <XCircle className="h-3.5 w-3.5" /> Cancel refund record
            </button>
          </form>
        </div>
      )}

      {refund.status === "refunded" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Refunded{refund.refund_method ? ` via ${refund.refund_method}` : ""}
          {refund.bank_reference ? ` · ${refund.bank_reference}` : ""}
          {refund.proof_drive_link && (
            <a
              href={refund.proof_drive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1 font-semibold hover:underline"
            >
              Proof <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}

function RefundStatusBadge({ status }: { status: Refund["status"] }) {
  const config = {
    pending: "bg-amber-50 text-amber-800 border-amber-200",
    refunded: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-brand-stone/40 text-brand-muted border-brand-stone",
  } as const;

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${config[status]}`}>
      {status}
    </span>
  );
}

function accountLabel(key: string) {
  return COMPANY_ACCOUNTS.find((account) => account.key === key)?.label ?? key;
}
