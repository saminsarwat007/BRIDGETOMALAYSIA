import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, STAGES, stageLabel } from "@/lib/utils";
import {
  TrendingUp,
  Users,
  ReceiptText,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  FileCheck,
  Clock,
  ArrowUpRight,
  BarChart3,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics — Bridge to Malaysia Admin" };

export default async function AnalyticsPage() {
  const supabase = createClient();

  const [
    studentsRes,
    invoicesRes,
    paymentsRes,
    documentsRes,
    historyRes,
    commissionsRes,
    refundsRes,
  ] = await Promise.all([
    supabase.from("students").select("id, current_stage, created_at, university, campus, intake, contract_required").order("created_at", { ascending: false }),
    supabase.from("invoices").select("id, total_amount, currency, status, created_at, student_id"),
    supabase.from("payments").select("id, amount_received, currency, status, source, student_id, created_at"),
    supabase.from("documents").select("id, status, doc_type, student_id"),
    supabase.from("stage_history").select("id, student_id, stage, comment, changed_at").order("changed_at", { ascending: false }),
    supabase.from("commissions").select("amount, currency, received_date"),
    supabase.from("refunds").select("amount, currency, status, created_at"),
  ]);

  const students = studentsRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const documents = documentsRes.data ?? [];
  const history = historyRes.data ?? [];
  const commissions = commissionsRes.data ?? [];
  const refunds = refundsRes.data ?? [];

  // ─── Student metrics ───
  const totalStudents = students.length;
  const activeStudents = students.filter((s: any) => s.current_stage !== "completed" && s.current_stage !== "cancelled").length;
  const completedStudents = students.filter((s: any) => s.current_stage === "completed").length;

  // Stage distribution
  const stageCounts = STAGES.map((s) => ({
    ...s,
    count: students.filter((st: any) => st.current_stage === s.value).length,
  }));
  const maxStageCount = Math.max(1, ...stageCounts.map((s) => s.count));

  // ─── Financial metrics ───
  const approvedPayments = payments.filter((p: any) => p.status === "approved");
  const pendingPayments = payments.filter((p: any) => p.status === "pending");

  const moneyByCurrency = (currency: "BDT" | "MYR") => {
    const invoiced = invoices
      .filter((i: any) => i.currency === currency && i.status !== "draft" && i.status !== "cancelled")
      .reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
    const paid = approvedPayments
      .filter((p: any) => p.currency === currency)
      .reduce((s: number, p: any) => s + Number(p.amount_received ?? 0), 0);
    const commission = commissions
      .filter((c: any) => c.currency === currency)
      .reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);
    const refunded = refunds
      .filter((r: any) => r.currency === currency && r.status === "refunded")
      .reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
    const outstanding = invoiced - paid;
    return { invoiced, paid, outstanding, commission, refunded };
  };

  const bdt = moneyByCurrency("BDT");
  const myr = moneyByCurrency("MYR");

  // ─── Document metrics ───
  const totalDocs = documents.length;
  const receivedDocs = documents.filter((d: any) => d.status === "received").length;
  const pendingDocs = documents.filter((d: any) => d.status === "pending").length;
  const rejectedDocs = documents.filter((d: any) => d.status === "rejected").length;
  const docCompletionRate = totalDocs > 0 ? Math.round((receivedDocs / totalDocs) * 100) : 0;

  // ─── University distribution ───
  const uniCounts: Record<string, number> = {};
  students.forEach((s: any) => {
    if (s.university) uniCounts[s.university] = (uniCounts[s.university] || 0) + 1;
  });
  const topUniversities = Object.entries(uniCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxUniCount = Math.max(1, ...topUniversities.map(([, c]) => c));

  // ─── Intake distribution ───
  const intakeCounts: Record<string, number> = {};
  students.forEach((s: any) => {
    if (s.intake) intakeCounts[s.intake] = (intakeCounts[s.intake] || 0) + 1;
  });
  const topIntakes = Object.entries(intakeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxIntakeCount = Math.max(1, ...topIntakes.map(([, c]) => c));

  // ─── Monthly student trend ───
  const monthlyCounts: Record<string, number> = {};
  students.forEach((s: any) => {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
  });
  const sortedMonths = Object.entries(monthlyCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMonthly = Math.max(1, ...sortedMonths.map(([, c]) => c));

  // ─── Invoice status breakdown ───
  const invoiceStatuses = {
    draft: invoices.filter((i: any) => i.status === "draft").length,
    sent: invoices.filter((i: any) => i.status === "sent").length,
    partially_paid: invoices.filter((i: any) => i.status === "partially_paid").length,
    paid: invoices.filter((i: any) => i.status === "paid").length,
    overpaid: invoices.filter((i: any) => i.status === "overpaid").length,
    cancelled: invoices.filter((i: any) => i.status === "cancelled").length,
  };
  const totalInvoices = invoices.length || 1;

  // ─── Conversion: started → paid/completed ───
  const hasInvoice = new Set(invoices.map((i: any) => i.student_id));
  const hasPayment = new Set(approvedPayments.map((p: any) => p.student_id));
  const conversionRate = totalStudents > 0 ? Math.round((hasPayment.size / totalStudents) * 100) : 0;

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="label-eyebrow">Dashboard</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">Analytics</h1>
        </div>
        <Link href="/admin" className="btn-ghost border border-brand-stone hidden sm:inline-flex">
          <ArrowUpRight className="h-4 w-4" /> Overview
        </Link>
      </header>

      {/* ── Top KPIs ── */}
      <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Total students" value={totalStudents} icon={<Users className="h-4 w-4" />} />
        <Kpi label="Active applications" value={activeStudents} icon={<Clock className="h-4 w-4" />} accent />
        <Kpi label="Completed" value={completedStudents} icon={<CheckCircle2 className="h-4 w-4" />} positive />
        <Kpi label="Conversion rate" value={`${conversionRate}%`} icon={<TrendingUp className="h-4 w-4" />} mono />
      </section>

      {/* ── Financial KPIs ── */}
      <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="BDT collected" value={formatCurrency(bdt.paid, "BDT")} icon={<Wallet className="h-4 w-4" />} mono />
        <Kpi label="BDT outstanding" value={formatCurrency(bdt.outstanding, "BDT")} icon={<AlertTriangle className="h-4 w-4" />} warn={bdt.outstanding > 0} mono />
        <Kpi label="MYR collected" value={formatCurrency(myr.paid, "MYR")} icon={<Wallet className="h-4 w-4" />} mono />
        <Kpi label="MYR outstanding" value={formatCurrency(myr.outstanding, "MYR")} icon={<AlertTriangle className="h-4 w-4" />} warn={myr.outstanding > 0} mono />
      </section>

      <section className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="BDT invoiced" value={formatCurrency(bdt.invoiced, "BDT")} icon={<ReceiptText className="h-4 w-4" />} mono />
        <Kpi label="BDT commissions" value={formatCurrency(bdt.commission, "BDT")} icon={<GraduationCap className="h-4 w-4" />} mono />
        <Kpi label="MYR invoiced" value={formatCurrency(myr.invoiced, "MYR")} icon={<ReceiptText className="h-4 w-4" />} mono />
        <Kpi label="MYR commissions" value={formatCurrency(myr.commission, "MYR")} icon={<GraduationCap className="h-4 w-4" />} mono />
      </section>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ── Pipeline funnel ── */}
        <div className="card-paper p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-brand-ink flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-bridge" /> Student Pipeline
            </h2>
            <span className="text-xs text-brand-muted">{totalStudents} total</span>
          </div>
          <div className="mt-5 space-y-3">
            {stageCounts.map((s) => {
              const pct = (s.count / maxStageCount) * 100;
              return (
                <div key={s.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-brand-ink/80">{s.label}</span>
                    <span className="font-mono text-brand-ink">{s.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-brand-stone/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-bridge"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Document completion ── */}
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-brand-bridge" /> Documents
          </h2>
          <div className="mt-5 flex items-center gap-5">
            <div className="relative h-28 w-28 shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e8e4df" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#b85c38"
                  strokeWidth="3"
                  strokeDasharray={`${docCompletionRate} ${100 - docCompletionRate}`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-2xl text-brand-ink">{docCompletionRate}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <DocRow label="Received" value={receivedDocs} color="bg-emerald-500" />
              <DocRow label="Pending" value={pendingDocs} color="bg-amber-500" />
              <DocRow label="Rejected" value={rejectedDocs} color="bg-rose-500" />
              <div className="pt-1 text-xs text-brand-muted">{totalDocs} total documents</div>
            </div>
          </div>
        </div>

        {/* ── Invoice status ── */}
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink">Invoice Status</h2>
          <div className="mt-5 space-y-3">
            {Object.entries(invoiceStatuses).map(([status, count]) => {
              const pct = (count / totalInvoices) * 100;
              const colors: Record<string, string> = {
                draft: "bg-brand-stone",
                sent: "bg-sky-500",
                partially_paid: "bg-amber-500",
                paid: "bg-emerald-500",
                overpaid: "bg-brand-bridge",
                cancelled: "bg-rose-400",
              };
              return (
                <div key={status} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize text-brand-ink/80">{status.replace("_", " ")}</span>
                    <span className="font-mono text-brand-ink">{count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-brand-stone/30 overflow-hidden">
                    <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── University distribution ── */}
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink">Top Universities</h2>
          {topUniversities.length === 0 ? (
            <p className="mt-5 text-sm text-brand-muted">No university data yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {topUniversities.map(([uni, count]) => {
                const pct = (count / maxUniCount) * 100;
                return (
                  <div key={uni} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-brand-ink/80 truncate">{uni}</span>
                      <span className="font-mono text-brand-ink">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-brand-stone/30 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-bridge" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Monthly trend ── */}
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink">Monthly Registrations</h2>
          {sortedMonths.length === 0 ? (
            <p className="mt-5 text-sm text-brand-muted">No data yet.</p>
          ) : (
            <div className="mt-5 flex items-end gap-3 h-40">
              {sortedMonths.map(([month, count]) => {
                const heightPct = (count / maxMonthly) * 100;
                const [year, mon] = month.split("-");
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center h-32">
                      <div
                        className="w-full max-w-[40px] rounded-t-md bg-brand-bridge/80 hover:bg-brand-bridge transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${count} students`}
                      />
                    </div>
                    <span className="text-[10px] text-brand-muted whitespace-nowrap">
                      {mon}/{year.slice(2)}
                    </span>
                    <span className="text-xs font-mono text-brand-ink">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Intake distribution ── */}
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink">Intake Distribution</h2>
          {topIntakes.length === 0 ? (
            <p className="mt-5 text-sm text-brand-muted">No intake data yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {topIntakes.map(([intake, count]) => {
                const pct = (count / maxIntakeCount) * 100;
                return (
                  <div key={intake} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-brand-ink/80">{intake}</span>
                      <span className="font-mono text-brand-ink">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-brand-stone/30 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Payments breakdown ── */}
      <section className="mt-5 card-paper p-5">
        <h2 className="font-display text-lg text-brand-ink">Payment Sources</h2>
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SourceCard
            label="Admin recorded"
            value={approvedPayments.filter((p: any) => p.source === "admin").length}
            total={approvedPayments.length}
            color="bg-brand-bridge"
          />
          <SourceCard
            label="Student uploaded"
            value={approvedPayments.filter((p: any) => p.source === "student").length}
            total={approvedPayments.length}
            color="bg-sky-500"
          />
          <SourceCard
            label="Pending approval"
            value={pendingPayments.length}
            total={payments.length}
            color="bg-amber-500"
          />
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  accent,
  positive,
  warn,
  mono,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  accent?: boolean;
  positive?: boolean;
  warn?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="card-paper p-4 sm:p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-brand-muted">
        <span>{label}</span>
        {icon}
      </div>
      <div
        className={`mt-2 font-display text-xl sm:text-2xl ${
          mono ? "font-mono text-lg sm:text-xl" : ""
        } ${positive ? "text-emerald-700" : warn ? "text-brand-bridge" : accent ? "text-brand-bridge" : "text-brand-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function DocRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`h-2.5 w-2.5 rounded-full ${color}`} />
      <span className="text-brand-ink/80">{label}</span>
      <span className="ml-auto font-mono text-brand-ink">{value}</span>
    </div>
  );
}

function SourceCard({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-xl border border-brand-stone bg-brand-paper/50 p-4">
      <div className="text-sm text-brand-ink/80">{label}</div>
      <div className="mt-2 font-display text-2xl text-brand-ink">{value}</div>
      <div className="mt-2 h-2 rounded-full bg-brand-stone/30 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-brand-muted">{pct}% of {total}</div>
    </div>
  );
}
