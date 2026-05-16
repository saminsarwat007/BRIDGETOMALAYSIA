import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ensureSubfolder, uploadToDrive } from "@/lib/google/drive";
import { extractDriveFolderId } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";

interface UploadPdfOptions {
  /** The student row (needs id, full_name, drive_folder_id, drive_folder_url, invoice_subfolder_id) */
  student: {
    id: string;
    full_name: string;
    drive_folder_id?: string | null;
    drive_folder_url?: string | null;
    invoice_subfolder_id?: string | null;
  };
  /** The react-pdf Document element to render */
  pdfElement: React.ReactElement;
  /** Filename for the PDF (e.g. "samin_securitydeposit.pdf") */
  filename: string;
  /** Which subfolder inside the student folder to use */
  subfolder: "Invoice and Receipt" | "Contracts";
  /** DB table to update with drive_file_id / drive_link */
  table: "invoices" | "contracts";
  /** Row ID to update */
  recordId: string;
}

interface UploadResult {
  ok: boolean;
  drive_file_id?: string;
  drive_link?: string;
  error?: string;
}

/**
 * Renders a react-pdf element to a buffer, uploads it to the student's
 * Google Drive subfolder, and updates the DB record with the Drive link.
 *
 * Failures are non-blocking — the record is already saved in DB.
 * This just enriches it with a Drive copy.
 */
export async function renderAndUploadPdf(opts: UploadPdfOptions): Promise<UploadResult> {
  const { student, pdfElement, filename, subfolder, table, recordId } = opts;

  try {
    // 1. Find the student's Drive folder
    const folderId =
      student.drive_folder_id ?? extractDriveFolderId(student.drive_folder_url);

    if (!folderId) {
      return { ok: false, error: "Student has no Drive folder set" };
    }

    // 2. Ensure the subfolder exists (reuse invoice_subfolder_id if it's the invoice folder)
    let targetFolderId: string;
    if (subfolder === "Invoice and Receipt" && student.invoice_subfolder_id) {
      targetFolderId = student.invoice_subfolder_id;
    } else {
      targetFolderId = await ensureSubfolder(folderId, subfolder);

      // Cache the invoice subfolder ID for next time
      if (subfolder === "Invoice and Receipt" && !student.invoice_subfolder_id) {
        const supabase = createClient();
        await supabase
          .from("students")
          .update({ invoice_subfolder_id: targetFolderId })
          .eq("id", student.id);
      }
    }

    // 3. Render PDF to buffer
    const buf = await renderToBuffer(pdfElement as any);

    // 4. Upload to Drive
    const uploaded = await uploadToDrive({
      folderId: targetFolderId,
      fileName: filename,
      mimeType: "application/pdf",
      body: Buffer.from(buf),
      makeAnyoneReader: true,
    });

    // 5. Update DB record with Drive info
    const supabase = createClient();
    await supabase
      .from(table)
      .update({
        drive_file_id: uploaded.id,
        drive_link: uploaded.webViewLink,
      })
      .eq("id", recordId);

    return {
      ok: true,
      drive_file_id: uploaded.id,
      drive_link: uploaded.webViewLink,
    };
  } catch (e) {
    console.error(`[pdf-to-drive] Failed to upload ${filename}:`, e);
    return { ok: false, error: (e as Error)?.message ?? "Upload failed" };
  }
}
