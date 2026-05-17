/**
 * Comprehensive feature test — Bridge to Malaysia
 * Tests all DB queries (admin + public) and public API routes.
 * Run: node scripts/test-all.mjs
 */

const SUPABASE_URL = "https://xvdfgdyuwyrcgcmdieot.supabase.co";
const ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const SERVICE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY";
const LOCAL = "http://localhost:3001";

const results = [];

function pass(label, detail = "") { results.push({ status: "✅ PASS", label, detail }); }
function fail(label, detail = "") { results.push({ status: "❌ FAIL", label, detail }); }
function warn(label, detail = "") { results.push({ status: "⚠️  WARN", label, detail }); }

// ── helpers ──────────────────────────────────────────────────────────────────
async function supabaseGet(path, token = SERVICE_KEY) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
  });
  const d = await r.json();
  return { ok: r.ok, status: r.status, data: d };
}

async function supabaseRpc(fn, params = {}, token = ANON_KEY) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const d = await r.json();
  return { ok: r.ok, status: r.status, data: d };
}

async function httpGet(path) {
  try {
    const r = await fetch(`${LOCAL}${path}`, { redirect: "manual" });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

async function httpPost(path, body, contentType = "application/json") {
  try {
    const r = await fetch(`${LOCAL}${path}`, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text.slice(0, 200); }
    return { ok: r.ok, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🧪  Bridge to Malaysia — Full Feature Test\n");

  // ── Sign in to get access token ───────────────────────────────────────────
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: "saminsarwat@gmail.com", password: "12345678" }),
  });
  const auth = await authRes.json();
  const ACCESS = auth.access_token;
  if (!ACCESS) { fail("Auth login", "Could not get access token"); }
  else pass("Auth login", `user=${auth.user?.email}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Public pages (no auth needed)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n── Public pages ──");

  const home = await httpGet("/");
  home.status === 200 ? pass("GET /", "homepage") : warn("GET /", `HTTP ${home.status}`);

  const start = await httpGet("/start");
  start.status === 200 ? pass("GET /start", "intake form") : warn("GET /start", `HTTP ${start.status}`);

  const trackLanding = await httpGet("/track");
  trackLanding.status === 200 ? pass("GET /track", "passport lookup") : warn("GET /track", `HTTP ${trackLanding.status}`);

  const trackRafsan = await httpGet("/track/BQ1234567");
  trackRafsan.status === 200 ? pass("GET /track/BQ1234567", "Rafsan tracking page") : fail("GET /track/BQ1234567", `HTTP ${trackRafsan.status}`);

  const trackNadia = await httpGet("/track/CQ9876543");
  trackNadia.status === 200 ? pass("GET /track/CQ9876543", "Nadia tracking page") : fail("GET /track/CQ9876543", `HTTP ${trackNadia.status}`);

  const trackNotFound = await httpGet("/track/INVALID999");
  trackNotFound.status === 200 ? pass("GET /track/INVALID999", "gracefully shows not-found") : warn("GET /track/INVALID999", `HTTP ${trackNotFound.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Admin redirect (not logged in)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n── Admin auth guard ──");
  const adminNoAuth = await httpGet("/admin");
  adminNoAuth.status === 307 ? pass("GET /admin (no auth)", "correctly redirects to /login") : warn("GET /admin (no auth)", `HTTP ${adminNoAuth.status}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Admin DB queries (using authenticated access token)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n── Admin DB queries ──");

  // Overview page
  const students = await supabaseGet("students?select=id,full_name,current_stage", ACCESS);
  students.ok && students.data.length >= 3
    ? pass("Students query", `${students.data.length} students: ${students.data.map(s => s.full_name).join(", ")}`)
    : fail("Students query", JSON.stringify(students.data).slice(0, 200));

  // Finance page
  const accounts = await supabaseGet("company_accounts?select=*", ACCESS);
  accounts.ok && accounts.data.length === 2
    ? pass("Company accounts query", accounts.data.map(a => `${a.key}(${a.currency})`).join(", "))
    : fail("Company accounts query", JSON.stringify(accounts.data).slice(0, 200));

  const payments = await supabaseGet("payments?select=id,amount_received,currency,status,company_account_key,invoices(currency)", ACCESS);
  payments.ok
    ? pass("Payments query (with join)", `${payments.data.length} payments, statuses: ${[...new Set(payments.data.map(p => p.status))].join(", ")}`)
    : fail("Payments query", JSON.stringify(payments.data).slice(0, 200));

  const commissions = await supabaseGet("commissions?select=amount,currency,company_account_key,university", ACCESS);
  commissions.ok
    ? pass("Commissions query", `${commissions.data.length} commissions`)
    : fail("Commissions query", JSON.stringify(commissions.data).slice(0, 200));

  const refunds = await supabaseGet("refunds?select=id,amount,currency,company_account_key,status,students(full_name)", ACCESS);
  refunds.ok
    ? pass("Refunds query (with join)", `${refunds.data.length} refunds`)
    : fail("Refunds query", JSON.stringify(refunds.data).slice(0, 200));

  const invoices = await supabaseGet("invoices?select=id,invoice_number,status,currency,total_amount,students(full_name)", ACCESS);
  invoices.ok && invoices.data.length >= 4
    ? pass("Invoices query (with join)", `${invoices.data.length} invoices: ${invoices.data.map(i => i.invoice_number).join(", ")}`)
    : fail("Invoices query", JSON.stringify(invoices.data).slice(0, 200));

  // Analytics page
  const stage_history = await supabaseGet("stage_history?select=id,student_id,stage,changed_at", ACCESS);
  stage_history.ok
    ? pass("Stage history query", `${stage_history.data.length} entries`)
    : fail("Stage history query", JSON.stringify(stage_history.data).slice(0, 200));

  const docs = await supabaseGet("documents?select=id,doc_type,status", ACCESS);
  docs.ok
    ? pass("Documents query", `${docs.data.length} docs, statuses: ${[...new Set(docs.data.map(d => d.status))].join(", ")}`)
    : fail("Documents query", JSON.stringify(docs.data).slice(0, 200));

  // Referrals page
  const referrals = await supabaseGet("referrals?select=referrer_name,commission_amount,paid", ACCESS);
  referrals.ok
    ? pass("Referrals query", `${referrals.data.length} referrals`)
    : fail("Referrals query", JSON.stringify(referrals.data).slice(0, 200));

  // Contracts
  const contracts = await supabaseGet("contracts?select=contract_number,signed,signed_at", ACCESS);
  contracts.ok
    ? pass("Contracts query", `${contracts.data.length} contracts: ${contracts.data.map(c => `${c.contract_number}(signed=${c.signed})`).join(", ")}`)
    : fail("Contracts query", JSON.stringify(contracts.data).slice(0, 200));

  // Company accounts update (finance form action)
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/company_accounts?key=eq.bangladesh_bdt`, {
    method: "PATCH",
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${ACCESS}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ opening_balance: 0, notes: "Seeded" }),
  });
  updateRes.ok
    ? pass("Finance: update company_account", "PATCH company_accounts — no more updated_at crash")
    : fail("Finance: update company_account", `HTTP ${updateRes.status}: ${(await updateRes.text()).slice(0, 200)}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4: Public RPC functions
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n── Public RPC functions ──");

  const tracking = await supabaseRpc("get_tracking_by_passport", { p_passport: "BQ1234567" });
  if (tracking.ok && tracking.data?.student?.full_name === "Rafsan Ahmed") {
    const inv = tracking.data.invoices;
    const ctrs = tracking.data.contracts;
    pass("get_tracking_by_passport (Rafsan)", `stage=${tracking.data.student.current_stage}, invoices=${inv.length}, contracts=${ctrs.length}, total_paid=${inv.map(i=>i.total_paid).join("+")}`);
  } else fail("get_tracking_by_passport", JSON.stringify(tracking.data).slice(0, 300));

  const trackingNadia = await supabaseRpc("get_tracking_by_passport", { p_passport: "CQ9876543" });
  trackingNadia.ok && trackingNadia.data?.student
    ? pass("get_tracking_by_passport (Nadia)", `stage=${trackingNadia.data.student.current_stage}`)
    : fail("get_tracking_by_passport (Nadia)", JSON.stringify(trackingNadia.data).slice(0, 200));

  const trackingMissing = await supabaseRpc("get_tracking_by_passport", { p_passport: "INVALID" });
  trackingMissing.data === null || (typeof trackingMissing.data === "object" && !trackingMissing.data?.student)
    ? pass("get_tracking_by_passport (invalid)", "returns null/empty correctly")
    : warn("get_tracking_by_passport (invalid)", JSON.stringify(trackingMissing.data).slice(0, 100));

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5: Public API routes
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n── Public API routes ──");

  // Sign contract — bad data (should 404)
  const signBad = await httpPost("/api/public/sign-contract", { passport: "INVALID", contract_id: "00000000-0000-0000-0000-000000000000" });
  signBad.status === 404 || signBad.status === 400
    ? pass("POST /api/public/sign-contract (invalid)", `correctly returns ${signBad.status}`)
    : warn("POST /api/public/sign-contract (invalid)", `HTTP ${signBad.status}: ${JSON.stringify(signBad.data).slice(0, 100)}`);

  // Get Arif's unsigned contract
  const arifContracts = await supabaseGet("contracts?student_id=eq.eb6ba7f4-5040-4f6a-876e-58f82d4344a7&select=id,signed", SERVICE_KEY);
  if (arifContracts.ok && arifContracts.data.length > 0) {
    const contractId = arifContracts.data[0].id;
    const signGood = await httpPost("/api/public/sign-contract", { passport: "DX5551234", contract_id: contractId });
    signGood.ok
      ? pass("POST /api/public/sign-contract (valid)", `Arif signed contract ${contractId}`)
      : fail("POST /api/public/sign-contract (valid)", `HTTP ${signGood.status}: ${JSON.stringify(signGood.data).slice(0, 200)}`);
  }

  // Intake submission (should work without Turnstile in dev with empty key)
  const intake = await httpPost("/api/public/intake", {
    full_name: "Test Student",
    passport_no: "ZZ9999999",
    email: "test@example.com",
    phone: "+8801999000000",
    university: "UTM",
    intake: "September 2025",
    "cf-turnstile-response": "test",
  });
  intake.status === 200 || intake.status === 201
    ? pass("POST /api/public/intake", "intake submission accepted")
    : warn("POST /api/public/intake", `HTTP ${intake.status}: ${JSON.stringify(intake.data).slice(0, 200)} (Turnstile/rate-limit may block)`);

  // Invoice PDF (requires drive link — may 404 if no PDF uploaded yet)
  const rafsanInvId = invoices.data?.find(i => i.invoice_number === "BTM-2025-0001")?.id;
  if (rafsanInvId) {
    const pdf = await httpGet(`/api/public/invoice-pdf?passport=BQ1234567&invoice_id=${rafsanInvId}`);
    pdf.status === 200
      ? pass("GET /api/public/invoice-pdf", "PDF served")
      : warn("GET /api/public/invoice-pdf", `HTTP ${pdf.status} (expected if no Drive PDF yet)`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  const passed = results.filter(r => r.status.startsWith("✅")).length;
  const failed = results.filter(r => r.status.startsWith("❌")).length;
  const warned = results.filter(r => r.status.startsWith("⚠")).length;

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("RESULT SUMMARY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const r of results) {
    console.log(`${r.status}  ${r.label}`);
    if (r.detail) console.log(`          ${r.detail}`);
  }
  console.log(`\n  PASS: ${passed}   FAIL: ${failed}   WARN: ${warned}`);

  if (failed > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
