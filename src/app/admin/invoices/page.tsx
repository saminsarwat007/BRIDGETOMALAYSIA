import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices — Bridge to Malaysia Admin" };

interface PageProps {
  searchParams: { filter?: string };
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const supabase = createClient();
  let query = supabase
    .from("invoices")
    .select("*, students(id, full_name)")
    .order("created_at", { ascending: false });

  if (searchParams.filter === "unpaid") {
    query = query.in("status", ["sent", "partially_paid"]);
  } else if (searchParams.filter === "pending-receipts") {
    // best-effort: filter via payments status; we'll do a separate fetch
  }

  const [{ data: invoices }, { data: pendingPayments }] = await Promise.all([
    query,
    supabase
      .from("payments")
      .select("invoice_id")
      .eq("status", "pending"),
  ]);

  const pendingSet = new Set((pendingPayments ?? []).map((p) => p.invoice_id));

  const list =
    searchParams.filter === "pending-receipts"
      ? (invoices ?? []).filter((i) => pendingSet.has(i.id))
      : invoices ?? [];

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="label-eyebrow">Finance</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">
            Invoices
            <span className="ml-3 font-mono text-base text-brand-muted">{list.length}</span>
          </h1>
        </div>
      </div>

      <div className="mt-6 flex gap-2 text-sm">
        <FilterTab href="/admin/invoices" active={!searchParams.filter} label="All" />
        <FilterTab href="/admin/invoices?filter=unpaid" active={searchParams.filter === "unpaid"} label="Unpaid" />
        <FilterTab
          href="/admin/invoices?filter=pending-receipts"
          active={searchParams.filter === "pending-receipts"}
          label={`Pending receipts${pendingSet.size > 0 ? ` (${pendingSet.size})` : ""}`}
        />
      </div>

      <div className="mt-5 space-y-2">
        {list.length === 0 ? (
          <div className="card-paper p-10 text-center text-brand-muted">No invoices match this filter.</div>
        ) : (
          list.map((inv: any) => (
            <div
              key={inv.id}
              className="card-paper p-4 flex items-center gap-4 hover:border-brand-bridge/40 transition group"
            >
              <Link
                href={`/admin/students/${inv.students?.id ?? inv.student_id}?tab=invoices`}
                className="flex-1 min-w-0 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-brand-muted">{inv.invoice_number}</span>
                    {pendingSet.has(inv.id) && (
                      <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        Receipt to review
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-brand-ink truncate font-medium">
                    {inv.students?.full_name ?? "Student"} · {inv.invoice_type}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {formatDate(inv.created_at)}
                    {inv.due_date && ` · due ${formatDate(inv.due_date)}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-brand-ink">
                    {formatCurrency(inv.total_amount, inv.currency)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-brand-bridge">
                    {inv.status.replace("_", " ")}
                  </div>
                </div>
              </Link>
              <a
                href={`/admin/invoices/${inv.id}/pdf`}
                target="_blank"
                rel="noopener"
                className="hidden sm:inline-flex shrink-0 items-center gap-1.5 rounded-md border border-brand-stone bg-brand-paper px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-cream"
              >
                <Download className="h-3.5 w-3.5" /> PDF
              </a>
              <ChevronRight className="h-4 w-4 text-brand-muted group-hover:text-brand-ink" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilterTab({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full border text-xs transition ${
        active
          ? "bg-brand-ink text-brand-paper border-brand-ink"
          : "border-brand-stone text-brand-ink/70 hover:bg-brand-cream"
      }`}
    >
      {label}
    </Link>
  );
}
