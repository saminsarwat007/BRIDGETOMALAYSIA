"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, Check, SplitSquareHorizontal, RotateCcw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  createCommissionAction,
  updateCommissionAction,
  deleteCommissionAction,
  markProfitDividedAction,
  unmarkProfitDividedAction,
} from "@/app/admin/actions/commissions";
import { MALAYSIAN_UNIVERSITIES } from "@/lib/universities";

interface Commission {
  id: string;
  university: string;
  amount: number;
  currency: "BDT" | "MYR";
  company_account_key: string | null;
  received_date: string | null;
  notes: string | null;
  student_id: string | null;
  students: { full_name: string } | null;
  profit_divided: boolean;
  divided_at: string | null;
  divided_notes: string | null;
}

interface Student {
  id: string;
  full_name: string;
  university: string | null;
}

interface Props {
  commissions: Commission[];
  students: Student[];
}

const EMPTY_FORM = {
  student_id: "" as string,
  university: "",
  amount: "",
  currency: "MYR" as "BDT" | "MYR",
  received_date: new Date().toISOString().slice(0, 10),
  notes: "",
};

export function CommissionsClient({ commissions, students }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [dividingId, setDividingId] = useState<string | null>(null);
  const [divideForm, setDivideForm] = useState({ divided_at: new Date().toISOString().slice(0, 10), divided_notes: "" });
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  }

  function openEdit(c: Commission) {
    setEditId(c.id);
    setForm({
      student_id: c.student_id ?? "",
      university: c.university,
      amount: String(c.amount),
      currency: c.currency,
      received_date: c.received_date ?? new Date().toISOString().slice(0, 10),
      notes: c.notes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
  }

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit() {
    if (!form.university.trim() || !form.amount) {
      toast.error("University and amount are required");
      return;
    }
    const payload = {
      student_id: form.student_id || null,
      university: form.university.trim(),
      amount: Number(form.amount),
      currency: form.currency,
      received_date: form.received_date || null,
      notes: form.notes.trim() || null,
    };
    startTransition(async () => {
      try {
        if (editId) {
          await updateCommissionAction(editId, payload);
          toast.success("Commission updated");
        } else {
          await createCommissionAction(payload);
          toast.success("Commission recorded");
        }
        closeForm();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleDelete(id: string, label: string) {
    if (!confirm(`Delete commission from "${label}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteCommissionAction(id);
        toast.success("Commission deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  function handleMarkDivided(id: string) {
    startTransition(async () => {
      try {
        await markProfitDividedAction(id, divideForm.divided_at, divideForm.divided_notes);
        toast.success("Marked as profit divided");
        setDividingId(null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  function handleUnmark(id: string) {
    startTransition(async () => {
      try {
        await unmarkProfitDividedAction(id);
        toast.success("Unmarked — back to company balance");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update");
      }
    });
  }

  const universityNames = MALAYSIAN_UNIVERSITIES.map((u) => u.name);

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg text-brand-ink">
          {commissions.length === 0 ? "No commissions yet" : `${commissions.length} entr${commissions.length === 1 ? "y" : "ies"}`}
        </h2>
        <button onClick={openNew} className="btn-gold text-sm">
          <Plus className="h-4 w-4" /> Add commission
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card-paper p-5 mb-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-brand-ink">{editId ? "Edit commission" : "New commission"}</h3>
            <button onClick={closeForm} className="text-brand-muted hover:text-brand-ink">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Student (optional) */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-brand-ink">Student <span className="text-brand-muted font-normal">(optional)</span></span>
              <select
                value={form.student_id}
                onChange={(e) => {
                  set("student_id", e.target.value);
                  if (e.target.value) {
                    const s = students.find((x) => x.id === e.target.value);
                    if (s?.university) set("university", s.university);
                  }
                }}
                className="input-paper"
              >
                <option value="">— Not linked to a student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}{s.university ? ` (${s.university})` : ""}</option>
                ))}
              </select>
            </label>

            {/* University */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-brand-ink">University <span className="text-rose-500">*</span></span>
              <input
                list="uni-list"
                value={form.university}
                onChange={(e) => set("university", e.target.value)}
                className="input-paper"
                placeholder="e.g. UTM"
              />
              <datalist id="uni-list">
                {universityNames.map((n) => <option key={n} value={n} />)}
              </datalist>
            </label>

            {/* Amount */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-brand-ink">Amount <span className="text-rose-500">*</span></span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                className="input-paper font-mono"
                placeholder="0.00"
              />
            </label>

            {/* Currency */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-brand-ink">Currency</span>
              <select value={form.currency} onChange={(e) => set("currency", e.target.value as "BDT" | "MYR")} className="input-paper">
                <option value="MYR">MYR (Malaysian Ringgit)</option>
                <option value="BDT">BDT (Bangladeshi Taka)</option>
              </select>
            </label>

            {/* Date */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-brand-ink">Date received</span>
              <input
                type="date"
                value={form.received_date}
                onChange={(e) => set("received_date", e.target.value)}
                className="input-paper"
              />
            </label>

            {/* Notes */}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-brand-ink">Notes <span className="text-brand-muted font-normal">(optional)</span></span>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="input-paper"
                placeholder="Any remarks"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-brand-stone">
            <button onClick={closeForm} className="btn-ghost border border-brand-stone text-sm">Cancel</button>
            <button onClick={handleSubmit} disabled={isPending} className="btn-gold text-sm disabled:opacity-50">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editId ? "Save changes" : "Record commission"}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {commissions.length === 0 ? (
        <div className="card-paper p-10 text-center">
          <p className="text-brand-muted text-sm">No commissions recorded yet. Click "Add commission" to start.</p>
        </div>
      ) : (
        <div className="card-paper overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-stone bg-brand-cream/50">
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-brand-muted font-medium">University</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-brand-muted font-medium hidden sm:table-cell">Student</th>
                <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-brand-muted font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-brand-muted font-medium hidden sm:table-cell">Date</th>
                <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-brand-muted font-medium">Status</th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-stone/50">
              {commissions.map((c) => (
                <>
                  <tr key={c.id} className={`transition-colors ${c.profit_divided ? "bg-brand-cream/20 opacity-70" : "hover:bg-brand-cream/30"}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-ink">{c.university}</div>
                      {c.notes && <div className="text-xs text-brand-muted truncate max-w-[140px]">{c.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                      {c.students?.full_name ?? <span className="italic text-brand-stone">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-brand-bridge">
                      {formatCurrency(Number(c.amount), c.currency)}
                    </td>
                    <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                      {c.received_date ? formatDate(c.received_date) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {c.profit_divided ? (
                        <div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            <Check className="h-3 w-3" /> Divided
                          </span>
                          {c.divided_at && <div className="text-[10px] text-brand-muted mt-0.5">{formatDate(c.divided_at)}</div>}
                          {c.divided_notes && <div className="text-[10px] text-brand-muted truncate max-w-[120px]">{c.divided_notes}</div>}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                          In company
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {c.profit_divided ? (
                          <button
                            onClick={() => handleUnmark(c.id)}
                            disabled={isPending}
                            className="p-1.5 rounded-lg hover:bg-brand-stone/40 text-brand-muted hover:text-brand-ink transition"
                            title="Move back to company balance"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => { setDividingId(dividingId === c.id ? null : c.id); setDivideForm({ divided_at: new Date().toISOString().slice(0, 10), divided_notes: "" }); }}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-brand-muted hover:text-emerald-700 transition"
                            title="Mark profit divided"
                          >
                            <SplitSquareHorizontal className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg hover:bg-brand-stone/40 text-brand-muted hover:text-brand-ink transition"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.university)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-brand-muted hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Inline divide form */}
                  {dividingId === c.id && (
                    <tr key={`${c.id}-divide`}>
                      <td colSpan={6} className="px-4 pb-4 pt-0 bg-emerald-50/50">
                        <div className="border border-emerald-200 rounded-xl p-4 space-y-3">
                          <p className="text-sm font-medium text-brand-ink">
                            Mark <strong>{formatCurrency(Number(c.amount), c.currency)}</strong> from {c.university} as profit divided
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-brand-muted">Date divided</span>
                              <input
                                type="date"
                                value={divideForm.divided_at}
                                onChange={(e) => setDivideForm((p) => ({ ...p, divided_at: e.target.value }))}
                                className="input-paper text-sm"
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className="text-xs text-brand-muted">Notes <span className="text-brand-muted/60">(e.g. 50% Huzaifa, 50% Samin)</span></span>
                              <input
                                type="text"
                                value={divideForm.divided_notes}
                                onChange={(e) => setDivideForm((p) => ({ ...p, divided_notes: e.target.value }))}
                                className="input-paper text-sm"
                                placeholder="How was it split?"
                              />
                            </label>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setDividingId(null)} className="btn-ghost border border-brand-stone text-xs">Cancel</button>
                            <button
                              onClick={() => handleMarkDivided(c.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                              Confirm profit divided
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
