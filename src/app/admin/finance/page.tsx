import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, ReceiptText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance — Bridge to Malaysia Admin" };

export default async function FinancePage() {
  const supabase = createClient();
  const [invoicesRes, paymentsRes, commissionsRes] = await Promise.all([
    supabase.from("invoices").select("id, total_amount, currency, status, created_at, student_id, invoice_type, students(full_name)"),
    supabase.from("payments").select("id, amount_received, payment_date, status, source, invoices(currency)"),
    supabase.from("commissions").select("amount, currency, received_date, university"),
  ]);

  const invoices = invoicesRes.data ?? [];
  const payments = (paymentsRes.data ?? []).filter((p: any) => p.status === "approved");
  const commissions = commissionsRes.data ?? [];

  const invoicedBDT = invoices
    .filter((i: any) => i.currency === "BDT" && i.status !== "draft" && i.status !== "cancelled")
    .reduce((s: number, i: any) => s + Number(i.total_amount), 0);
  const paidBDT = payments
    .filter((p: any) => p.invoices?.currency === "BDT")
    .reduce((s: number, p: any) => s + Number(p.amount_received), 0);
  const outstandingBDT = invoicedBDT - paidBDT;

  const commissionsTotal = commissions.reduce(
    (s, c: any) => s + Number(c.amount),
    0
  );

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <p className="label-eyebrow">Money</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">Finance</h1>

      <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total invoiced" value={formatCurrency(invoicedBDT, "BDT")} icon={<ReceiptText className="h-4 w-4" />} />
        <Stat label="Collected" value={formatCurrency(paidBDT, "BDT")} icon={<TrendingUp className="h-4 w-4" />} positive />
        <Stat label="Outstanding" value={formatCurrency(outstandingBDT, "BDT")} icon={<TrendingDown className="h-4 w-4" />} negative={outstandingBDT > 0} />
        <Stat label="Commissions received" value={formatCurrency(commissionsTotal, "MYR")} icon={<Wallet className="h-4 w-4" />} />
      </section>

      <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink mb-3">Recent payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-brand-muted">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {payments.slice(0, 8).map((p: any) => (
                <li key={p.id} className="flex items-center justify-between text-sm border-b border-brand-stone/50 pb-2 last:border-0">
                  <span className="text-brand-ink/70">{formatDate(p.payment_date)}</span>
                  <span className="font-mono">{formatCurrency(p.amount_received, p.invoices?.currency ?? "BDT")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink mb-3">Commission income</h2>
          {commissions.length === 0 ? (
            <p className="text-sm text-brand-muted">No commissions logged yet. Add them as universities pay.</p>
          ) : (
            <ul className="space-y-2">
              {commissions.slice(0, 8).map((c: any, i) => (
                <li key={i} className="flex items-center justify-between text-sm border-b border-brand-stone/50 pb-2 last:border-0">
                  <span className="text-brand-ink/70 truncate">{c.university}</span>
                  <span className="font-mono">{formatCurrency(c.amount, c.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, icon, positive, negative }: { label: string; value: string; icon: React.ReactNode; positive?: boolean; negative?: boolean }) {
  return (
    <div className="card-paper p-4 sm:p-5">
      <div className="flex items-center justify-between text-xs uppercase tracking-wider text-brand-muted">
        <span>{label}</span>
        {icon}
      </div>
      <div className={`mt-2 font-display text-xl sm:text-2xl ${positive ? "text-emerald-700" : negative ? "text-brand-bridge" : "text-brand-ink"}`}>
        {value}
      </div>
    </div>
  );
}
