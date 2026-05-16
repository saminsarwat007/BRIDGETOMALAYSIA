import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

function getClient() {
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

export interface PassportData {
  full_name: string | null;
  given_name: string | null;
  surname: string | null;
  passport_no: string | null;
  date_of_birth: string | null;
  sex: string | null;
  nationality: string | null;
  place_of_birth: string | null;
  date_of_issue: string | null;
  date_of_expiry: string | null;
  address: string | null;
  father_name: string | null;
  mother_name: string | null;
  phone: string | null;
}

const PASSPORT_PROMPT = `You are an expert OCR system. Analyze this passport image (it may show one or both pages of a Bangladeshi passport — the bio-data page and the personal data/emergency contact page).

Extract the following fields. Return ONLY a valid JSON object with these keys. Use null for any field you cannot find.

{
  "full_name": "Full name as GIVEN NAME + SURNAME, e.g. MD JAWAD KIBRIA",
  "given_name": "Given name(s) only",
  "surname": "Surname/family name only",
  "passport_no": "Passport number, e.g. A20733781",
  "date_of_birth": "Date of birth in YYYY-MM-DD format",
  "sex": "M or F",
  "nationality": "e.g. BANGLADESHI",
  "place_of_birth": "e.g. CHATTOGRAM",
  "date_of_issue": "Issue date in YYYY-MM-DD format",
  "date_of_expiry": "Expiry date in YYYY-MM-DD format",
  "address": "Permanent address from the personal data page if visible",
  "father_name": "Father's name if visible on personal data page",
  "mother_name": "Mother's name if visible on personal data page",
  "phone": "Phone number from emergency contact if visible"
}

Rules:
- For names, use the EXACT text from the passport (uppercase is fine).
- For the full_name, combine given name and surname as: "GIVEN_NAME SURNAME" (e.g. "MD JAWAD KIBRIA").
- Parse dates from formats like "14 JAN 2007" into "2007-01-14".
- Return ONLY the JSON object, no markdown, no explanation.`;

/**
 * Extract structured passport data from an image using Gemini 2.5 Flash.
 */
export async function extractPassportData(
  imageBase64: string,
  mimeType: string
): Promise<PassportData> {
  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent([
    { text: PASSPORT_PROMPT },
    {
      inlineData: {
        mimeType,
        data: imageBase64,
      },
    },
  ]);

  const text = result.response.text().trim();

  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as PassportData;
  } catch {
    console.error("Gemini returned non-JSON:", text);
    throw new Error("Failed to parse passport data from AI response");
  }
}
