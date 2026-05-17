/**
 * Drive connectivity diagnostic.
 * Run: node scripts/test-drive.mjs
 *
 * Checks:
 *   1. Env vars are present
 *   2. Service account JWT auth works
 *   3. Parent folder is readable
 *   4. Can create + delete a test subfolder
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf8").split("\n");
for (const line of envLines) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
}

const { google } = await import("googleapis");

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID;

console.log("\n── Bridge to Malaysia: Drive Diagnostic ──\n");

// 1. Check env vars
const missing = [];
if (!email) missing.push("GOOGLE_SERVICE_ACCOUNT_EMAIL");
if (!rawKey) missing.push("GOOGLE_SERVICE_ACCOUNT_KEY");
if (!parentId) missing.push("GOOGLE_DRIVE_PARENT_FOLDER_ID");

if (missing.length) {
  console.error("❌  Missing env vars:", missing.join(", "));
  console.error("   Make sure these are set in .env.local AND in Vercel → Settings → Environment Variables");
  process.exit(1);
}
console.log("✅  Env vars present");
console.log(`   Email:     ${email}`);
console.log(`   Parent ID: ${parentId}`);
console.log(`   Key:       ${rawKey.slice(0, 40)}...`);

// 2. Build Drive client
const privateKey = rawKey.replace(/\\n/g, "\n");
const auth = new google.auth.JWT({
  email,
  key: privateKey,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

let drive;
try {
  await auth.authorize();
  drive = google.drive({ version: "v3", auth });
  console.log("\n✅  Service account JWT auth OK");
} catch (e) {
  console.error("\n❌  Auth failed:", e.message);
  console.error("   Check that GOOGLE_SERVICE_ACCOUNT_KEY is the correct private key.");
  console.error("   In Vercel, paste the key with literal \\n (not real newlines).");
  process.exit(1);
}

// 3. Check parent folder access
try {
  const res = await drive.files.get({
    fileId: parentId,
    fields: "id, name, mimeType",
    supportsAllDrives: true,
  });
  const f = res.data;
  if (f.mimeType !== "application/vnd.google-apps.folder") {
    console.error(`\n❌  ${parentId} is not a folder (mimeType=${f.mimeType})`);
    process.exit(1);
  }
  console.log(`\n✅  Parent folder accessible: "${f.name}" (${f.id})`);
} catch (e) {
  console.error("\n❌  Cannot access parent folder:", e.message);
  console.error(`   Folder ID: ${parentId}`);
  console.error("   Fix: In Google Drive, right-click the 'STUDENT DETAILS SAAS' folder →");
  console.error(`   Share → add ${email} with Editor access.`);
  process.exit(1);
}

// 4. Test create + delete subfolder
const testName = `_BTM_TEST_${Date.now()}`;
let testId;
try {
  const created = await drive.files.create({
    requestBody: {
      name: testName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });
  testId = created.data.id;
  console.log(`\n✅  Test folder created: "${testName}" (${testId})`);
} catch (e) {
  console.error("\n❌  Cannot create subfolders:", e.message);
  console.error("   Service account has read-only access. Grant EDITOR access.");
  process.exit(1);
}

// Clean up test folder
try {
  await drive.files.delete({ fileId: testId, supportsAllDrives: true });
  console.log("✅  Test folder cleaned up");
} catch {
  console.log(`⚠️   Could not delete test folder ${testId} — clean it manually from Drive.`);
}

console.log("\n🎉  All checks passed — Drive is correctly configured!\n");
console.log("If uploads still fail on Vercel, make sure these same env vars are set");
console.log("in Vercel → Project → Settings → Environment Variables (all environments).\n");
