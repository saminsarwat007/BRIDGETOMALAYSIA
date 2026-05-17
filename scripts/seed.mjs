/**
 * Seed script — populates Bridge to Malaysia Supabase DB with realistic test data.
 * Run: node scripts/seed.mjs
 */

const SUPABASE_URL = "https://xvdfgdyuwyrcgcmdieot.supabase.co";
const SERVICE_ROLE_KEY =
  "YOUR_SUPABASE_SERVICE_ROLE_KEY";

const headers = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function rpc(fn, params = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) console.error(`RPC ${fn} error:`, data);
  return data;
}

async function insert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation,resolution=ignore-duplicates" },
    body: JSON.stringify(rows),
  });
  const data = await res.json();
  if (!res.ok) { console.error(`INSERT ${table} error:`, JSON.stringify(data)); return []; }
  return Array.isArray(data) ? data : [data];
}

async function query(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
  return res.json();
}

async function deleteRows(table, filter) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) console.error(`DELETE ${table} error:`, await res.text());
}

// ─── helpers ────────────────────────────────────────────────────────────────
let counter = 1;
function nextNum() { return String(counter++).padStart(4, "0"); }

async function main() {
  console.log("🌱  Seeding Bridge to Malaysia …\n");

  // ── 0. Reset existing seed data (by email marker) ────────────────────────
  console.log("Clearing previous seed data…");
  const existing = await query("students", "email=like.*test.btm@*");
  for (const s of existing) {
    await deleteRows("stage_history", `student_id=eq.${s.id}`);
    await deleteRows("documents", `student_id=eq.${s.id}`);
    const invs = await query("invoices", `student_id=eq.${s.id}`);
    for (const inv of invs) {
      await deleteRows("payments", `invoice_id=eq.${inv.id}`);
    }
    await deleteRows("invoices", `student_id=eq.${s.id}`);
    await deleteRows("contracts", `student_id=eq.${s.id}`);
    await deleteRows("refunds", `student_id=eq.${s.id}`);
    await deleteRows("referrals", `student_id=eq.${s.id}`);
    await deleteRows("students", `id=eq.${s.id}`);
  }
  await deleteRows("commissions", "university=like.*UTM Test*");

  // ── 1. Students ──────────────────────────────────────────────────────────
  console.log("Creating students…");
  const [rafsan] = await insert("students", [{
    full_name: "Rafsan Ahmed",
    passport_no: "BQ1234567",
    email: "rafsan.test.btm@gmail.com",
    phone: "+8801711000001",
    address: "12 Mirpur Road, Dhaka",
    university: "UTM",
    campus: "Kuala Lumpur",
    intake: "September 2025",
    subject_1: "Computer Science",
    subject_2: "Mathematics",
    current_stage: "tuition_fee_payment",
    contract_required: true,
    upload_enabled: true,
    referred_by_name: "Karim Uddin",
    referred_by_phone: "+8801800111222",
    whatsapp_group_url: "https://chat.whatsapp.com/testgroup123",
    notes: "Seed student 1 — full journey to tuition payment stage",
  }]);

  const [nadia] = await insert("students", [{
    full_name: "Nadia Islam",
    passport_no: "CQ9876543",
    email: "nadia.test.btm@gmail.com",
    phone: "+8801722000002",
    address: "55 Gulshan Avenue, Dhaka",
    university: "UPM",
    campus: "Serdang",
    intake: "February 2026",
    subject_1: "Business Administration",
    current_stage: "offer_letter_received",
    contract_required: false,
    upload_enabled: true,
    notes: "Seed student 2 — mid-journey, offer letter received",
  }]);

  const [arif] = await insert("students", [{
    full_name: "Arif Hossain",
    passport_no: "DX5551234",
    email: "arif.test.btm@gmail.com",
    phone: "+8801733000003",
    address: "7 Dhanmondi, Dhaka",
    university: "UTAR",
    campus: "Kampar",
    intake: "September 2025",
    subject_1: "Civil Engineering",
    current_stage: "emgs_processing",
    contract_required: true,
    upload_enabled: false,
    notes: "Seed student 3 — EMGS stage",
  }]);

  console.log(`  ✓ Students: ${rafsan?.id}, ${nadia?.id}, ${arif?.id}`);

  // ── 2. Stage history ─────────────────────────────────────────────────────
  console.log("Creating stage history…");
  const now = new Date();
  const daysAgo = (n) => new Date(now - n * 86400000).toISOString();

  await insert("stage_history", [
    { student_id: rafsan.id, stage: "initial_consultation", comment: "Student enquired about UTM Computer Science. Sent brochure.", changed_at: daysAgo(60) },
    { student_id: rafsan.id, stage: "university_application", comment: "Application submitted to UTM KL.", changed_at: daysAgo(45) },
    { student_id: rafsan.id, stage: "offer_letter_received", comment: "Conditional offer received. Awaiting security deposit.", changed_at: daysAgo(30) },
    { student_id: rafsan.id, stage: "emgs_processing", comment: "EMGS application submitted. Processing 4-6 weeks.", changed_at: daysAgo(20) },
    { student_id: rafsan.id, stage: "visa_application", comment: "eVisa application submitted to High Commission.", changed_at: daysAgo(10) },
    { student_id: rafsan.id, stage: "tuition_fee_payment", comment: "Visa approved. Ready to pay tuition fee.", changed_at: daysAgo(2) },
    { student_id: nadia.id, stage: "initial_consultation", comment: "Interested in Business Admin at UPM.", changed_at: daysAgo(40) },
    { student_id: nadia.id, stage: "university_application", comment: "Application sent to UPM Serdang.", changed_at: daysAgo(25) },
    { student_id: nadia.id, stage: "offer_letter_received", comment: "Offer letter arrived. Awaiting student confirmation.", changed_at: daysAgo(5) },
    { student_id: arif.id, stage: "initial_consultation", comment: "Civil Engineering inquiry — UTAR Kampar.", changed_at: daysAgo(35) },
    { student_id: arif.id, stage: "university_application", comment: "Application submitted.", changed_at: daysAgo(20) },
    { student_id: arif.id, stage: "offer_letter_received", comment: "Offer received.", changed_at: daysAgo(12) },
    { student_id: arif.id, stage: "emgs_processing", comment: "EMGS submitted.", changed_at: daysAgo(5) },
  ]);
  console.log("  ✓ Stage history inserted");

  // ── 3. Documents ─────────────────────────────────────────────────────────
  console.log("Creating documents…");
  const docRow = (student_id, doc_type, status, rejection_reason = null, drive_link = null) =>
    ({ student_id, doc_type, status, rejection_reason, drive_link });
  await insert("documents", [
    docRow(rafsan.id, "passport_copy", "received"),
    docRow(rafsan.id, "ssc_certificate", "received"),
    docRow(rafsan.id, "hsc_certificate", "received"),
    docRow(rafsan.id, "photo_4x4", "received"),
    docRow(rafsan.id, "offer_letter", "received"),
    docRow(rafsan.id, "bank_statement", "rejected", "Bank statement is older than 3 months. Please upload a recent one."),
    docRow(nadia.id, "passport_copy", "received"),
    docRow(nadia.id, "ssc_certificate", "pending"),
    docRow(nadia.id, "photo_4x4", "pending"),
    docRow(arif.id, "passport_copy", "received"),
    docRow(arif.id, "ssc_certificate", "received"),
  ]);
  console.log("  ✓ Documents inserted");

  // ── 4. Invoices ──────────────────────────────────────────────────────────
  console.log("Creating invoices…");

  // Get next numbers via RPC
  const rafsan_inv_num = `BTM-2025-${nextNum()}`;
  const rafsan_inv2_num = `BTM-2025-${nextNum()}`;
  const nadia_inv_num = `BTM-2025-${nextNum()}`;
  const arif_inv_num = `BTM-2025-${nextNum()}`;

  const [rafsanInv1] = await insert("invoices", [{
    student_id: rafsan.id,
    invoice_number: rafsan_inv_num,
    invoice_type: "security_deposit",
    line_items: [{ description: "Security Deposit — UTM KL", amount: 25000, quantity: 1 }],
    total_amount: 25000,
    currency: "BDT",
    status: "paid",
    due_date: daysAgo(25).split("T")[0],
    pdf_filename: "rafsan_ahmed_securitydeposit.pdf",
    field_values: { student_name: "Rafsan Ahmed", university: "UTM", intake: "September 2025" },
  }]);

  const [rafsanInv2] = await insert("invoices", [{
    student_id: rafsan.id,
    invoice_number: rafsan_inv2_num,
    invoice_type: "tuition_fee",
    line_items: [
      { description: "First Semester Tuition Fee — UTM KL Computer Science", amount: 45000, quantity: 1 },
      { description: "Registration Fee", amount: 3000, quantity: 1 },
    ],
    total_amount: 48000,
    currency: "BDT",
    status: "partially_paid",
    due_date: daysAgo(-10).split("T")[0],
    pdf_filename: "rafsan_ahmed_tuitionfee.pdf",
    field_values: { student_name: "Rafsan Ahmed", university: "UTM", intake: "September 2025" },
  }]);

  const [nadiaInv] = await insert("invoices", [{
    student_id: nadia.id,
    invoice_number: nadia_inv_num,
    invoice_type: "service_fee",
    line_items: [{ description: "Consultancy Service Fee", amount: 850, quantity: 1 }],
    total_amount: 850,
    currency: "MYR",
    status: "sent",
    due_date: daysAgo(-15).split("T")[0],
    pdf_filename: "nadia_islam_servicefee.pdf",
    field_values: { student_name: "Nadia Islam", university: "UPM" },
  }]);

  const [arifInv] = await insert("invoices", [{
    student_id: arif.id,
    invoice_number: arif_inv_num,
    invoice_type: "emgs_fee",
    line_items: [{ description: "EMGS Processing Fee", amount: 18000, quantity: 1 }],
    total_amount: 18000,
    currency: "BDT",
    status: "sent",
    due_date: daysAgo(-5).split("T")[0],
    pdf_filename: "arif_hossain_emgsfee.pdf",
    field_values: { student_name: "Arif Hossain", university: "UTAR" },
  }]);

  console.log(`  ✓ Invoices: ${rafsanInv1?.id}, ${rafsanInv2?.id}, ${nadiaInv?.id}, ${arifInv?.id}`);

  // ── 5. Payments ──────────────────────────────────────────────────────────
  console.log("Creating payments…");
  const pmtRow = (invoice_id, student_id, amount, currency, account_key, date, method, ref, source, status, notes) => ({
    invoice_id, student_id, amount_received: amount, currency,
    company_account_key: account_key, payment_date: date,
    payment_method: method, bank_reference: ref ?? null,
    source, status, notes: notes ?? null,
    description: null, receipt_drive_file_id: null, receipt_drive_link: null,
    recorded_by: null,
  });
  await insert("payments", [
    pmtRow(rafsanInv1.id, rafsan.id, 25000, "BDT", "bangladesh_bdt", daysAgo(28).split("T")[0], "bank_transfer", "TXN-BD-20250490", "student", "approved", "Security deposit — full payment"),
    pmtRow(rafsanInv2.id, rafsan.id, 20000, "BDT", "bangladesh_bdt", daysAgo(3).split("T")[0], "bank_transfer", "TXN-BD-20250512", "student", "approved", "Partial tuition fee — first instalment"),
    pmtRow(rafsanInv2.id, rafsan.id, 10000, "BDT", "bangladesh_bdt", daysAgo(0).split("T")[0], "bank_transfer", null, "student", "pending", "Receipt uploaded — awaiting admin approval"),
  ]);
  console.log("  ✓ Payments inserted");

  // ── 6. Contracts ─────────────────────────────────────────────────────────
  console.log("Creating contracts…");
  const [rafsanContract] = await insert("contracts", [{
    student_id: rafsan.id,
    contract_number: `BTM-CTR-2025-0001`,
    field_values: {
      student_name: "Rafsan Ahmed",
      passport_no: "BQ1234567",
      university: "UTM",
      intake: "September 2025",
      program: "Bachelor of Computer Science",
      service_fee: "BDT 25,000",
    },
    signed: true,
    signed_at: daysAgo(25),
    signed_ip: "103.152.10.45",
    notes: "Signed digitally by student",
  }]);

  const [arifContract] = await insert("contracts", [{
    student_id: arif.id,
    contract_number: `BTM-CTR-2025-0002`,
    field_values: {
      student_name: "Arif Hossain",
      passport_no: "DX5551234",
      university: "UTAR",
      intake: "September 2025",
      program: "Bachelor of Civil Engineering",
    },
    signed: false,
    notes: "Pending student signature",
  }]);

  console.log(`  ✓ Contracts: ${rafsanContract?.id} (signed), ${arifContract?.id} (unsigned)`);

  // ── 7. Referrals ─────────────────────────────────────────────────────────
  console.log("Creating referrals…");
  await insert("referrals", [
    {
      student_id: rafsan.id,
      referrer_name: "Karim Uddin",
      referrer_phone: "+8801800111222",
      commission_amount: 2000,
      commission_currency: "BDT",
      paid: true,
      paid_on: daysAgo(20).split("T")[0],
      notes: "Referral commission paid",
    },
  ]);
  console.log("  ✓ Referrals inserted");

  // ── 8. Commissions ───────────────────────────────────────────────────────
  console.log("Creating commissions…");
  await insert("commissions", [
    {
      student_id: rafsan.id,
      university: "UTM Test Campus",
      amount: 500,
      currency: "MYR",
      company_account_key: "malaysia_myr",
      received_date: daysAgo(5).split("T")[0],
      notes: "UTM Test referral commission for Sept 2025 intake",
    },
    {
      student_id: null,
      university: "UTM Test KL — Batch Jan 2025",
      amount: 1200,
      currency: "MYR",
      company_account_key: "malaysia_myr",
      received_date: daysAgo(90).split("T")[0],
      notes: "Batch commission from UTM for previous intake",
    },
  ]);
  console.log("  ✓ Commissions inserted");

  // ── 9. Refunds ───────────────────────────────────────────────────────────
  console.log("Creating refunds…");
  await insert("refunds", [
    {
      student_id: rafsan.id,
      invoice_id: rafsanInv1.id,
      amount: 2000,
      currency: "BDT",
      company_account_key: "bangladesh_bdt",
      status: "pending",
      reason: "Overpayment adjustment — partial refund requested",
    },
  ]);
  console.log("  ✓ Refunds inserted");

  // ── 10. Summary ──────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅  Seed complete!\n");
  console.log("Test passports for /track:");
  console.log("  Rafsan Ahmed  → BQ1234567  (stage: tuition_fee_payment, signed contract)");
  console.log("  Nadia Islam   → CQ9876543  (stage: offer_letter_received, pending docs)");
  console.log("  Arif Hossain  → DX5551234  (stage: emgs_processing, unsigned contract)");
  console.log("\nFinance populated:");
  console.log("  BDT collected: 45,000 (approved) + 10,000 pending");
  console.log("  MYR commission: 1,700");
  console.log("  Pending refund: 2,000 BDT");
}

main().catch(console.error);
