import "server-only";
import type { Agency } from "@/lib/agencies";
import { MALAYSIAN_UNIVERSITIES } from "@/lib/universities";

export interface AgencyReferralStudent {
  full_name: string;
  email: string | null;
  phone: string | null;
  university: string | null;
  campus: string | null;
  intake: string | null;
  subject_1: string | null;
  subject_2: string | null;
  drive_folder_url: string | null;
  passport_no: string | null;
}

export interface AgencyReferralEmail {
  subject: string;
  html: string;
  text: string;
  to: string;
  cc?: string[];
  /** Fields that were missing — surfaced in the preview so admin can fix before sending. */
  missing: string[];
}

/**
 * Build the agency referral email matching Bridge to Malaysia's existing
 * format (see _reference / email screenshot).
 */
export function buildAgencyReferralEmail(
  student: AgencyReferralStudent,
  agency: Agency
): AgencyReferralEmail {
  const missing: string[] = [];
  if (!student.full_name?.trim()) missing.push("Student name");
  if (!student.email?.trim()) missing.push("Student email");
  if (!student.phone?.trim()) missing.push("Student phone");
  if (!student.university?.trim()) missing.push("University");
  if (!student.intake?.trim()) missing.push("Intake");
  if (!student.subject_1?.trim()) missing.push("Subject choice 1");
  if (!student.drive_folder_url?.trim()) missing.push("Drive folder link");

  const uniShort = (() => {
    if (!student.university) return null;
    const u = MALAYSIAN_UNIVERSITIES.find(
      (x) => x.name.toLowerCase() === student.university!.toLowerCase()
    );
    return u?.short ?? null;
  })();

  const intakeText = student.intake?.trim() || "upcoming";
  const universityText = student.university?.trim() || "the chosen university";
  const greeting = agency.greeting || `Dear ${agency.name} Team,`;

  const subject = uniShort
    ? `Student Referral for ${intakeText} intake at ${uniShort}`
    : `Student Referral — ${student.full_name}`;

  // ────────────────── HTML ──────────────────
  const driveLinkHtml = student.drive_folder_url
    ? `<p><a href="${escapeAttr(student.drive_folder_url)}" style="color:#1a73e8;text-decoration:underline;">[Click Here To Download The Documents]</a></p>`
    : `<p style="color:#a04030;"><em>(Drive folder link not yet attached — please add before sending.)</em></p>`;

  const html = `
<div style="font-family:Georgia, 'Times New Roman', serif; color:#1a1a1a; line-height:1.55; font-size:15px;">
  <p>${escapeHtml(greeting)}</p>

  <p>I am writing to provide details for a student who is interested in applying to ${escapeHtml(
    universityText
  )}.</p>

  <p><strong>Student Details:</strong></p>

  <ul style="padding-left:22px; margin:0 0 14px 0;">
    <li><strong>University Name:</strong> ${escapeHtml(student.university ?? "—")}</li>
    <li><strong>Campus:</strong> ${escapeHtml(student.campus ?? "—")}</li>
    <li><strong>Subject Choice 1:</strong> ${escapeHtml(student.subject_1 ?? "—")}</li>
    ${
      student.subject_2?.trim()
        ? `<li><strong>Subject Choice 2:</strong> ${escapeHtml(student.subject_2)}</li>`
        : ""
    }
    <li><strong>Intake:</strong> ${escapeHtml(student.intake ?? "—")}</li>
  </ul>

  <ul style="padding-left:22px; margin:0 0 14px 0;">
    <li><strong>Student Name:</strong> ${escapeHtml(student.full_name)}</li>
    <li><strong>Student Number:</strong> ${escapeHtml(student.phone ?? "—")}</li>
    <li><strong>Student Email:</strong> ${
      student.email
        ? `<a href="mailto:${escapeAttr(student.email)}">${escapeHtml(student.email)}</a>`
        : "—"
    }</li>
    ${
      student.passport_no
        ? `<li><strong>Passport:</strong> ${escapeHtml(student.passport_no)}</li>`
        : ""
    }
  </ul>

  ${driveLinkHtml}

  <p>Please note that this application should be processed as a commission-based student referral.</p>

  <p>Best regards,<br/><strong>Bridge To Malaysia Team</strong></p>
</div>
`.trim();

  // ────────────────── Plain text ──────────────────
  const textLines: string[] = [
    greeting,
    "",
    `I am writing to provide details for a student who is interested in applying to ${universityText}.`,
    "",
    "Student Details:",
    `  • University Name: ${student.university ?? "—"}`,
    `  • Campus: ${student.campus ?? "—"}`,
    `  • Subject Choice 1: ${student.subject_1 ?? "—"}`,
  ];
  if (student.subject_2?.trim()) {
    textLines.push(`  • Subject Choice 2: ${student.subject_2}`);
  }
  textLines.push(`  • Intake: ${student.intake ?? "—"}`);
  textLines.push("");
  textLines.push(`  - Student Name: ${student.full_name}`);
  textLines.push(`  - Student Number: ${student.phone ?? "—"}`);
  textLines.push(`  - Student Email: ${student.email ?? "—"}`);
  if (student.passport_no) {
    textLines.push(`  - Passport: ${student.passport_no}`);
  }
  textLines.push("");
  if (student.drive_folder_url) {
    textLines.push(`Documents: ${student.drive_folder_url}`);
  }
  textLines.push("");
  textLines.push(
    "Please note that this application should be processed as a commission-based student referral."
  );
  textLines.push("");
  textLines.push("Best regards,");
  textLines.push("Bridge To Malaysia Team");

  return {
    subject,
    html,
    text: textLines.join("\n"),
    to: agency.email,
    cc: agency.cc,
    missing,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
