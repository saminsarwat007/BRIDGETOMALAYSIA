import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/server";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import { buildInvoiceFilename } from "@/lib/utils";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public invoice PDF download — verified by passport number.
 * GET /api/public/invoice-pdf?passport=XX1234567&invoice_id=uuid
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const passport = searchParams.get("passport")?.trim();
  const invoiceId = searchParams.get("invoice_id")?.trim();

  if (!passport || !invoiceId) {
    return NextResponse.json({ error: "Missing passport or invoice_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Verify the student owns this invoice
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, passport_no, email, phone, address, university, campus, intake")
    .eq("passport_no", passport)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const [{ data: invoice, error }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", invoiceId).eq("student_id", student.id).maybeSingle(),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .eq("status", "approved")
      .order("payment_date", { ascending: true }),
  ]);

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Don't serve draft invoices to students
  if (invoice.status === "draft") {
    return NextResponse.json({ error: "Invoice not available" }, { status: 403 });
  }

  const filename =
    invoice.pdf_filename ?? buildInvoiceFilename(student.full_name, invoice.invoice_type);

  const element = React.createElement(InvoicePDF, {
    invoice: invoice as any,
    student: student as any,
    payments: (payments ?? []) as any,
  }) as any;
  const buf = await renderToBuffer(element);

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
