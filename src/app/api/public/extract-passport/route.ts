import { NextResponse } from "next/server";
import { extractPassportData } from "@/lib/ai/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/extract-passport
 * Accepts a passport image (multipart form with "file" field)
 * Returns extracted passport data as JSON.
 *
 * Works for both admin and public intake flows.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Passport scanning is not configured (missing API key)" },
        { status: 503 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { ok: false, error: "File too large — max 10 MB" },
        { status: 400 }
      );
    }

    const mimeType = file.type || "image/jpeg";
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Only image files are supported (JPG, PNG, WebP)" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const data = await extractPassportData(base64, mimeType);

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("extract-passport error:", err);
    return NextResponse.json(
      { ok: false, error: (err as Error)?.message ?? "Failed to extract passport data" },
      { status: 500 }
    );
  }
}
