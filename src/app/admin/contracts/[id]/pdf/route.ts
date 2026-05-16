import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { ContractPDF } from "@/lib/pdf/contract-pdf";
import React from "react";
import { buildContractFilename } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*, students(*)")
    .eq("id", params.id)
    .single();

  if (error || !contract) {
    return NextResponse.json({ error: "Contract not found" }, { status: 404 });
  }

  const student = (contract as any).students;
  const filename = buildContractFilename(student.full_name);

  const element = React.createElement(ContractPDF, {
    contract: contract as any,
    student,
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
