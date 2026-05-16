import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STAGES, stageLabel, formatDate } from "@/lib/utils";
import { Plus, Search, ChevronRight, Filter } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Students — Bridge to Malaysia Admin" };

interface PageProps {
  searchParams: { q?: string; stage?: string };
}

export default async function StudentsPage({ searchParams }: PageProps) {
  const supabase = createClient();

  let query = supabase
    .from("students")
    .select("id, full_name, passport_no, university, intake, current_stage, created_at, email, phone, agency_referred_at")
    .order("created_at", { ascending: false });

  if (searchParams.stage) {
    query = query.eq("current_stage", searchParams.stage);
  }
  if (searchParams.q) {
    const q = `%${searchParams.q}%`;
    query = query.or(
      `full_name.ilike.${q},passport_no.ilike.${q},university.ilike.${q},email.ilike.${q}`
    );
  }

  const { data: students } = await query;

  return (
    <div className="p-5 sm:p-8 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label-eyebrow">All applicants</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">
            Students
            <span className="ml-3 font-mono text-base text-brand-muted">{students?.length ?? 0}</span>
          </h1>
        </div>
        <Link href="/admin/students/new" className="btn-gold">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New student</span>
        </Link>
      </div>

      <form className="mt-6 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted" />
          <input
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search by name, passport, university…"
            className="input-paper pl-10"
          />
        </div>
        <div className="relative sm:w-64">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-muted pointer-events-none" />
          <select
            name="stage"
            defaultValue={searchParams.stage ?? ""}
            className="input-paper pl-10 appearance-none"
          >
            <option value="">All stages</option>
            {STAGES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-ghost border border-brand-stone">
          Apply
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {students && students.length > 0 ? (
          students.map((s) => (
            <Link
              key={s.id}
              href={`/admin/students/${s.id}`}
              className="group card-paper p-4 flex items-center gap-4 hover:border-brand-bridge/40 transition"
            >
              <div className="h-10 w-10 rounded-full bg-brand-bridge/15 grid place-items-center font-display text-brand-bridge">
                {s.full_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-brand-ink truncate">{s.full_name}</div>
                <div className="text-xs text-brand-muted truncate">
                  {s.university ? `${s.university}` : "No university yet"}
                  {s.intake && ` · ${s.intake}`}
                  {s.passport_no && ` · ${s.passport_no}`}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1 text-right">
                <span className="text-[11px] uppercase tracking-wider text-brand-bridge font-semibold">
                  {stageLabel(s.current_stage)}
                </span>
                {s.agency_referred_at ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                    ✓ Forwarded
                  </span>
                ) : (
                  <span className="text-[11px] text-brand-muted">
                    Added {formatDate(s.created_at)}
                  </span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-brand-muted group-hover:text-brand-ink transition" />
            </Link>
          ))
        ) : (
          <div className="card-paper p-10 text-center">
            <p className="text-brand-muted">No students yet.</p>
            <Link href="/admin/students/new" className="btn-gold mt-4 inline-flex">
              Add your first student
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
