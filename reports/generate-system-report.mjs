import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToFile } from "@react-pdf/renderer";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "bridge-to-malaysia-system-report.pdf");

const C = {
  ink: "#1F1410",
  bridge: "#8B5A2B",
  gold: "#C8932B",
  cream: "#F5EFE4",
  paper: "#FBF7EF",
  muted: "#8C7B6A",
  stone: "#D9CDB8",
  green: "#2F7D46",
  red: "#B23A48",
};

const s = StyleSheet.create({
  page: {
    padding: 38,
    backgroundColor: C.paper,
    color: C.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
  },
  cover: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  coverKicker: {
    color: C.bridge,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 14,
    fontFamily: "Helvetica-Bold",
  },
  coverTitle: {
    fontSize: 34,
    lineHeight: 1.05,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 18,
  },
  coverSubtitle: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 1.5,
    width: "82%",
  },
  metaBox: {
    marginTop: 34,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: C.gold,
    backgroundColor: "#FFFFFF",
  },
  metaText: {
    fontSize: 10,
    color: C.ink,
    marginBottom: 4,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: C.stone,
    paddingBottom: 8,
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerBrand: {
    color: C.bridge,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerMeta: {
    color: C.muted,
    fontSize: 9,
  },
  h1: {
    fontSize: 21,
    lineHeight: 1.15,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 10,
  },
  h2: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.bridge,
    marginTop: 14,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 10,
    marginBottom: 4,
  },
  p: {
    fontSize: 10,
    color: C.ink,
    marginBottom: 7,
  },
  muted: {
    color: C.muted,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingRight: 4,
  },
  bulletDot: {
    width: 12,
    color: C.gold,
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: C.ink,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: C.stone,
    padding: 12,
    marginVertical: 8,
  },
  cardTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.bridge,
    marginBottom: 5,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  col: {
    flex: 1,
  },
  flowStep: {
    flexDirection: "row",
    marginBottom: 6,
    alignItems: "flex-start",
  },
  stepNo: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.bridge,
    color: "#FFFFFF",
    fontSize: 9,
    textAlign: "center",
    paddingTop: 4,
    fontFamily: "Helvetica-Bold",
    marginRight: 8,
  },
  stepText: {
    flex: 1,
    fontSize: 9.5,
  },
  tree: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: C.stone,
    padding: 12,
    fontFamily: "Courier",
    fontSize: 7.5,
    lineHeight: 1.25,
    color: C.ink,
    marginTop: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: C.stone,
    marginTop: 8,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.stone,
  },
  th: {
    flex: 1,
    padding: 7,
    backgroundColor: C.cream,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
  },
  td: {
    flex: 1,
    padding: 7,
    fontSize: 8.5,
    color: C.ink,
  },
  note: {
    backgroundColor: "#FFF9EA",
    borderLeftWidth: 4,
    borderLeftColor: C.gold,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
    fontSize: 9.5,
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 38,
    right: 38,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.stone,
    flexDirection: "row",
    justifyContent: "space-between",
    color: C.muted,
    fontSize: 8,
  },
});

const e = React.createElement;
const T = (text, style) => e(Text, { style }, text);
const P = (text) => T(text, s.p);
const H1 = (text) => T(text, s.h1);
const H2 = (text) => T(text, s.h2);
const H3 = (text) => T(text, s.h3);
const Bullet = ({ children }) => e(View, { style: s.bulletRow }, T("-", s.bulletDot), T(String(children), s.bulletText));
const Bullets = (items) => e(View, null, ...items.map((item, i) => e(Bullet, { key: i }, item)));
const Step = (no, text) => e(View, { style: s.flowStep }, T(String(no), s.stepNo), T(text, s.stepText));
const Header = (section) => e(View, { style: s.header, fixed: true }, T("Bridge to Malaysia", s.headerBrand), T(section, s.headerMeta));
const Footer = () => e(View, { style: s.footer, fixed: true }, T("Confidential business overview", null), e(Text, { render: ({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}` }));
const PageWrap = (section, children) => e(Page, { size: "A4", style: s.page }, Header(section), children, Footer());
const Card = (title, children) => e(View, { style: s.card }, T(title, s.cardTitle), children);

function Cover() {
  return e(Page, { size: "A4", style: s.page },
    e(View, { style: s.cover },
      T("Non-technical system report", s.coverKicker),
      T("Bridge to Malaysia Student Management System", s.coverTitle),
      T("A clear explanation of how student intake, AI passport scanning, invoices, payments, contracts, tracking, WhatsApp groups, and Google Drive storage work together.", s.coverSubtitle),
      e(View, { style: s.metaBox },
        T("Prepared for: Business / operations review", s.metaText),
        T("Prepared on: May 17, 2026", s.metaText),
        T("Focus: How everything works and how Drive folders/files are created and saved", s.metaText)
      )
    ),
    Footer()
  );
}

function OverviewPage() {
  return PageWrap("Overview", e(View, null,
    H1("1. Executive Summary"),
    P("Bridge to Malaysia is a student consultancy management system built to reduce manual work and improve communication with students. Instead of using separate WhatsApp messages, Word contracts, Excel sheets, manually created invoices, and scattered Drive folders, the platform connects everything into one workflow."),
    Card("What the system helps the team do", Bullets([
      "Collect student details through a public online intake form.",
      "Use AI to read passport images and auto-fill important fields.",
      "Create organized Google Drive folders automatically.",
      "Generate invoices and contracts from the admin dashboard.",
      "Let students upload receipts, download invoices, and e-sign contracts.",
      "Show students their journey progress without requiring constant WhatsApp updates.",
      "Track payments, partial payments, overpayments, and pending receipts.",
      "Save a dedicated WhatsApp group link for each student."
    ])),
    H2("Who uses it?"),
    e(View, { style: s.grid },
      e(View, { style: s.col }, Card("Admins", Bullets([
        "Manage students, invoices, contracts, receipts, and stage updates.",
        "Approve or reject student payment receipts.",
        "Create contract and invoice PDFs.",
        "Store and access student Drive files."
      ]))),
      e(View, { style: s.col }, Card("Students", Bullets([
        "Submit intake form and required documents.",
        "Check status using passport number.",
        "Download invoices and upload receipts.",
        "View and sign contracts online."
      ])))
    )
  ));
}

function JourneyPage() {
  return PageWrap("Student Journey", e(View, null,
    H1("2. Student Journey and Tracking"),
    P("The platform follows the real student journey from first consultation to university registration. Each stage can have comments and attachments, so both the admin team and student can clearly see what has happened."),
    Card("10 journey stages", Bullets([
      "Initial Consultation",
      "University Application",
      "Offer Letter Received",
      "EMGS Processing",
      "Visa Application",
      "Tuition Fee Payment",
      "Flight Booking",
      "Airport Pickup",
      "Medical Check",
      "University Registration"
    ])),
    H2("Student tracking page"),
    P("Students do not need an account. They use their passport number to open their tracking page. The page shows the current stage, previous updates, invoices, payment status, contracts, signing status, and WhatsApp group link."),
    e(View, { style: s.note }, T("Business benefit: students can answer common questions themselves, such as 'What is my update?', 'Did you receive my payment?', 'Can I download my invoice?', or 'Where is my contract?'", null))
  ));
}

function IntakeAiPage() {
  return PageWrap("Intake + AI", e(View, null,
    H1("3. Intake Form and AI Passport Scanner"),
    P("The student intake form is available at /start. It collects student details, university preferences, referral information, notes, and required documents."),
    H2("Multi-step intake flow"),
    e(View, null,
      Step(1, "Student enters personal details."),
      Step(2, "Student uploads required documents."),
      Step(3, "Student previews everything before submitting."),
      Step(4, "System creates the student record and uploads files to Google Drive.")
    ),
    H2("AI passport scanner"),
    P("The passport scanner uses Google Gemini 2.5 Flash to read passport images. It can extract names, passport number, date of birth, nationality, address, family names, and other visible data."),
    Card("Currently auto-filled into forms", Bullets([
      "Full name",
      "Passport number",
      "Address",
      "Phone number, if visible"
    ])),
    e(View, { style: s.note }, T("Important: AI helps reduce typing work, but the student or admin should still review fields before final submission, especially if the image is blurry.", null))
  ));
}

function PaymentsPage() {
  return PageWrap("Invoices + Payments", e(View, null,
    H1("4. Invoice and Payment Flow"),
    e(View, null,
      Step(1, "Admin creates an invoice from the student profile."),
      Step(2, "The system creates an invoice record and PDF."),
      Step(3, "The PDF is uploaded to the student's Google Drive folder."),
      Step(4, "Student downloads invoice from the tracking page."),
      Step(5, "Student uploads payment receipt from the same tracking page."),
      Step(6, "Receipt is saved to Google Drive and a pending payment record is created."),
      Step(7, "Admin approves or rejects the payment."),
      Step(8, "Invoice status updates automatically."
      )
    ),
    H2("Invoice statuses"),
    Bullets(["Sent", "Partially paid", "Paid", "Overpaid", "Cancelled"]),
    H2("Overpayment handling"),
    P("If approved payments are more than the invoice amount, the invoice becomes overpaid. The student tracking page displays how much was overpaid and says it will be credited to the next invoice."),
    e(View, { style: s.note }, T("Example: Overpaid by BDT 5,000 — will be credited to next invoice.", null))
  ));
}

function ContractsPage() {
  return PageWrap("Contracts", e(View, null,
    H1("5. Contracts and E-Signing"),
    P("Contracts are created by admins from the student profile. The contract PDF is generated by the system and uploaded to the student's Google Drive Contracts folder."),
    e(View, null,
      Step(1, "Admin creates the contract."),
      Step(2, "System generates and stores the PDF."),
      Step(3, "Student sees the contract on the tracking page."),
      Step(4, "Student clicks sign contract."),
      Step(5, "System records signed status, signing date/time, and IP address."),
      Step(6, "Student and admin can download the contract later.")
    ),
    H2("What gets recorded"),
    Bullets(["Signed = yes", "Signed date/time", "Signing IP address", "Contract number", "Google Drive file link"])
  ));
}

function DrivePage() {
  return PageWrap("Google Drive", e(View, null,
    H1("6. Google Drive Folder Structure"),
    P("Google Drive is the main file storage system. The app uses a Google service account that has access to the parent Drive folder. The system creates one main folder per student, then creates subfolders for documents, invoices/receipts, and contracts."),
    T(`STUDENT DETAILS SAAS\n│\n└── MD JAWAD KIBRIA — UTM (February 2026)\n    │\n    ├── MD Documents\n    │   ├── md_jawad_kibria_passport_info_page_2026-05-17.pdf\n    │   ├── md_jawad_kibria_ssc_certificate_2026-05-17.pdf\n    │   ├── md_jawad_kibria_hsc_marksheet_2026-05-17.pdf\n    │   ├── md_jawad_kibria_passport_photo_2026-05-17.jpg\n    │   └── extra_uploaded_file.pdf\n    │\n    ├── Invoice and Receipt\n    │   ├── md_jawad_kibria_security_deposit.pdf\n    │   ├── md_jawad_kibria_tuition_fee.pdf\n    │   ├── md_jawad_kibria_receipt_security_deposit_2026-05-20.jpg\n    │   └── md_jawad_kibria_receipt_tuition_fee_2026-06-10.pdf\n    │\n    └── Contracts\n        └── md_jawad_kibria_contract.pdf`, s.tree)
  ));
}

function DriveDetailsPage() {
  return PageWrap("Drive Saving Rules", e(View, null,
    H1("7. How Files Are Created and Saved"),
    e(View, null,
      Step(1, "System finds the student's main Google Drive folder."),
      Step(2, "If the needed subfolder does not exist, the system creates it."),
      Step(3, "System uploads the file to the correct subfolder."),
      Step(4, "System makes the file viewable by link."),
      Step(5, "System saves the Drive link inside the database.")
    ),
    H2("Folder and file naming rules"),
    e(View, { style: s.table },
      e(View, { style: s.tr }, T("Item", s.th), T("Naming rule", s.th), T("Example", s.th)),
      e(View, { style: s.tr }, T("Student folder", s.td), T("Full Name — University (Intake)", s.td), T("MD JAWAD KIBRIA — UTM (February 2026)", s.td)),
      e(View, { style: s.tr }, T("Documents folder", s.td), T("First Name Documents", s.td), T("MD Documents", s.td)),
      e(View, { style: s.tr }, T("Invoice folder", s.td), T("Fixed name", s.td), T("Invoice and Receipt", s.td)),
      e(View, { style: s.tr }, T("Contracts folder", s.td), T("Fixed name", s.td), T("Contracts", s.td)),
      e(View, { style: s.tr }, T("Document files", s.td), T("student_document_date.ext", s.td), T("md_jawad_passport_2026-05-17.pdf", s.td)),
      e(View, { style: s.tr }, T("Receipt files", s.td), T("student_receipt_invoice_date.ext", s.td), T("md_jawad_receipt_security_deposit_2026-05-20.jpg", s.td))
    ),
    H2("Database vs Drive"),
    e(View, { style: s.grid },
      e(View, { style: s.col }, Card("Database saves", Bullets(["Student information", "Invoice/payment records", "Contract signing status", "Current stage", "Drive links", "WhatsApp group link"]))),
      e(View, { style: s.col }, Card("Google Drive saves", Bullets(["Passport scans", "Academic certificates", "Receipts", "Invoice PDFs", "Contract PDFs", "Stage attachments"])))
    )
  ));
}

function FinalPage() {
  return PageWrap("Business Benefits", e(View, null,
    H1("8. Business Benefits and Final Summary"),
    Card("Main benefits", Bullets([
      "Less manual typing and fewer mistakes.",
      "Every student has one organized file area in Google Drive.",
      "Students can self-check updates, invoices, payments, and contracts.",
      "Admins can manage the full journey from one dashboard.",
      "Payment and contract activity is recorded for accountability.",
      "The system supports growth without adding unnecessary admin workload."
    ])),
    H2("Current future improvements"),
    Bullets([
      "Full credit/refund ledger for overpaid amounts.",
      "More finance charts and reports.",
      "Commission entry screen for university commissions.",
      "More automated payment/document emails.",
      "Admin document checklist screen."
    ]),
    e(View, { style: s.note }, T("Final summary: Bridge to Malaysia now has a connected system for AI-assisted onboarding, Drive file storage, invoice/payment management, contract e-signing, and student progress tracking. The system functions as a central digital office assistant for the full student journey.", null))
  ));
}

function Report() {
  return e(Document, { title: "Bridge to Malaysia System Report", author: "Bridge to Malaysia" },
    e(Cover),
    e(OverviewPage),
    e(JourneyPage),
    e(IntakeAiPage),
    e(PaymentsPage),
    e(ContractsPage),
    e(DrivePage),
    e(DriveDetailsPage),
    e(FinalPage)
  );
}

await renderToFile(e(Report), outputPath);
console.log(`PDF generated: ${outputPath}`);
