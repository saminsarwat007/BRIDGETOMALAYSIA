import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureSubfolder, uploadToDrive } from "@/lib/google/drive";
import { extractDriveFolderId, slugForFilename } from "@/lib/utils";
import { findDocument, documentsSubfolderName } from "@/lib/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const passport = String(form.get("passport") ?? "").trim();
    const docKey = String(form.get("doc_type") ?? "").trim();
    const file = form.get("file") as File | null;

    if (!passport || !docKey || !file) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const docDef = findDocument(docKey);
    if (!docDef) {
      return NextResponse.json({ ok: false, error: "Unknown document type" }, { status: 400 });
    }

    if (file.size > Math.min(MAX_BYTES, docDef.maxSizeMB * 1024 * 1024)) {
      return NextResponse.json(
        { ok: false, error: `File too large (max ${docDef.maxSizeMB}MB)` },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: student } = await supabase
      .from("students")
      .select(
        "id, full_name, university, intake, drive_folder_id, drive_folder_url, upload_enabled"
      )
      .eq("passport_no", passport)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
    }
    if (!student.upload_enabled) {
      return NextResponse.json(
        { ok: false, error: "Uploads are disabled for your account" },
        { status: 403 }
      );
    }

    let folderId =
      student.drive_folder_id ?? extractDriveFolderId(student.drive_folder_url);

    // Auto-create the student's Drive folder if it doesn't exist yet
    if (!folderId) {
      const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID?.trim();
      if (!parentId) {
        return NextResponse.json(
          { ok: false, error: "Drive is not configured yet. Please contact our team on WhatsApp." },
          { status: 503 }
        );
      }
      try {
        // Build folder name: "Full Name — University (Intake)"
        const uniShort = (() => {
          if (!student.university) return null;
          const m = (student.university as string).match(/\(([A-Z]{2,8})\)/);
          return m ? m[1] : (student.university as string).split(" ").slice(0, 2).join(" ");
        })();
        const intakePart = student.intake ? ` (${student.intake})` : "";
        const folderName = uniShort
          ? `${student.full_name} — ${uniShort}${intakePart}`
          : `${student.full_name}${intakePart}`;
        folderId = await ensureSubfolder(parentId, folderName);
        // Save for next time
        await supabase
          .from("students")
          .update({ drive_folder_id: folderId })
          .eq("id", student.id);
      } catch (err) {
        console.error("auto-create drive folder failed", err);
        return NextResponse.json(
          { ok: false, error: "Couldn't set up your Drive folder. Please contact our team on WhatsApp." },
          { status: 500 }
        );
      }
    }

    // Ensure the personal-documents subfolder exists
    let docsFolderId: string;
    try {
      docsFolderId = await ensureSubfolder(folderId, documentsSubfolderName(student.full_name));
    } catch (err) {
      console.error("ensureSubfolder error", err);
      return NextResponse.json(
        { ok: false, error: "Couldn't access Drive. Please contact admin." },
        { status: 500 }
      );
    }

    // Build filename: samin_passport_info_page_2026-05-16.png
    const ext = inferExtension(file.name, file.type);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${slugForFilename(student.full_name)}_${docDef.key}_${dateStr}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToDrive({
      folderId: docsFolderId,
      fileName,
      mimeType: file.type || "application/octet-stream",
      body: bytes,
      makeAnyoneReader: true,
    });

    // Upsert the documents row for this student + doc_type
    const { data: existing } = await supabase
      .from("documents")
      .select("id")
      .eq("student_id", student.id)
      .eq("doc_type", docDef.label)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("documents")
        .update({
          status: "received",
          rejection_reason: null,
          drive_link: uploaded.webViewLink,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("documents").insert({
        student_id: student.id,
        doc_type: docDef.label,
        status: "received",
        drive_link: uploaded.webViewLink,
      });
    }

    return NextResponse.json({
      ok: true,
      doc_type: docDef.key,
      drive_link: uploaded.webViewLink,
    });
  } catch (err) {
    console.error("upload-document error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

function inferExtension(name: string, mime: string): string {
  const fromName = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (fromName) return fromName;
  if (mime.includes("png")) return "png";
  if (mime.includes("jpeg")) return "jpg";
  if (mime.includes("pdf")) return "pdf";
  return "bin";
}
