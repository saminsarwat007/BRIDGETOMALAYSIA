"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { agencyForUniversity, agencyIsSendable, findAgencyByKey } from "@/lib/agencies";
import {
  buildAgencyReferralEmail,
  type AgencyReferralEmail,
} from "@/lib/email/agency-referral";
import { sendEmail } from "@/lib/email/resend";

interface PreviewResult {
  ok: boolean;
  error?: string;
  agency?: { key: string; name: string; email: string };
  email?: AgencyReferralEmail;
  alreadySentAt?: string | null;
  alreadySentTo?: string | null;
  /** The actual FROM the agency will see (e.g. "Bridge to Malaysia <onboarding@resend.dev>") */
  from?: string;
  /** Reply-To if configured */
  replyTo?: string | null;
  /** True if still using Resend's shared sandbox sender — needs domain setup. */
  fromIsSandbox?: boolean;
}

function describeFrom() {
  const fromAddr = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const replyTo = process.env.RESEND_REPLY_TO ?? null;
  const fromIsSandbox = fromAddr.endsWith("@resend.dev");
  return {
    from: `Bridge to Malaysia <${fromAddr}>`,
    replyTo,
    fromIsSandbox,
  };
}

/**
 * Build a preview of the email that will be sent. Used by the admin modal so
 * the operator can check the recipient + content before clicking Send.
 */
export async function previewAgencyReferral(studentId: string): Promise<PreviewResult> {
  const supabase = createClient();
  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id, full_name, email, phone, university, campus, intake, subject_1, subject_2, drive_folder_url, passport_no, agency_referred_at, agency_referred_to"
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error || !student) {
    return { ok: false, error: error?.message ?? "Student not found" };
  }

  const fromInfo = describeFrom();
  const agency = agencyForUniversity(student.university);
  if (!agency) {
    return {
      ok: false,
      error: student.university
        ? `No agency mapped for "${student.university}". Add it in src/lib/agencies.ts.`
        : "Student has no university set yet.",
      alreadySentAt: student.agency_referred_at ?? null,
      alreadySentTo: student.agency_referred_to ?? null,
      ...fromInfo,
    };
  }

  const email = buildAgencyReferralEmail(student, agency);

  return {
    ok: true,
    agency: { key: agency.key, name: agency.name, email: agency.email },
    email,
    alreadySentAt: student.agency_referred_at ?? null,
    alreadySentTo: student.agency_referred_to ?? null,
    ...fromInfo,
  };
}

/**
 * Actually send the referral. Records the timestamp + recipient on the
 * student row so the admin UI can show "Sent on …".
 */
export async function sendAgencyReferral(
  studentId: string
): Promise<{ ok: boolean; error?: string; sentTo?: string }> {
  const supabase = createClient();
  const { data: student, error } = await supabase
    .from("students")
    .select(
      "id, full_name, email, phone, university, campus, intake, subject_1, subject_2, drive_folder_url, passport_no"
    )
    .eq("id", studentId)
    .maybeSingle();

  if (error || !student) {
    return { ok: false, error: error?.message ?? "Student not found" };
  }

  const agency = agencyForUniversity(student.university);
  if (!agency) {
    return {
      ok: false,
      error: `No agency mapped for "${student.university}". Add it in src/lib/agencies.ts.`,
    };
  }
  if (!agencyIsSendable(agency)) {
    return {
      ok: false,
      error: `Agency "${agency.name}" has no email configured. Update src/lib/agencies.ts.`,
    };
  }

  const built = buildAgencyReferralEmail(student, agency);
  if (!student.drive_folder_url) {
    return {
      ok: false,
      error:
        "Student has no Drive folder yet. Upload at least one document or set the Drive link before sending.",
    };
  }

  try {
    await sendEmail({
      to: built.to,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
  } catch (e) {
    console.error("agency referral send failed", e);
    return { ok: false, error: (e as Error)?.message ?? "Failed to send email" };
  }

  await supabase
    .from("students")
    .update({
      agency_referred_at: new Date().toISOString(),
      agency_referred_to: agency.email,
      agency_referred_key: agency.key,
    })
    .eq("id", studentId);

  revalidatePath(`/admin/students/${studentId}`);
  return { ok: true, sentTo: agency.email };
}

/** Sanity helper for any caller that wants the configured agency record. */
export async function _findAgency(key: string) {
  return findAgencyByKey(key);
}
