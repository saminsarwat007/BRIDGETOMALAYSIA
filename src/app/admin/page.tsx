import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGES, stageLabel, formatCurrency } from "@/lib/utils";
import { ArrowUpRight, Users, FileWarning, ReceiptText, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview — Bridge to Malaysia Admin" };

export default async function AdminOverviewPage() {
  const supabase = createClient();

  const [studentsRes, invoicesRes, pendingPaymentsRes] = await Promise.all([
    supabase.from("students").select("id, current_stage, created_at").order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, total_amount, currency, status, created_at"),
    supabase
      .from("payments")
      .select("id, amount_received, source, status, student_id, created_at, invoices(invoice_number, invoice_type, currency), students(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const students = studentsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const pending = pendingPaymentsRes.data ?? [];

  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: students.filter((st) => st.current_stage === s.value).length,
  }));

  const totalInvoicedBDT = invoices
    .filter((i) => i.currency === "BDT")
    .reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);
  const totalInvoicedMYR = invoices
    .filter((i) => i.currency === "MYR")
    .reduce((sum, i) => sum + Number(i.total_amount ?? 0), 0);
  const unpaidCount = invoices.filter((i) => i.status === "sent" || i.status === "partially_paid").length;

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="label-eyebrow">Today</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">Welcome back</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/analytics" className="btn-ghost border border-brand-stone hidden sm:inline-flex">
            <BarChart3 className="h-4 w-4" /> Analytics
          </Link>
          <Link href="/admin/students/new" className="btn-gold hidden sm:inline-flex">
            New student
          </Link>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Active students"
          value={students.length}
          icon={<Users className="h-4 w-4" />}
          href="/admin/students"
        />
        <Stat
          label="Unpaid invoices"
          value={unpaidCount}
          icon={<ReceiptText className="h-4 w-4" />}
          href="/admin/invoices"
        />
        <Stat
          label="Pending receipts"
          value={pending.length}
          icon={<FileWarning className="h-4 w-4" />}
          accent
          href="/admin/invoices?filter=pending-receipts"
        />
        <Stat
          label="Invoiced BDT / MYR"
          value={`${formatCurrency(totalInvoicedBDT, "BDT")} / ${formatCurrency(totalInvoicedMYR, "MYR")}`}
          icon={<ReceiptText className="h-4 w-4" />}
          mono
        />
      </section>

      <section className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink">Pipeline</h2>
          <div className="mt-4 space-y-2">
            {stageCounts.map((s) => {
              const max = Math.max(1, ...stageCounts.map((x) => x.count));
              const pct = (s.count / max) * 100;
              return (
                <div key={s.value} className="grid grid-cols-[150px_1fr_32px] sm:grid-cols-[200px_1fr_40px] items-center gap-3">
                  <Link
                    href={`/admin/students?stage=${s.value}`}
                    className="text-xs sm:text-sm text-brand-ink/80 hover:text-brand-ink truncate"
                  >
                    {s.label}
                  </Link>
                  <div className="h-2 rounded-full bg-brand-stone/40 overflow-hidden">
                    <div
                      className="h-full bg-brand-bridge"
                      style={{ width: `${pct}%`, transition: "width 0.4s ease" }}
                    />
                  </div>
                  <div className="text-xs sm:text-sm font-mono text-brand-ink tabular-nums">
                    {s.count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-brand-ink">Pending receipts</h2>
            <Link href="/admin/invoices" className="text-xs text-brand-bridge hover:underline">
              View all
            </Link>
          </div>
          {pending.length === 0 ? (
            <p className="mt-3 text-sm text-brand-muted">No pending receipts to review.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {pending.map((p: any) => (
                <li key={p.id} className="text-sm">
                  <div className="font-medium text-brand-ink truncate">
                    {p.students?.full_name ?? "Student"}
                  </div>
                  <div className="text-xs text-brand-muted">
                    {p.invoices?.invoice_type ?? "Invoice"} · {formatCurrency(p.amount_received, p.invoices?.currency ?? "BDT")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-2 sm:hidden">
        <Link href="/admin/analytics" className="btn-ghost border border-brand-stone inline-flex justify-center">
          <BarChart3 className="h-4 w-4" /> Analytics
        </Link>
        <Link href="/admin/students/new" className="btn-gold inline-flex justify-center">
          New student
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  href,
  accent,
  mono,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  href?: string;
  accent?: boolean;
  mono?: boolean;
}) {
  const inner = (
    <div className={`card-paper p-4 sm:p-5 transition ${href ? "hover:border-brand-bridge/50" : ""}`}>
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-brand-muted">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-2 font-display text-2xl sm:text-3xl ${mono ? "font-mono text-xl sm:text-2xl" : ""} ${accent ? "text-brand-bridge" : "text-brand-ink"}`}>
        {value}
      </div>
      {href && (
        <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-brand-bridge">
          View <ArrowUpRight className="h-3 w-3" />
        </div>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
