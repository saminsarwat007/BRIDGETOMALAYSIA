import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ExternalLink, Pencil, Eye, CheckCircle2 } from "lucide-react";
import { stageLabel, formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { TrackingUpdates } from "@/components/admin/tracking-updates";
import { StudentInvoices } from "@/components/admin/student-invoices";
import { StudentContracts } from "@/components/admin/student-contracts";
import { StudentTabs } from "@/components/admin/student-tabs";
import { AgencyReferralButton } from "@/components/admin/agency-referral-button";
import { DeleteStudentButton } from "@/components/admin/delete-student-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
  searchParams: { tab?: string };
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from("students")
    .select("full_name")
    .eq("id", params.id)
    .maybeSingle();
  return { title: `${data?.full_name ?? "Student"} — Bridge to Malaysia Admin` };
}

export default async function StudentDetailPage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const tab = searchParams.tab ?? "tracking";

  const [studentRes, historyRes, invoicesRes, paymentsRes, contractsRes] = await Promise.all([
    supabase.from("students").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("stage_history")
      .select("*")
      .eq("student_id", params.id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("student_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("*")
      .eq("student_id", params.id)
      .order("generated_at", { ascending: false }),
  ]);

  const student = studentRes.data;
  if (!student) notFound();

  const history = historyRes.data ?? [];
  const invoices = invoicesRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const contracts = contractsRes.data ?? [];

  const totalInvoiced = invoices
    .filter((i: any) => i.status !== "draft" && i.status !== "cancelled")
    .reduce((s: number, i: any) => s + Number(i.total_amount ?? 0), 0);
  const totalPaid = payments
    .filter((p: any) => p.status === "approved")
    .reduce((s: number, p: any) => s + Number(p.amount_received ?? 0), 0);
  const balance = totalInvoiced - totalPaid;

  return (
    <div className="p-5 sm:p-8 max-w-5xl">
      <Link href="/admin/students" className="btn-ghost -ml-3">
        <ArrowLeft className="h-4 w-4" /> All students
      </Link>

      <header className="mt-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-eyebrow">{stageLabel(student.current_stage)}</p>
            {student.agency_referred_at && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold"
                title={`Sent ${formatDateTime(student.agency_referred_at)}${
                  student.agency_referred_to ? ` to ${student.agency_referred_to}` : ""
                }`}
              >
                <CheckCircle2 className="h-3 w-3" />
                Forwarded {formatDate(student.agency_referred_at)}
              </span>
            )}
          </div>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-brand-ink">
            {student.full_name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-ink/70">
            {student.passport_no && (
              <span className="font-mono">{student.passport_no}</span>
            )}
            {student.email && (
              <a href={`mailto:${student.email}`} className="hover:text-brand-ink">
                {student.email}
              </a>
            )}
            {student.phone && (
              <a href={`https://wa.me/${student.phone.replace(/\D/g, "")}`} className="hover:text-brand-ink">
                {student.phone}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap gap-2 justify-end">
            {student.passport_no && (
              <Link
                href={`/track/${encodeURIComponent(student.passport_no)}`}
                target="_blank"
                className="btn-ghost border border-brand-stone"
              >
                <Eye className="h-4 w-4" /> Preview student view
              </Link>
            )}
            <AgencyReferralButton
              studentId={student.id}
              agencyReferredAt={student.agency_referred_at ?? null}
              agencyReferredTo={student.agency_referred_to ?? null}
            />
            <Link
              href={`/admin/students/${student.id}/edit`}
              className="btn-ghost border border-brand-stone"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Link>
            <DeleteStudentButton
              studentId={student.id}
              studentName={student.full_name}
            />
          </div>
        </div>
      </header>

      {/* Summary strip */}
      <section className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="University" value={student.university ?? "—"} sub={student.campus} />
        <SummaryCard label="Intake" value={student.intake ?? "—"} />
        <SummaryCard
          label="Invoiced"
          value={formatCurrency(totalInvoiced, "BDT")}
          mono
        />
        <SummaryCard
          label="Balance"
          value={formatCurrency(balance, "BDT")}
          mono
          accent={balance > 0}
        />
      </section>

      <StudentTabs current={tab} studentId={student.id} />

      <div className="mt-6">
        {tab === "tracking" && (
          <TrackingUpdates student={student as any} history={history as any} />
        )}
        {tab === "invoices" && (
          <StudentInvoices student={student as any} invoices={invoices as any} payments={payments as any} />
        )}
        {tab === "contracts" && (
          <StudentContracts student={student as any} contracts={contracts as any} />
        )}
        {tab === "details" && (
          <DetailsTab student={student as any} />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  mono,
  accent,
}: {
  label: string;
  value: string;
  sub?: string | null;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="card-paper p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-brand-muted">{label}</div>
      <div className={`mt-1.5 font-display text-lg sm:text-xl truncate ${mono ? "font-mono text-base" : ""} ${accent ? "text-brand-bridge" : "text-brand-ink"}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-brand-muted truncate">{sub}</div>}
    </div>
  );
}

function DetailsTab({ student }: { student: any }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["Full name", student.full_name],
    ["Passport", student.passport_no ?? "—"],
    ["Email", student.email ?? "—"],
    ["Phone", student.phone ?? "—"],
    ["Address", student.address ?? "—"],
    ["University", student.university ?? "—"],
    ["Campus", student.campus ?? "—"],
    ["Intake", student.intake ?? "—"],
    ["Subject 1", student.subject_1 ?? "—"],
    ["Subject 2", student.subject_2 ?? "—"],
    [
      "Drive folder",
      student.drive_folder_url ? (
        <a href={student.drive_folder_url} target="_blank" rel="noopener" className="text-brand-bridge inline-flex items-center gap-1">
          Open folder <ExternalLink className="h-3 w-3" />
        </a>
      ) : (
        "—"
      ),
    ],
    ["Contract required", student.contract_required ? "Yes" : "No"],
    ["Uploads enabled", student.upload_enabled ? "Yes" : "No"],
    [
      "Agency referral",
      student.agency_referred_at
        ? `Sent ${formatDateTime(student.agency_referred_at)}${
            student.agency_referred_to ? ` to ${student.agency_referred_to}` : ""
          }`
        : "Not sent yet",
    ],
    ["Referred by", student.referred_by_name ? `${student.referred_by_name}${student.referred_by_phone ? ` · ${student.referred_by_phone}` : ""}` : "—"],
    ["Notes", student.notes ?? "—"],
    ["Created", formatDate(student.created_at)],
  ];
  return (
    <div className="card-paper p-5">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {rows.map(([k, v]) => (
          <div key={k} className="border-b border-brand-stone/50 pb-3">
            <dt className="text-[11px] uppercase tracking-wider text-brand-muted">{k}</dt>
            <dd className="mt-1 text-sm text-brand-ink whitespace-pre-line">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
