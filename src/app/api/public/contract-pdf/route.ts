import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createServiceClient } from "@/lib/supabase/server";
import { ContractPDF } from "@/lib/pdf/contract-pdf";
import { buildContractFilename } from "@/lib/utils";
import React from "react";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public contract PDF download — verified by passport number.
 * GET /api/public/contract-pdf?passport=XX1234567&contract_id=uuid
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const passport = searchParams.get("passport")?.trim();
  const contractId = searchParams.get("contract_id")?.trim();

  if (!passport || !contractId) {
    return NextResponse.json({ error: "Missing passport or contract_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, passport_no, address, university, campus, intake")
    .eq("passport_no", passport)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const filename = buildContractFilename(student.full_name);

  const element = React.createElement(ContractPDF, {
    contract: contract as any,
    student: student as any,
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
