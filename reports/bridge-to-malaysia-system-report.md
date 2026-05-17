# Bridge to Malaysia System Report

**Prepared for:** Non-technical business review  
**Project:** Bridge to Malaysia Student Management System  
**Date:** May 18, 2026  
**Purpose:** Explain how the system works end-to-end, including student intake, admin operations, AI passport scanning, payments, contracts, tracking, and Google Drive folder/file storage.

---

## 1. Executive Summary

Bridge to Malaysia is a student consultancy management system built to reduce manual work and improve communication with students. Instead of using separate WhatsApp messages, Word contracts, Excel sheets, manually created invoices, and scattered Google Drive folders, the platform connects everything into one workflow.

The system helps the team:

- Collect student details using an online intake form.
- Use AI to read passport images and auto-fill form fields.
- Store student files in organized Google Drive folders.
- Create invoices and contracts from the admin panel.
- Let students upload receipts from their tracking page.
- Let students view their progress without messaging the team every time.
- Let students download invoices, view contracts, and e-sign contracts.
- Track payments, partial payments, and overpayments.
- Save WhatsApp group links for each student.

In simple terms: the system works like a digital office assistant for the whole student journey.

---

## 2. Who Uses the System

### Admin Team

Admins use the protected admin dashboard to manage students, invoices, contracts, receipts, referrals, commissions, and journey updates.

Admin activities include:

- Adding or editing student profiles.
- Reviewing new intake submissions.
- Creating invoices.
- Recording or approving payments.
- Creating contracts.
- Updating the student's journey stage.
- Uploading important status documents.
- Adding the student's WhatsApp group link.
- Checking Google Drive links.

### Students

Students use public pages. They do not need an account or password.

Student activities include:

- Submitting an intake form.
- Uploading required documents.
- Checking their journey status using passport number.
- Downloading invoices.
- Uploading payment receipts.
- Viewing and signing contracts.
- Opening their dedicated WhatsApp group.

---

## 3. The Full Student Journey

The system is designed around a 10-stage student journey:

1. Initial Consultation
2. University Application
3. Offer Letter Received
4. EMGS Processing
5. Visa Application
6. Tuition Fee Payment
7. Flight Booking
8. Airport Pickup
9. Medical Check
10. University Registration

Each stage can have comments and file attachments. This means the team can show the student exactly where they are and what has happened.

For example:

- Stage: Offer Letter Received
- Comment: "UTM offer letter received and shared with student."
- Attachment: Offer letter PDF stored in Google Drive

The student sees this update on their tracking page.

---

## 4. How Student Intake Works

The intake form is available at:

`/start`

A student fills in:

- Full name
- Passport number
- Email
- Phone / WhatsApp number
- Address
- University choice
- Campus
- Intake
- Subject choices
- Referral details
- Notes
- Required documents

The form is multi-step:

1. Student details
2. Document uploads
3. Preview
4. Submit

When submitted, the system creates a student record in the database and uploads the student's files to Google Drive.

---

## 5. AI Passport Scanner

The system includes an AI passport scanner powered by Google Gemini 2.5 Flash.

### What it does

The student or admin uploads a passport image. The AI reads the passport and extracts information such as:

- Full name
- Given name
- Surname
- Passport number
- Date of birth
- Gender
- Nationality
- Place of birth
- Issue date
- Expiry date
- Address
- Father's name
- Mother's name
- Phone number, if visible

### What gets auto-filled

Currently, the form auto-fills:

- Full name
- Passport number
- Address
- Phone number

The user still reviews the data before submitting. This is important because AI can make mistakes if the image is blurry or the passport page is incomplete.

### Where it is used

The scanner is available in:

- Public student intake form
- Admin student creation form

### Why it helps

It reduces typing mistakes and makes intake faster, especially for students filling forms from mobile phones.

---

## 6. Security on Public Forms

The `/start` intake form is protected using Cloudflare Turnstile CAPTCHA.

This prevents bots from submitting fake student forms.

The public intake API is also rate-limited using Upstash Redis. This limits how many times someone can submit forms in a short period.

If Redis is not configured, the system still works using a temporary in-memory limiter, but Redis is better for production.

---

## 7. Admin Dashboard Overview

Admins log in through:

`/login`

After login, admins can access:

- Student list
- Student detail pages
- Invoice management
- Contract management
- Finance overview
- Referral overview
- Pending receipt approvals
- Stage tracking tools

The admin area is protected. Students cannot access it.

---

## 8. Student Tracking Page

Students can check status using their passport number.

The tracking page shows:

- Current journey stage
- Timeline of previous updates
- Uploaded status documents
- Invoices
- Payment status
- Overpayment message, if any
- Contracts
- Contract signing status
- WhatsApp contact or group link

This reduces repetitive WhatsApp messages like:

- "What is my update?"
- "Did you receive my payment?"
- "Can you send my invoice again?"
- "Where is my contract?"

---

## 9. Invoice and Payment Flow

### Step 1: Admin creates invoice

The admin creates an invoice from the student profile.

The system generates:

- Invoice number
- Invoice PDF
- Invoice database record
- Google Drive copy of the PDF

Example invoice number:

`BTM-2026-0001`

### Step 2: Student downloads invoice

The student opens their tracking page and clicks "Download PDF".

### Step 3: Student uploads receipt

The student uploads a payment receipt from the same tracking page.

The receipt is saved to Google Drive, and a payment record is created with status:

`pending`

### Step 4: Admin approves payment

The admin reviews the receipt and approves or rejects it.

When approved, the invoice status updates automatically.

Invoice statuses:

- Sent
- Partially paid
- Paid
- Overpaid
- Cancelled

---

## 10. How Overpayments Are Shown

If the student pays more than the invoice amount, the invoice becomes:

`overpaid`

The student tracking page shows a message like:

`Overpaid by BDT 5,000 — will be credited to next invoice`

This helps students understand that extra money is not lost. It will be returned or applied to a future invoice.

At the moment, the system displays overpayment clearly, but a full credit-balance/refund ledger screen is still future work.

---

## 11. Contract and E-Signing Flow

### Step 1: Admin creates contract

The admin creates a contract from the student profile.

The system generates:

- Contract record
- Contract PDF
- Google Drive copy

### Step 2: Student sees contract

The student sees the contract card on their tracking page.

They can:

- View contract
- Download contract PDF
- Sign contract digitally

### Step 2b: Admin adds their signature (optional)

The admin can add the service provider's signature directly in the contract composer. Instead of uploading an image, the admin types the signatory's name. The system renders it in a professional cursive font (Dancing Script) and saves it as an image. This appears above the signature line on the PDF.

### Step 3: Student signs contract

When the student clicks "Sign contract" on their tracking page, a signature panel opens inline. The student types their full name, which is rendered live in the same cursive font as a preview. The student then clicks **Adopt & Sign**.

The system records:

- Signed = yes
- Signature image (stored with the contract)
- Signing date/time
- Signing IP address

The downloaded contract PDF shows both parties' cursive signatures above their respective signature lines, along with the date. This looks professional and is legally sufficient as a digital agreement.

---

## 12. WhatsApp Group Link

Each student can have a dedicated WhatsApp group link saved in their student profile.

If the group link is saved, the student tracking page shows:

`Open your WhatsApp group`

If no group link is saved, the page falls back to the general Bridge to Malaysia WhatsApp contact.

This helps the team keep communication organized student-by-student.

---

## 13. How Google Drive Storage Works

Google Drive is used as the main file storage system.

The system uses a Google service account. The service account must have access to the main parent folder in Google Drive.

The parent folder is usually something like:

`STUDENT DETAILS SAAS`

Inside that parent folder, the system creates one folder for each student.

---

## 14. Google Drive Folder Structure After a Student Completes the Journey

A completed student's Google Drive area will look like this:

```text
STUDENT DETAILS SAAS
│
└── MD JAWAD KIBRIA — UTM (February 2026)
    │
    ├── MD Documents
    │   ├── md_jawad_kibria_passport_info_page_2026-05-17.pdf
    │   ├── md_jawad_kibria_passport_all_pages_2026-05-17.pdf
    │   ├── md_jawad_kibria_ssc_certificate_2026-05-17.pdf
    │   ├── md_jawad_kibria_ssc_marksheet_2026-05-17.pdf
    │   ├── md_jawad_kibria_hsc_certificate_2026-05-17.pdf
    │   ├── md_jawad_kibria_hsc_marksheet_2026-05-17.pdf
    │   ├── md_jawad_kibria_passport_photo_2026-05-17.jpg
    │   ├── md_jawad_kibria_english_proficiency_2026-05-17.pdf
    │   └── extra_uploaded_file.pdf
    │
    ├── Invoice and Receipt
    │   ├── md_jawad_kibria_security_deposit.pdf
    │   ├── md_jawad_kibria_tuition_fee.pdf
    │   ├── md_jawad_kibria_receipt_security_deposit_2026-05-20.jpg
    │   └── md_jawad_kibria_receipt_tuition_fee_2026-06-10.pdf
    │
    └── Contracts
        └── md_jawad_kibria_contract.pdf
```

---

## 15. What Each Google Drive Folder Means

### Student Main Folder

Example:

`MD JAWAD KIBRIA — UTM (February 2026)`

This is the student's main folder. It contains all other folders and files.

The name normally includes:

- Student full name
- University
- Intake

### Documents Folder

Example:

`MD Documents`

This folder stores student-uploaded academic and identity documents.

Common files:

- Passport information page
- Passport all pages
- SSC certificate
- SSC marksheet
- HSC certificate
- HSC marksheet
- Passport-sized photo
- English proficiency certificate
- Extra attachments

### Invoice and Receipt Folder

This folder stores all payment-related files.

It contains:

- Invoice PDFs generated by the system
- Receipts uploaded by students
- Payment proof files

### Contracts Folder

This folder stores generated contract PDFs.

If the student signs the contract, the database stores the signature status and signing details.

---

## 16. How Files Are Saved to Google Drive

When a file is uploaded or generated, the system follows this process:

1. Finds the student's main Google Drive folder.
2. Creates the needed subfolder if it does not already exist.
3. Uploads the file to the correct folder.
4. Makes the file viewable by link.
5. Saves the Google Drive file link in the database.

This means the admin can open the file later from inside the app, and the student can access allowed files from the tracking page.

---

## 17. Google Drive Naming Rules

### Student folder

Pattern:

`Full Name — University (Intake)`

Example:

`MD JAWAD KIBRIA — UTM (February 2026)`

### Documents folder

Pattern:

`First Name Documents`

Example:

`MD Documents`

### Invoice and Receipt folder

Fixed name:

`Invoice and Receipt`

### Contracts folder

Fixed name:

`Contracts`

### Document files

Pattern:

`student_name_document_type_date.extension`

Example:

`md_jawad_kibria_passport_info_page_2026-05-17.pdf`

### Receipt files

Pattern:

`student_name_receipt_invoice_type_date.extension`

Example:

`md_jawad_kibria_receipt_security_deposit_2026-05-20.jpg`

### Invoice PDFs

Pattern:

`student_name_invoice_type.pdf`

Example:

`md_jawad_kibria_security_deposit.pdf`

### Contract PDFs

Pattern:

`student_name_contract.pdf`

Example:

`md_jawad_kibria_contract.pdf`

---

## 18. What Is Saved in the Database vs Google Drive

### Database saves information

The database saves structured information such as:

- Student name
- Passport number
- Email
- Phone
- University
- Intake
- Current stage
- Invoice amounts
- Payment records
- Contract signing status
- Google Drive file links
- WhatsApp group link

### Google Drive saves files

Google Drive saves actual documents such as:

- Passport scans
- Certificates
- Mark sheets
- Photos
- Receipts
- Invoice PDFs
- Contract PDFs
- Stage update attachments

The system connects them by saving Drive links in the database.

---

## 19. Example Complete Scenario

1. Student opens `/start` and uploads passport.
2. AI reads passport and fills name, passport number, address, and phone.
3. Student uploads academic documents.
4. System creates student profile and Google Drive folder.
5. Admin reviews the student profile.
6. Admin creates an invoice.
7. Invoice PDF is saved in Google Drive.
8. Student sees invoice on tracking page and uploads receipt.
9. Receipt is saved in Google Drive.
10. Admin approves payment.
11. Student sees invoice marked as paid.
12. Admin creates contract.
13. Contract PDF is saved in Google Drive.
14. Student types their name in the signature panel and clicks "Adopt & Sign".
15. Admin updates journey stages as the application progresses.
16. Student checks status anytime using passport number.
17. At the end, all records and files remain organized in one student folder.

---

## 20. Benefits for Bridge to Malaysia

### Less manual work

The system reduces repetitive work like typing passport details, creating folders, renaming files, sending invoices manually, and answering status questions.

### Better organization

Every student has one clear place for files and one clear place for records.

### Better student experience

Students can see progress, upload receipts, download invoices, and sign contracts without waiting for manual replies.

### Better financial tracking

Admins can see invoices, payments, partial payments, pending receipts, and overpayments.

### Better accountability

Stage updates, payment approvals, and contract signing details are recorded.

---

## 21. Current Limitations and Future Improvements

The system is fully operational end-to-end. The following are the remaining items for future improvement:

- More detailed finance charts (bar/line charts for income trends).
- Commission entry screen for university commissions (currently entered via Supabase dashboard).
- Automated email notifications when payments are approved or documents are rejected.
- More advanced reporting and analytics dashboard.

## 21b. Recent Updates (May 2026)

| What changed | Why it matters |
|---|---|
| Contract signing now uses typed name → cursive signature image | Both client and service provider have professional signatures on the PDF |
| Finance page `company_accounts` bug fixed | Finance page was returning a 500 error — now fully working |
| Dashboard BDT/MYR stat layout fixed | The invoiced amounts were overflowing the stat card |
| Refunds UI added to student profiles | Admin can create, track, and complete refund requests |
| Document checklist per student | Admin can mark documents as received or request re-upload with a reason |
| Test data seeded | 3 test students with full journey data for testing |
| All environment variables confirmed in Vercel | Site is fully live and operational |

---

## 22. Final Summary

Bridge to Malaysia now has a connected system for managing the full student journey.

The app acts as a central control panel for the admin team and a self-service portal for students. Google Drive remains the file storage system, but the platform automatically creates folders, uploads files, saves links, and keeps student records organized.

The most important result is that the team can manage each student from first inquiry to university registration with fewer manual steps, fewer lost files, clearer payment tracking, and better communication.
