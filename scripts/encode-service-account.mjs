/**
 * Generates the GOOGLE_SERVICE_ACCOUNT_JSON_B64 env var value.
 *
 * Usage (two options):
 *
 *   Option A — from the JSON key file:
 *     node scripts/encode-service-account.mjs path/to/service-account-key.json
 *
 *   Option B — from the existing .env.local email + key vars:
 *     node scripts/encode-service-account.mjs
 *
 * Copy the output string and paste it into Vercel as GOOGLE_SERVICE_ACCOUNT_JSON_B64.
 * You can then delete GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY from Vercel.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const arg = process.argv[2];

let b64;

if (arg) {
  // Option A: encode the whole JSON file directly
  const raw = readFileSync(resolve(arg), "utf8");
  JSON.parse(raw); // validate it's valid JSON first
  b64 = Buffer.from(raw).toString("base64");
  console.log("\n✅  Encoded from file:", arg);
} else {
  // Option B: reconstruct from .env.local
  const envPath = resolve(process.cwd(), ".env.local");
  const envLines = readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of envLines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }

  const email = env["GOOGLE_SERVICE_ACCOUNT_EMAIL"];
  const rawKey = env["GOOGLE_SERVICE_ACCOUNT_KEY"];

  if (!email || !rawKey) {
    console.error("❌  GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_SERVICE_ACCOUNT_KEY not found in .env.local");
    console.error("   Pass the path to your service account JSON file instead:");
    console.error("   node scripts/encode-service-account.mjs path/to/key.json");
    process.exit(1);
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  const json = JSON.stringify({
    type: "service_account",
    client_email: email,
    private_key: privateKey,
  });

  b64 = Buffer.from(json).toString("base64");
  console.log("\n✅  Encoded from .env.local");
}

console.log("\n─────────────────────────────────────────────────────────");
console.log("Add this to Vercel → Project → Settings → Environment Variables:");
console.log("─────────────────────────────────────────────────────────");
console.log("\nName:  GOOGLE_SERVICE_ACCOUNT_JSON_B64");
console.log("Value: (the long string below — copy the whole thing)\n");
console.log(b64);
console.log("\n─────────────────────────────────────────────────────────");
console.log("You can delete GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY from Vercel after adding this.");
console.log("Keep GOOGLE_DRIVE_PARENT_FOLDER_ID as-is.\n");
