import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const MONEY_CURRENCIES = ["BDT", "MYR"] as const;

export const COMPANY_ACCOUNTS = [
  {
    key: "bangladesh_bdt",
    label: "Bangladesh Account",
    country: "Bangladesh",
    currency: "BDT",
  },
  {
    key: "malaysia_myr",
    label: "Malaysia Account",
    country: "Malaysia",
    currency: "MYR",
  },
] as const;

export function defaultAccountForCurrency(currency: string | null | undefined) {
  return currency === "MYR" ? "malaysia_myr" : "bangladesh_bdt";
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = "BDT",
  options: Intl.NumberFormatOptions = {}
) {
  const value = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Slug an identifier for filenames: "Samin Sarwat" -> "samin_sarwat" */
export function slugForFilename(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Build invoice PDF filename: "samin_securitydeposit.pdf" */
export function buildInvoiceFilename(studentName: string, invoiceType: string) {
  return `${slugForFilename(studentName)}_${slugForFilename(invoiceType)}.pdf`;
}

/** Build contract PDF filename: "samin_contract.pdf" or "samin_contract_SIGNED.pdf" */
export function buildContractFilename(studentName: string, signed = false) {
  return `${slugForFilename(studentName)}_contract${signed ? "_SIGNED" : ""}.pdf`;
}

/** Extract Google Drive folder ID from a sharing URL */
export function extractDriveFolderId(url: string | null | undefined): string | null {
  if (!url) return null;
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /^([a-zA-Z0-9_-]{20,})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

/** Stage definitions in order */
export const STAGES = [
  { value: "initial_consultation", label: "Initial Consultation", short: "Consultation" },
  { value: "university_application", label: "University Application", short: "Application" },
  { value: "offer_letter_received", label: "Offer Letter Received", short: "Offer Letter" },
  { value: "emgs_processing", label: "EMGS Processing", short: "EMGS" },
  { value: "visa_application", label: "Visa Application", short: "Visa" },
  { value: "tuition_fee_payment", label: "Tuition Fee Payment", short: "Tuition" },
  { value: "flight_booking", label: "Flight Booking", short: "Flight" },
  { value: "airport_pickup", label: "Airport Pickup", short: "Pickup" },
  { value: "medical_check", label: "Medical Check", short: "Medical" },
  { value: "university_registration", label: "University Registration", short: "Registration" },
] as const;

export type StageValue = (typeof STAGES)[number]["value"];

export function stageIndex(stage: string) {
  return STAGES.findIndex((s) => s.value === stage);
}

export function stageLabel(stage: string) {
  return STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export const INVOICE_TYPES = [
  "Security Deposit",
  "EMGS Processing Fee",
  "E-Visa Fee",
  "Tuition Fee",
  "Medical Check Fee",
  "Other",
] as const;

export const DOCUMENT_TYPES = [
  "Passport Information Page",
  "Passport (All Pages)",
  "SSC / O Level Certificate",
  "SSC / O Level Marksheet",
  "HSC / A Level Certificate",
  "HSC / A Level Marksheet",
  "Passport-Sized Photograph",
  "English Proficiency Certificate",
] as const;

export const ATTACHMENT_KINDS = [
  { value: "offer_letter", label: "Offer Letter" },
  { value: "evisa", label: "E-Visa" },
  { value: "emgs_approval", label: "EMGS Approval" },
  { value: "tuition_receipt", label: "Tuition Receipt" },
  { value: "visa", label: "Visa" },
  { value: "medical", label: "Medical Report" },
  { value: "flight_ticket", label: "Flight Ticket" },
  { value: "other", label: "Other" },
] as const;
