/**
 * Master agencies that Bridge to Malaysia forwards student applications to.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *   ✏️  FILL ME IN
 * ─────────────────────────────────────────────────────────────────────────
 * For each agency:
 *   1. Set the real `email` (and `cc` if needed)
 *   2. Add the universities they handle to `universities` (use the short code,
 *      see src/lib/universities.ts — e.g. "UTM", "UM", "UKM", ...)
 *
 * To add a new agency, copy the AIMS block, change the `key` (must be unique),
 * and fill the rest. No other code changes needed.
 *
 * Universities not mapped here will be flagged in the admin UI when you try
 * to forward a referral, so you'll always know what's missing.
 */

import { MALAYSIAN_UNIVERSITIES } from "@/lib/universities";

export interface Agency {
  key: string;
  /** Display name, e.g. "AIMS Education" */
  name: string;
  /** Primary recipient address — REQUIRED to actually send */
  email: string;
  /** Optional CC list (your team, the country head, etc.) */
  cc?: string[];
  /** Greeting line, e.g. "Assalamualaikum AIMS Education Team," */
  greeting?: string;
  /** Short codes (UTM, UM, …) of universities this agency handles */
  universities: string[];
}

export const AGENCIES: Agency[] = [
  {
    key: "aims",
    name: "AIMS Education",
    // TODO: replace with the real AIMS contact address
    email: "",
    greeting: "Assalamualaikum AIMS Education Team,",
    universities: ["UTM"],
  },
  // Add more agencies here, e.g.:
  // {
  //   key: "globalreach",
  //   name: "Global Reach",
  //   email: "info@globalreach.example",
  //   greeting: "Dear Global Reach Team,",
  //   universities: ["UM", "UKM"],
  // },
];

/** Look up an agency by its key. */
export function findAgencyByKey(key: string): Agency | null {
  return AGENCIES.find((a) => a.key === key) ?? null;
}

/**
 * Find the agency that handles a given university (by full name).
 * Returns null if no agency is mapped — callers should treat this as
 * "no automated forward configured for this university yet".
 */
export function agencyForUniversity(universityName: string | null | undefined): Agency | null {
  if (!universityName) return null;
  const uni = MALAYSIAN_UNIVERSITIES.find(
    (u) => u.name.toLowerCase() === universityName.toLowerCase()
  );
  if (!uni) return null;
  return AGENCIES.find((a) => a.universities.includes(uni.short)) ?? null;
}

/** True if the agency record looks complete enough to actually email. */
export function agencyIsSendable(agency: Agency | null): boolean {
  if (!agency) return false;
  return /\S+@\S+\.\S+/.test(agency.email);
}
