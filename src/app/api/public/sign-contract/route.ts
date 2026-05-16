import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

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

    if (!passport || !contractId) {
      return NextResponse.json({ ok: false, error: "Missing passport or contract_id" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify student
    const { data: student } = await supabase
      .from("students")
      .select("id, full_name")
      .eq("passport_no", passport)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ ok: false, error: "Student not found" }, { status: 404 });
    }

    // Verify contract belongs to student
    const { data: contract } = await supabase
      .from("contracts")
      .select("id, signed")
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

    // Mark as signed
    const { error } = await supabase
      .from("contracts")
      .update({
        signed: true,
        signed_at: new Date().toISOString(),
        signed_ip: ip,
      })
      .eq("id", contractId);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, signed_at: new Date().toISOString() });
  } catch (err) {
    console.error("sign-contract error", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
