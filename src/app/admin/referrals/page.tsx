import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Referrals — Bridge to Malaysia Admin" };

export default async function ReferralsPage() {
  const supabase = createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, full_name, referred_by_name, referred_by_phone, current_stage")
    .not("referred_by_name", "is", null)
    .order("created_at", { ascending: false });

  const grouped = new Map<string, typeof students>();
  for (const s of students ?? []) {
    const key = `${s.referred_by_name}|${s.referred_by_phone ?? ""}`;
    const arr = (grouped.get(key) ?? []) as any;
    arr.push(s);
    grouped.set(key, arr);
  }

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      <p className="label-eyebrow">People who refer us</p>
      <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">Referrals</h1>

      <div className="mt-8 space-y-4">
        {grouped.size === 0 && (
          <div className="card-paper p-10 text-center text-brand-muted">
            No referrals yet. Add a "Referred by" name when onboarding a student.
          </div>
        )}
        {Array.from(grouped.entries()).map(([key, list]) => {
          const [name, phone] = key.split("|");
          return (
            <div key={key} className="card-paper p-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-display text-lg text-brand-ink">{name}</h3>
                  {phone && <p className="text-xs text-brand-muted mt-0.5">{phone}</p>}
                </div>
                <span className="text-xs font-mono text-brand-muted">{list?.length ?? 0} students</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {(list ?? []).map((s) => (
                  <li key={s!.id}>
                    <Link href={`/admin/students/${s!.id}`} className="text-brand-ink hover:text-brand-bridge">
                      {s!.full_name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
