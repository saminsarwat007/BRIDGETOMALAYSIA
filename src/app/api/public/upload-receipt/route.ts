import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ensureSubfolder, uploadToDrive } from "@/lib/google/drive";
import { extractDriveFolderId, slugForFilename } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const passport = String(form.get("passport") ?? "").trim();
    const invoiceId = String(form.get("invoice_id") ?? "").trim();
    const amount = Number(form.get("amount") ?? 0);
    const method = String(form.get("method") ?? "");
    const description = String(form.get("description") ?? "");
    const file = form.get("file") as File | null;

    if (!passport || !invoiceId || !file || amount <= 0) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "File too large (max 10MB)" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Look up student + invoice to validate
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name, drive_folder_id, drive_folder_url, invoice_subfolder_id, upload_enabled")
      .eq("passport_no", passport)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
    }
    if (!student.upload_enabled) {
      return NextResponse.json({ ok: false, error: "Uploads are disabled for your account" }, { status: 403 });
    }

    const { data: invoice } = await supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, student_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (!invoice || invoice.student_id !== student.id) {
      return NextResponse.json({ ok: false, error: "Invoice not found" }, { status: 404 });
    }

    // Locate parent Drive folder
    const folderId =
      student.drive_folder_id ?? extractDriveFolderId(student.drive_folder_url);
    if (!folderId) {
      return NextResponse.json(
        { ok: false, error: "Drive folder not set for this student. Please contact admin." },
        { status: 400 }
      );
    }

    // Find or create the "Invoice and Receipt" subfolder
    let invoiceSubfolderId = student.invoice_subfolder_id;
    if (!invoiceSubfolderId) {
      try {
        invoiceSubfolderId = await ensureSubfolder(folderId, "Invoice and Receipt");
        await supabase
          .from("students")
          .update({ invoice_subfolder_id: invoiceSubfolderId })
          .eq("id", student.id);
      } catch (err) {
        console.error("ensureSubfolder error", err);
        return NextResponse.json(
          { ok: false, error: "Couldn't access Drive folder. Please verify sharing." },
          { status: 500 }
        );
      }
    }

    // Build receipt filename: samin_receipt_securitydeposit_2026-05-16.ext
    const ext = inferExtension(file.name, file.type);
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${slugForFilename(student.full_name)}_receipt_${slugForFilename(invoice.invoice_type)}_${dateStr}.${ext}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const uploaded = await uploadToDrive({
      folderId: invoiceSubfolderId,
      fileName,
      mimeType: file.type || "application/octet-stream",
      body: bytes,
      makeAnyoneReader: true,
    });

    // Record payment via secure function
    const { data: rpc, error: rpcErr } = await supabase.rpc("submit_student_payment", {
      p_passport: passport,
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_method: method,
      p_description: description,
      p_receipt_drive_file_id: uploaded.id,
      p_receipt_drive_link: uploaded.webViewLink,
    });

    if (rpcErr) {
      console.error("submit_student_payment error", rpcErr);
      return NextResponse.json({ ok: false, error: "Couldn't save payment" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, payment: rpc });
  } catch (err) {
    console.error("upload-receipt error", err);
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
