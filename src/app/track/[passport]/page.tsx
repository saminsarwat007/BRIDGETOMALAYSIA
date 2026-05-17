import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { createServiceClient } from "@/lib/supabase/server";
import { TrackingView } from "./tracking-view";
import { ArrowLeft } from "lucide-react";
import type { TrackingPayload } from "@/types/database";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface PageProps {
  params: { passport: string };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Application Status — ${decodeURIComponent(params.passport)}`,
  };
}

export default async function TrackingDetailPage({ params }: PageProps) {
  noStore();
  const passport = decodeURIComponent(params.passport).trim();
  if (!passport) notFound();

  const supabase = createServiceClient();

  // Look up student directly (service role bypasses RLS)
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, current_stage, university, campus, intake, upload_enabled, whatsapp_group_url")
    .eq("passport_no", passport)
    .maybeSingle();

  if (!student) {
    return (
      <main className="min-h-screen paper">
        <div className="mx-auto max-w-2xl px-6 pt-12 pb-24">
          <Link href="/track" className="btn-ghost -ml-3">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="mt-20 card-paper p-10 text-center">
            <p className="label-eyebrow">No record found</p>
            <h1 className="mt-2 font-display text-3xl text-brand-ink">
              We couldn't find that passport.
            </h1>
            <p className="mt-3 text-brand-ink/70">
              Please double-check the number you entered, or message us on WhatsApp and we'll help you out.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/track" className="btn-gold">Try again</Link>
              <a href="https://wa.me/8801749913165" className="btn-ghost">WhatsApp us</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fetch all related data directly with service role (bypasses RLS)
  const [
    { data: invoicesRaw },
    { data: stageHistoryRaw },
    { data: contractsRaw },
    { data: docsRaw },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, total_amount, currency, status, due_date, created_at")
      .eq("student_id", student.id)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
    supabase
      .from("stage_history")
      .select("id, stage, comment, attachment_label, attachment_kind, attachment_drive_link, changed_at")
      .eq("student_id", student.id)
      .order("changed_at", { ascending: false }),
    supabase
      .from("contracts")
      .select("id, contract_number, signed, signed_at, generated_at")
      .eq("student_id", student.id)
      .order("generated_at", { ascending: false }),
    supabase
      .from("documents")
      .select("doc_type, status, rejection_reason, drive_link")
      .eq("student_id", student.id),
  ]);

  // Compute total_paid per invoice
  const invoices = await Promise.all(
    (invoicesRaw ?? []).map(async (inv) => {
      const { data: pays } = await supabase
        .from("payments")
        .select("amount_received")
        .eq("invoice_id", inv.id)
        .eq("status", "approved");
      const total_paid = (pays ?? []).reduce((s, p) => s + Number(p.amount_received), 0);
      return { ...inv, total_paid };
    })
  );

  const payload: TrackingPayload = {
    student,
    invoices,
    stage_history: stageHistoryRaw ?? [],
    contracts: contractsRaw ?? [],
  };

  const documents = docsRaw ?? [];

  return (
    <main className="min-h-screen paper">
      <div className="mx-auto max-w-4xl px-5 sm:px-6 pt-8 pb-24">
        <div className="flex items-center justify-between">
          <Link href="/track" className="btn-ghost -ml-3">
            <ArrowLeft className="h-4 w-4" /> New search
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.jpg" alt="" width={32} height={32} className="rounded" />
            <span className="text-xs uppercase tracking-[0.2em] text-brand-muted hidden sm:inline">
              Bridge to Malaysia
            </span>
          </Link>
        </div>

        <TrackingView payload={payload} passport={passport} documents={documents} />
      </div>
    </main>
  );
}
