/**
 * One-time Google OAuth setup — generates a refresh token so the server
 * can upload files to YOUR personal Google Drive (no Workspace needed).
 *
 * Run:  node scripts/get-google-oauth-token.mjs
 *
 * Prerequisites (5 min, one-time):
 *  1. Go to https://console.cloud.google.com
 *  2. Select (or create) the same project where your service account lives
 *  3. APIs & Services → OAuth consent screen
 *       • User Type: External  → Create
 *       • App name: Bridge to Malaysia  |  Support email: your Gmail
 *       • Skip the rest, click Save → Back to dashboard
 *       • Under "Test users" add your own Gmail address
 *  4. APIs & Services → Credentials → + Create Credentials → OAuth client ID
 *       • Application type: Desktop app
 *       • Name: BTM Server
 *       • Click Create → copy the Client ID and Client Secret
 *  5. Run this script and paste them in when prompted
 */

import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const rl = readline.createInterface({ input, output });

console.log("\n── Bridge to Malaysia: Google OAuth Token Generator ──\n");
console.log("Follow the steps in the file header if you haven't yet.\n");

const clientId = (await rl.question("Paste your OAuth Client ID:    ")).trim();
const clientSecret = (await rl.question("Paste your OAuth Client Secret: ")).trim();

if (!clientId || !clientSecret) {
  console.error("\n❌  Client ID and Secret are required.");
  process.exit(1);
}

const { google } = await import("googleapis");

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  "urn:ietf:wg:oauth:2.0:oob" // Desktop / OOB flow — no localhost server needed
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // forces refresh_token to be returned every time
  scope: ["https://www.googleapis.com/auth/drive"],
});

console.log("\n─────────────────────────────────────────────────────────");
console.log("Open this URL in your browser and approve access:");
console.log("─────────────────────────────────────────────────────────\n");
console.log(authUrl);
console.log("\n─────────────────────────────────────────────────────────");
console.log("After approving, Google shows a code. Paste it below.\n");

const code = (await rl.question("Paste the authorization code: ")).trim();

if (!code) {
  console.error("\n❌  No code provided.");
  rl.close();
  process.exit(1);
}

let tokens;
try {
  const resp = await oauth2Client.getToken(code);
  tokens = resp.tokens;
} catch (e) {
  console.error("\n❌  Token exchange failed:", e.message);
  console.error("   Make sure you pasted the code correctly and it hasn't expired (60 s).");
  rl.close();
  process.exit(1);
}

rl.close();

if (!tokens.refresh_token) {
  console.error("\n⚠️   No refresh_token returned.");
  console.error("   This can happen if you previously approved access without 'prompt:consent'.");
  console.error("   Go to https://myaccount.google.com/permissions, revoke 'BTM Server', then run again.");
  process.exit(1);
}

console.log("\n✅  Success! Add these 3 env vars to Vercel → Settings → Environment Variables:\n");
console.log("─────────────────────────────────────────────────────────");
console.log(`GOOGLE_OAUTH_CLIENT_ID      = ${clientId}`);
console.log(`GOOGLE_OAUTH_CLIENT_SECRET  = ${clientSecret}`);
console.log(`GOOGLE_OAUTH_REFRESH_TOKEN  = ${tokens.refresh_token}`);
console.log("─────────────────────────────────────────────────────────");
console.log("\nKeep GOOGLE_DRIVE_PARENT_FOLDER_ID as-is.");
console.log("You can remove GOOGLE_SERVICE_ACCOUNT_EMAIL / KEY from Vercel once this works.\n");
