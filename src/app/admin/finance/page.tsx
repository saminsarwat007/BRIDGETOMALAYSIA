import { createClient } from "@/lib/supabase/server";
import { COMPANY_ACCOUNTS, formatCurrency, formatDate } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, ReceiptText, Landmark } from "lucide-react";
import { updateCompanyAccountAction } from "@/app/admin/actions/finance";

export const dynamic = "force-dynamic";
export const metadata = { title: "Finance — Bridge to Malaysia Admin" };

export default async function FinancePage() {
  const supabase = createClient();
  const [invoicesRes, paymentsRes, commissionsRes, accountsRes] = await Promise.all([
    supabase.from("invoices").select("id, total_amount, currency, status, created_at, student_id, invoice_type, students(full_name)"),
    supabase.from("payments").select("id, amount_received, currency, company_account_key, payment_date, status, source, invoices(currency)"),
    supabase.from("commissions").select("amount, currency, company_account_key, received_date, university"),
    supabase.from("company_accounts").select("*"),
  ]);

  const invoices = invoicesRes.data ?? [];
  const payments = (paymentsRes.data ?? []).filter((p: any) => p.status === "approved");
  const commissions = commissionsRes.data ?? [];
  const dbAccounts = accountsRes.data ?? [];
  const accounts = COMPANY_ACCOUNTS.map((base) => ({
    ...base,
    ...(dbAccounts.find((account: any) => account.key === base.key) ?? {}),
  }));

  const totals = (currency: "BDT" | "MYR") => {
    const invoiced = invoices
      .filter((i: any) => i.currency === currency && i.status !== "draft" && i.status !== "cancelled")
      .reduce((s: number, i: any) => s + Number(i.total_amount), 0);
    const paid = payments
      .filter((p: any) => (p.currency ?? p.invoices?.currency) === currency)
      .reduce((s: number, p: any) => s + Number(p.amount_received), 0);
    const commission = commissions
      .filter((c: any) => c.currency === currency)
      .reduce((s: number, c: any) => s + Number(c.amount), 0);

    return { invoiced, paid, commission, outstanding: invoiced - paid };
  };

  const bdt = totals("BDT");
  const myr = totals("MYR");

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <p className="label-eyebrow">Money</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">Finance</h1>
      <p className="mt-2 text-sm text-brand-ink/70 max-w-2xl">
        Track BDT and MYR separately. Bangladesh Account is for BDT, Malaysia Account is for MYR. Opening balances are added to collected payments for estimated current balance.
      </p>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {accounts.map((account: any) => {
          const t = totals(account.currency);
          const currentBalance = Number(account.opening_balance ?? 0) + t.paid + t.commission;
          return (
            <div key={account.key} className="card-paper p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="label-eyebrow">{account.country}</p>
                  <h2 className="font-display text-2xl text-brand-ink mt-1">{account.label}</h2>
                  <p className="text-xs text-brand-muted mt-1">Currency: {account.currency}</p>
                </div>
                <Landmark className="h-5 w-5 text-brand-bridge" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="Opening" value={formatCurrency(account.opening_balance, account.currency)} />
                <MiniStat label="Current balance" value={formatCurrency(currentBalance, account.currency)} accent />
                <MiniStat label="Collected" value={formatCurrency(t.paid, account.currency)} />
                <MiniStat label="Outstanding" value={formatCurrency(t.outstanding, account.currency)} warn={t.outstanding > 0} />
              </div>

              <form action={updateCompanyAccountAction} className="border-t border-brand-stone pt-4 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2">
                <input type="hidden" name="key" value={account.key} />
                <input
                  type="number"
                  step="0.01"
                  name="opening_balance"
                  defaultValue={Number(account.opening_balance ?? 0)}
                  className="input-paper font-mono"
                  placeholder="Opening balance"
                />
                <input
                  name="notes"
                  defaultValue={account.notes ?? ""}
                  className="input-paper"
                  placeholder="Optional note"
                />
                <button type="submit" className="btn-gold justify-center">Save</button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="BDT invoiced" value={formatCurrency(bdt.invoiced, "BDT")} icon={<ReceiptText className="h-4 w-4" />} />
        <Stat label="BDT collected" value={formatCurrency(bdt.paid, "BDT")} icon={<TrendingUp className="h-4 w-4" />} positive />
        <Stat label="MYR invoiced" value={formatCurrency(myr.invoiced, "MYR")} icon={<ReceiptText className="h-4 w-4" />} />
        <Stat label="MYR collected" value={formatCurrency(myr.paid, "MYR")} icon={<Wallet className="h-4 w-4" />} positive />
      </section>

      <section className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-paper p-5">
          <h2 className="font-display text-lg text-brand-ink mb-3">Recent payments</h2>
          {payments.length === 0 ? (
            <p className="text-sm text-brand-muted">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {payments.slice(0, 8).map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm border-b border-brand-stone/50 pb-2 last:border-0">
                  <div>
                    <div className="text-brand-ink/70">{formatDate(p.payment_date)}</div>
                    <div className="text-xs text-brand-muted">{accountLabel(p.company_account_key)}</div>
                  </div>
                  <span className="font-mono">{formatCurrency(p.amount_received, p.currency ?? p.invoices?.currency ?? "BDT")}</span>
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

function accountLabel(key: string | null | undefined) {
  if (!key) return "Unassigned account";
  return COMPANY_ACCOUNTS.find((account) => account.key === key)?.label ?? key;
}

function MiniStat({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-brand-stone bg-brand-paper/70 p-3">
      <div className="text-[10px] uppercase tracking-wider text-brand-muted">{label}</div>
      <div className={`mt-1 font-mono text-sm ${accent ? "text-emerald-700" : warn ? "text-brand-bridge" : "text-brand-ink"}`}>{value}</div>
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
