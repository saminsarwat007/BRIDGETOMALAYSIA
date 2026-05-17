import { NextResponse } from "next/server";
import React from "react";
import { createServiceClient } from "@/lib/supabase/server";
import { ContractPDF } from "@/lib/pdf/contract-pdf";
import { renderAndUploadPdf } from "@/lib/pdf/pdf-to-drive";
import { buildContractFilename } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public contract e-signing — student agrees to the contract.
 * POST { passport, contract_id }
 * Records signed=true, signed_at=now(), signed_ip from request headers.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const passport = String(body.passport ?? "").trim();
    const contractId = String(body.contract_id ?? "").trim();
    const signatureImage: string | undefined = body.signature_image;

    if (!passport || !contractId) {
      return NextResponse.json({ ok: false, error: "Missing passport or contract_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify student
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name, passport_no, address, drive_folder_id, drive_folder_url, invoice_subfolder_id")
      .eq("passport_no", passport)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
    }

    // Verify contract belongs to student
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, signed, field_values")
      .eq("id", contractId)
      .eq("student_id", student.id)
      .maybeSingle();

    if (!contract) {
      return NextResponse.json({ ok: false, error: "Contract not found" }, { status: 404 });
    }

    if (contract.signed) {
      return NextResponse.json({ ok: true, already_signed: true });
    }

    // Extract client IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    // Mark as signed — merge signature image into existing field_values
    const existingFields = (contract.field_values ?? {}) as Record<string, unknown>;
    const updatedFields = signatureImage
      ? { ...existingFields, client_signature_image: signatureImage }
      : existingFields;

    const { error } = await supabase
      .from("contracts")
      .update({
        signed: true,
        signed_at: new Date().toISOString(),
        signed_ip: ip,
        field_values: updatedFields,
      })
      .eq("id", contractId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const signedAt = new Date().toISOString();

    // Generate signed PDF and upload to Drive (non-blocking — don't fail the response)
    try {
      const contractForPdf = {
        id: contractId,
        student_id: student.id,
        contract_number: (contract as any).contract_number ?? "",
        field_values: updatedFields,
        signed: true,
        signed_at: signedAt,
        drive_file_id: null,
        drive_link: null,
        generated_at: new Date().toISOString(),
        notes: null,
      };

      // Re-fetch contract_number if not already in the select
      const { data: fullContract } = await supabase
        .from("contracts")
        .select("contract_number")
        .eq("id", contractId)
        .single();

      if (fullContract) contractForPdf.contract_number = fullContract.contract_number;

      const pdfElement = React.createElement(ContractPDF, {
        contract: contractForPdf as any,
        student: student as any,
      });

      await renderAndUploadPdf({
        supabaseClient: supabase,
        student,
        pdfElement,
        filename: buildContractFilename(student.full_name, true),
        subfolder: "Contracts",
        table: "contracts",
        recordId: contractId,
      });
    } catch (pdfErr) {
      console.error("Signed PDF upload failed (non-blocking):", pdfErr);
    }

    return NextResponse.json({ ok: true, signed_at: signedAt });
  } catch (err) {
    console.error("sign-contract error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
