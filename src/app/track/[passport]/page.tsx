import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";
import { TrackingView } from "./tracking-view";
import { ArrowLeft } from "lucide-react";
import type { TrackingPayload } from "@/types/database";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { passport: string };
}

export async function generateMetadata({ params }: PageProps) {
  return {
    title: `Application Status — ${decodeURIComponent(params.passport)}`,
  };
}

export default async function TrackingDetailPage({ params }: PageProps) {
  const passport = decodeURIComponent(params.passport).trim();
  if (!passport) notFound();

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("get_tracking_by_passport", {
    p_passport: passport,
  });

  if (error) {
    console.error("tracking lookup error", error);
  }

  const payload = data as TrackingPayload | null;

  let documents: Array<{
    doc_type: string;
    status: "pending" | "received" | "rejected";
    rejection_reason: string | null;
    drive_link: string | null;
  }> = [];
  if (payload?.student?.id) {
    const { data: docs } = await supabase
      .from("documents")
      .select("doc_type, status, rejection_reason, drive_link")
      .eq("student_id", payload.student.id);
    documents = docs ?? [];
  }

  if (!payload) {
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
