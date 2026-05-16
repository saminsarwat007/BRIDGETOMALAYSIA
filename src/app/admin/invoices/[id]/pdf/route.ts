import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import React from "react";
import { buildInvoiceFilename } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: invoice, error }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("*, students(*)").eq("id", params.id).single(),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", params.id)
      .order("payment_date", { ascending: true }),
  ]);

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const student = (invoice as any).students;
  const filename =
    invoice.pdf_filename ?? buildInvoiceFilename(student.full_name, invoice.invoice_type);

  const element = React.createElement(InvoicePDF, {
    invoice: invoice as any,
    student,
    payments: (payments ?? []) as any,
  }) as any;
  const buf = await renderToBuffer(element);

  // Convert Buffer -> Uint8Array for Response BodyInit typing.
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
