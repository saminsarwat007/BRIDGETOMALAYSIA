/**
 * Canonical list of documents required from each student, with submission
 * guidelines. Update here when university requirements change.
 *
 * Keep `key` stable — it's stored in the `documents.doc_type` column and
 * referenced by the public upload endpoint.
 */

export interface DocumentGuideline {
  key: string;
  label: string;
  shortLabel: string;
  required: boolean;
  guidelines: string[];
  acceptedFormats: string;
  maxSizeMB: number;
}

export const REQUIRED_DOCUMENTS: DocumentGuideline[] = [
  {
    key: "passport_info_page",
    label: "Passport — information page",
    shortLabel: "Passport (info page)",
    required: true,
    guidelines: [
      "Clear, well-lit photo or scan of the page that shows your photo and details.",
      "All four corners visible. No fingers covering text.",
      "All text readable when zoomed in.",
      "If you renewed your passport recently, send the new one.",
    ],
    acceptedFormats: "PDF, JPG, or PNG",
    maxSizeMB: 10,
  },
  {
    key: "passport_all_pages",
    label: "Passport — all pages (IDP / international students)",
    shortLabel: "Passport (all pages)",
    required: false,
    guidelines: [
      "Scan or photograph every page, including blank ones.",
      "Combine into a single PDF if possible.",
      "Required only for IDP students or universities that ask for it.",
    ],
    acceptedFormats: "PDF preferred (or multi-page JPG/PNG)",
    maxSizeMB: 25,
  },
  {
    key: "ssc_certificate",
    label: "SSC / O-Level certificate",
    shortLabel: "SSC certificate",
    required: true,
    guidelines: [
      "Original board-issued certificate (front and back if both have content).",
      "Photocopies are acceptable only if attested by the relevant authority.",
      "Make sure the seal and signature are visible.",
    ],
    acceptedFormats: "PDF, JPG, or PNG",
    maxSizeMB: 10,
  },
  {
    key: "ssc_marksheet",
    label: "SSC / O-Level marksheet (transcript)",
    shortLabel: "SSC marksheet",
    required: true,
    guidelines: [
      "Full transcript showing all subjects and grades.",
      "Both pages if your marksheet is two-sided.",
      "Should be legible and complete.",
    ],
    acceptedFormats: "PDF, JPG, or PNG",
    maxSizeMB: 10,
  },
  {
    key: "hsc_certificate",
    label: "HSC / A-Level certificate",
    shortLabel: "HSC certificate",
    required: true,
    guidelines: [
      "Original certificate. If you haven't received it yet, upload the provisional certificate.",
      "Make sure the seal and signature are visible.",
    ],
    acceptedFormats: "PDF, JPG, or PNG",
    maxSizeMB: 10,
  },
  {
    key: "hsc_marksheet",
    label: "HSC / A-Level marksheet (transcript)",
    shortLabel: "HSC marksheet",
    required: true,
    guidelines: [
      "Full transcript showing every subject and your grade.",
      "Two-sided marksheets: please include both sides.",
    ],
    acceptedFormats: "PDF, JPG, or PNG",
    maxSizeMB: 10,
  },
  {
    key: "passport_photo",
    label: "Passport-sized photograph",
    shortLabel: "Passport photo",
    required: true,
    guidelines: [
      "Plain white or off-white background.",
      "Taken within the last 3 months.",
      "Face fully visible — no sunglasses, no hats unless religious.",
      "Both ears visible if your hairstyle allows.",
      "Recommended dimension: 35mm × 45mm at high resolution.",
      "Don't use selfies — get one taken at a studio or against a clean wall.",
    ],
    acceptedFormats: "JPG or PNG",
    maxSizeMB: 5,
  },
  {
    key: "english_proficiency",
    label: "English proficiency certificate",
    shortLabel: "English certificate",
    required: true,
    guidelines: [
      "Official test result: IELTS, TOEFL iBT, PTE Academic, Duolingo, or MUET.",
      "Must be valid (most universities accept results within 2 years).",
      "Minimum scores vary — typical: IELTS 6.0 / TOEFL 80 / PTE 50 / Duolingo 95.",
      "If you don't have one yet, contact us — some universities accept conditional offers.",
    ],
    acceptedFormats: "PDF preferred (or JPG/PNG)",
    maxSizeMB: 10,
  },
];

export function findDocument(key: string): DocumentGuideline | undefined {
  return REQUIRED_DOCUMENTS.find((d) => d.key === key);
}

/**
 * Drive subfolder name for a student's personal documents.
 * Pattern: "{first name} Documents" — matches the existing manual convention
 * (e.g. "Tahsin Documents" inside "Tahsin Saraf UTM").
 */
export function documentsSubfolderName(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "Student";
  return `${firstName} Documents`;
}
