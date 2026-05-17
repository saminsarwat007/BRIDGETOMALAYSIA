import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CommissionsClient } from "./commissions-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commissions — Bridge to Malaysia Admin" };

export default async function CommissionsPage() {
  const supabase = createClient();

  const [commissionsRes, studentsRes] = await Promise.all([
    supabase
      .from("commissions")
      .select("id, university, amount, currency, company_account_key, received_date, notes, student_id, students(full_name)")
      .order("received_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("students")
      .select("id, full_name, university")
      .order("full_name"),
  ]);

  const commissions = commissionsRes.data ?? [];
  const students = studentsRes.data ?? [];

  const totalBDT = commissions
    .filter((c) => c.currency === "BDT")
    .reduce((s, c) => s + Number(c.amount), 0);
  const totalMYR = commissions
    .filter((c) => c.currency === "MYR")
    .reduce((s, c) => s + Number(c.amount), 0);

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="label-eyebrow">Finance</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">Commissions</h1>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="card-paper p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wider text-brand-muted">Total BDT received</p>
          <p className="mt-1.5 font-mono text-xl sm:text-2xl text-brand-ink">{formatCurrency(totalBDT, "BDT")}</p>
        </div>
        <div className="card-paper p-4 sm:p-5">
          <p className="text-xs uppercase tracking-wider text-brand-muted">Total MYR received</p>
          <p className="mt-1.5 font-mono text-xl sm:text-2xl text-brand-ink">{formatCurrency(totalMYR, "MYR")}</p>
        </div>
      </div>

      <CommissionsClient commissions={commissions as any} students={students} />
    </div>
  );
}
