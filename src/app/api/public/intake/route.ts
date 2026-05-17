import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { ensureSubfolder, uploadToDrive, getFolderMetadata } from "@/lib/google/drive";
import { slugForFilename } from "@/lib/utils";
import { findDocument, documentsSubfolderName } from "@/lib/documents";
import {
  clientIpFromRequest,
  limitPublicIntake,
  rateLimitHeaders,
} from "@/lib/security/rate-limit";
import { verifyTurnstile } from "@/lib/security/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Schema = z.object({
  full_name: z.string().min(1),
  passport_no: z.string().optional(),
  email: z.string().email(),
  phone: z.string().min(4),
  address: z.string().optional(),
  university: z.string().optional(),
  campus: z.string().optional(),
  intake: z.string().optional(),
  subject_1: z.string().optional(),
  subject_2: z.string().optional(),
  referred_by_name: z.string().optional(),
  referred_by_phone: z.string().optional(),
  notes: z.string().optional(),
});

const empty = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // ── Step 0a: rate limit (cheapest possible reject path) ──────────────────
    const ip = clientIpFromRequest(request);
    const limit = await limitPublicIntake(ip);
    if (!limit.ok) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((limit.reset - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Too many submissions from this network. Please try again in about ${humanizeSeconds(
            retryAfterSec
          )}.`,
          retryAfterSec,
        },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    const form = await request.formData();

    // Pull plain string fields out for zod validation
    const raw: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") raw[key] = value;
    }

    // ── Step 0b: Turnstile (CAPTCHA) verification ────────────────────────────
    const turnstileToken =
      raw["cf-turnstile-response"] ?? raw["turnstile_token"] ?? null;
    const captcha = await verifyTurnstile(turnstileToken, ip);
    if (!captcha.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: captcha.message ?? "CAPTCHA verification failed.",
          codes: captcha.errorCodes,
        },
        { status: 400, headers: rateLimitHeaders(limit) }
      );
    }

    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
        { status: 400, headers: rateLimitHeaders(limit) }
      );
    }
    const d = parsed.data;

    const supabase = createServiceClient();

    const composedNotes = [
      d.notes?.trim() ? `Student note: ${d.notes.trim()}` : null,
      "Submitted via public /start form.",
    ]
      .filter(Boolean)
      .join("\n");

    const { data: studentRow, error } = await supabase
      .from("students")
      .insert({
        full_name: d.full_name,
        passport_no: empty(d.passport_no),
        email: empty(d.email),
        phone: empty(d.phone),
        address: empty(d.address),
        university: empty(d.university),
        campus: empty(d.campus),
        intake: empty(d.intake),
        subject_1: empty(d.subject_1),
        subject_2: empty(d.subject_2),
        referred_by_name: empty(d.referred_by_name),
        referred_by_phone: empty(d.referred_by_phone),
        notes: composedNotes,
        current_stage: "initial_consultation",
        contract_required: true,
        upload_enabled: true,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          {
            ok: false,
            error:
              "We already have an application with that passport number. Use /track to check status.",
          },
          { status: 409 }
        );
      }
      console.error("intake insert error", error);
      return NextResponse.json(
        { ok: false, error: "Couldn't save your application" },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------
    // Try to upload any attached files to the student's Drive folder.
    // Failures here should NOT block the intake — we still want the student
    // record saved + an admin email sent so a human can follow up.
    // ------------------------------------------------------------------
    type UploadSummaryRow = {
      label: string;
      status: "uploaded" | "failed" | "skipped";
      link?: string;
      error?: string;
    };
    const uploadSummary: UploadSummaryRow[] = [];
    let studentFolderUrl: string | null = null;
    let studentFolderId: string | null = null;

    const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID?.trim();

    // Collect document files keyed by doc-key, plus extras
    const docFiles: Array<{ key: string; file: File }> = [];
    const extraFiles: File[] = [];
    for (const [field, val] of form.entries()) {
      if (typeof val === "string") continue;
      const file = val as File;
      if (file.size === 0) continue;
      if (field.startsWith("document__")) {
        docFiles.push({ key: field.slice("document__".length), file });
      } else if (field === "attachment") {
        extraFiles.push(file);
      }
    }
    const totalFiles = docFiles.length + extraFiles.length;

    if (totalFiles > 0) {
      if (!parentId) {
        for (const { key } of docFiles) {
          const def = findDocument(key);
          uploadSummary.push({
            label: def?.label ?? key,
            status: "failed",
            error: "Drive parent folder not configured (admin task)",
          });
        }
        for (const f of extraFiles) {
          uploadSummary.push({
            label: f.name,
            status: "failed",
            error: "Drive parent folder not configured (admin task)",
          });
        }
      } else {
        try {
          // Build folder name: "Full Name — University (intake)" — falls back gracefully
          const folderName = buildStudentFolderName(d);
          studentFolderId = await ensureSubfolder(parentId, folderName);
          try {
            const meta = await getFolderMetadata(studentFolderId);
            studentFolderUrl = meta.webViewLink ?? `https://drive.google.com/drive/folders/${studentFolderId}`;
          } catch {
            studentFolderUrl = `https://drive.google.com/drive/folders/${studentFolderId}`;
          }

          // Save drive folder reference on student row
          await supabase
            .from("students")
            .update({
              drive_folder_id: studentFolderId,
              drive_folder_url: studentFolderUrl,
            })
            .eq("id", studentRow.id);

          // Documents subfolder
          let docsFolderId: string | null = null;
          if (docFiles.length > 0) {
            docsFolderId = await ensureSubfolder(
              studentFolderId,
              documentsSubfolderName(d.full_name)
            );
          }

          // Upload each document
          for (const { key, file } of docFiles) {
            const def = findDocument(key);
            const label = def?.label ?? key;
            try {
              if (file.size > Math.min(MAX_BYTES, (def?.maxSizeMB ?? 25) * 1024 * 1024)) {
                throw new Error(`File too large (max ${def?.maxSizeMB ?? 25}MB)`);
              }
              const ext = inferExtension(file.name, file.type);
              const dateStr = new Date().toISOString().slice(0, 10);
              const fileName = `${slugForFilename(d.full_name)}_${key}_${dateStr}.${ext}`;
              const bytes = Buffer.from(await file.arrayBuffer());
              const uploaded = await uploadToDrive({
                folderId: docsFolderId!,
                fileName,
                mimeType: file.type || "application/octet-stream",
                body: bytes,
                makeAnyoneReader: true,
              });

              await supabase.from("documents").insert({
                student_id: studentRow.id,
                doc_type: label,
                status: "received",
                drive_link: uploaded.webViewLink,
              });

              uploadSummary.push({ label, status: "uploaded", link: uploaded.webViewLink });
            } catch (e) {
              const msg = (e as Error)?.message ?? "Upload failed";
              console.error("intake document upload failed", key, e);
              uploadSummary.push({ label, status: "failed", error: msg });
              // Still create a pending DB row so the admin can see it and request re-upload
              try {
                await supabase.from("documents").insert({
                  student_id: studentRow.id,
                  doc_type: label,
                  status: "pending",
                  drive_link: null,
                });
              } catch { /* ignore duplicate errors */ }
            }
          }

          // Extra attachments — go into a separate "Other Attachments" subfolder
          if (extraFiles.length > 0) {
            const extrasFolderId = await ensureSubfolder(
              studentFolderId,
              "Other Attachments"
            );
            for (const file of extraFiles) {
              try {
                if (file.size > MAX_BYTES) {
                  throw new Error("File too large (max 25MB)");
                }
                const bytes = Buffer.from(await file.arrayBuffer());
                const safeName = sanitizeFileName(file.name);
                const uploaded = await uploadToDrive({
                  folderId: extrasFolderId,
                  fileName: safeName,
                  mimeType: file.type || "application/octet-stream",
                  body: bytes,
                  makeAnyoneReader: true,
                });

                await supabase.from("documents").insert({
                  student_id: studentRow.id,
                  doc_type: "Other Attachment",
                  status: "received",
                  drive_link: uploaded.webViewLink,
                });

                uploadSummary.push({
                  label: file.name,
                  status: "uploaded",
                  link: uploaded.webViewLink,
                });
              } catch (e) {
                const msg = (e as Error)?.message ?? "Upload failed";
                console.error("intake attachment upload failed", file.name, e);
                uploadSummary.push({ label: file.name, status: "failed", error: msg });
              }
            }
          }
        } catch (folderErr) {
          console.error("intake drive folder creation failed", folderErr);
          for (const { key } of docFiles) {
            const def = findDocument(key);
            const label = def?.label ?? key;
            uploadSummary.push({ label, status: "failed", error: "Couldn't create Drive folder" });
            // Save pending row so admin can see documents were submitted
            try {
              await supabase.from("documents").insert({
                student_id: studentRow.id,
                doc_type: label,
                status: "pending",
                drive_link: null,
              });
            } catch { /* ignore */ }
          }
          for (const f of extraFiles) {
            uploadSummary.push({ label: f.name, status: "failed", error: "Couldn't create Drive folder" });
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Notify admin
    // ------------------------------------------------------------------
    try {
      const adminEmail = process.env.RESEND_REPLY_TO ?? "bridgetomalaysiabd@gmail.com";
      const detailRows: Array<[string, string]> = [
        ["Name", d.full_name],
        ["Email", d.email],
        ["Phone", d.phone],
        ["Passport", d.passport_no ?? "—"],
        ["University", d.university ?? "—"],
        ["Campus", d.campus ?? "—"],
        ["Intake", d.intake ?? "—"],
        ["Subject 1", d.subject_1 ?? "—"],
        ["Subject 2", d.subject_2 ?? "—"],
        ["Address", d.address ?? "—"],
        [
          "Referred by",
          d.referred_by_name
            ? `${d.referred_by_name}${d.referred_by_phone ? ` · ${d.referred_by_phone}` : ""}`
            : "—",
        ],
        ["Note", d.notes ?? "—"],
      ];

      const uploadSection = uploadSummary.length
        ? `<h3 style="margin-top:24px;font-family:Georgia,serif;">Files uploaded</h3>
           <ul style="font-family:Georgia,serif;">${uploadSummary
             .map((u) =>
               u.status === "uploaded"
                 ? `<li>✅ <strong>${escapeHtml(u.label)}</strong> — <a href="${u.link}">view</a></li>`
                 : `<li>⚠️ <strong>${escapeHtml(u.label)}</strong> — ${escapeHtml(u.error ?? "failed")}</li>`
             )
             .join("")}</ul>`
        : "<p>(No files attached.)</p>";

      const folderLink = studentFolderUrl
        ? `<p><strong>Drive folder:</strong> <a href="${studentFolderUrl}">${escapeHtml(
            studentFolderUrl
          )}</a></p>`
        : process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
        ? ""
        : `<p style="color:#a04030"><strong>Heads up:</strong> set GOOGLE_DRIVE_PARENT_FOLDER_ID in env to enable auto folder creation.</p>`;

      await sendEmail({
        to: adminEmail,
        subject: `New student intake — ${d.full_name}`,
        html: `
          <h2>New student intake</h2>
          <p>A new student submitted their details via the public form.</p>
          <table style="font-family:Georgia,serif;border-collapse:collapse;width:100%;max-width:520px;">
            ${detailRows
              .map(
                ([k, v]) =>
                  `<tr><td style="padding:6px 12px 6px 0;color:#8C7B6A;vertical-align:top;">${k}</td><td style="padding:6px 0;">${escapeHtml(
                    v
                  )}</td></tr>`
              )
              .join("")}
          </table>
          ${folderLink}
          ${uploadSection}
          <p style="margin-top:18px;">Open in admin: <a href="${
            process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
          }/admin/students/${studentRow.id}">View student</a></p>
        `,
        text: `New student intake: ${d.full_name} (${d.email}, ${d.phone}). Files: ${uploadSummary
          .map((u) => `${u.label} [${u.status}]`)
          .join("; ")}`,
      });
    } catch (e) {
      console.error("intake notification email failed", e);
    }

    return NextResponse.json({
      ok: true,
      id: studentRow.id,
      drive_folder_url: studentFolderUrl,
      uploads: uploadSummary,
    });
  } catch (err) {
    console.error("intake error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

function buildStudentFolderName(d: z.infer<typeof Schema>): string {
  const name = d.full_name.trim();
  const uniShort = (() => {
    if (!d.university) return null;
    // Try to pull short code from end like "(UTM)"
    const m = d.university.match(/\(([A-Z]{2,8})\)/);
    return m ? m[1] : null;
  })();
  return uniShort ? `${name} ${uniShort}` : name;
}

function inferExtension(name: string, mime: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (fromName) return fromName;
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("webp")) return "webp";
  return "bin";
}

function sanitizeFileName(input: string): string {
  return input.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 120);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function humanizeSeconds(sec: number): string {
  if (sec < 60) return `${sec} seconds`;
  if (sec < 60 * 60) return `${Math.ceil(sec / 60)} minutes`;
  return `${Math.ceil(sec / 3600)} hour${sec >= 7200 ? "s" : ""}`;
}
