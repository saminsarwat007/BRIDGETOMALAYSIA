# Bridge to Malaysia — AI Context File

> **Read this first.** Any AI session (Cascade, Claude, Codex, etc.) that wants to modify or extend this codebase should start by reading this single file. It explains the business, the architecture, the file map, the data model, and the common modification patterns.

---

## 1. Business overview

**Bridge to Malaysia** is a small Bangladeshi student consultancy that helps students apply to Malaysian universities (UTM, etc.). Run by 1-3 admins. Volume: ~10-50 active students at any time.

The 10-stage student journey:
`Initial Consultation → University Application → Offer Letter Received → EMGS Processing → Visa Application → Tuition Fee Payment → Flight Booking → Airport Pickup → Medical Check → University Registration`

What the app replaces:
- Manual emails / WhatsApp templates for collecting student info
- Word-document contracts edited by hand
- Excel sheets for expense tracking
- Manual invoice creation in Word
- No way for students to see status without messaging the team
- Lost track of referrals and university commissions

---

## 2. Tech stack

| Concern | Tool |
|---------|------|
| Framework | Next.js 14 App Router (RSC + Server Actions) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + bespoke design tokens |
| Auth | Supabase Auth (email/password, admins only) |
| Database | Supabase Postgres (with RLS + SECURITY DEFINER functions) |
| File storage | Google Drive (via service account, **not** Supabase Storage) |
| Email | Resend (`onboarding@resend.dev`, reply-to Gmail) |
| PDF | `@react-pdf/renderer` (server-rendered to a Node route) |
| Hosting | Vercel (free) |
| Fonts | Geist Sans + Geist Mono + Fraunces (display) |
| AI OCR | Google Gemini 2.5 Flash (passport scanning) |
| CAPTCHA | Cloudflare Turnstile |
| Rate limiting | Upstash Redis (fallback to in-memory for dev) |

Everything is free-tier. No paid services.

---

## 3. Brand & design system

| Token | Hex | Use |
|-------|-----|-----|
| `--brand-ink` | `#1F1410` | Primary text |
| `--brand-bridge` | `#8B5A2B` | Warm bridge brown, primary action |
| `--brand-gold` | `#C8932B` | Refined gold accents |
| `--brand-glow` | `#E5B660` | Hover/glow highlight |
| `--brand-cream` | `#F5EFE4` | Cards, subtle surfaces |
| `--brand-paper` | `#FBF7EF` | Page background |
| `--brand-muted` | `#8C7B6A` | Captions / meta |
| `--brand-stone` | `#D9CDB8` | Borders |

Design rules (enforced by reading `_reference/frontenddesignskill.md`, `_reference/skill3.md`):
- **No** Inter / Roboto / Arial. Body = Geist; display = Fraunces.
- **No** purple gradients. Use the warm palette only.
- **No** uniform rounded corners. Vary by context (sharp tables, soft cards, pill buttons).
- **No** centered-only layouts. Use asymmetric content where it adds character.
- Mobile-first: every page tested at 375px width.

Reusable utility classes (in `src/app/globals.css`):
- `.paper`, `.grain` — background atmosphere
- `.card-paper` — standard card surface
- `.input-paper` — form inputs
- `.btn-gold`, `.btn-ghost` — buttons
- `.label-eyebrow` — small uppercase metadata
- `.node-completed`, `.node-current`, `.node-future` — tracking timeline nodes

---

## 4. File map

```
BRIDGETOMALAYSIA/
├── _reference/                       ← Business reference (contracts, PDFs, screenshots). NOT shipped.
├── supabase/
│   ├── schema.sql                    ← Full DB schema. Re-runnable. Copy/paste to Supabase SQL editor for recovery.
│   └── migrations/0001_init.sql      ← Initial migration (references schema.sql)
├── public/logo.jpg                   ← Brand logo
├── src/
│   ├── middleware.ts                 ← Route protection (login redirect)
│   ├── types/database.ts             ← Hand-written TS types mirroring schema.sql
│   ├── lib/
│   │   ├── utils.ts                  ← `cn`, formatters, STAGES const, slug helpers
│   │   ├── supabase/
│   │   │   ├── client.ts             ← Browser client
│   │   │   ├── server.ts             ← Server client + service-role client
│   │   │   └── middleware.ts        ← Session refresh / auth gate
│   │   ├── google/drive.ts           ← Drive service account: upload, ensureSubfolder
│   │   ├── email/
│   │   │   ├── resend.ts             ← Resend wrapper, reply-to Gmail
│   │   │   └── templates.ts          ← HTML email templates (stage change, invoice, etc.)
│   │   ├── pdf/invoice-pdf.tsx       ← @react-pdf/renderer invoice template
│   │   ├── pdf/contract-pdf.tsx      ← Contract PDF template (student-facing)
│   │   └── ai/gemini.ts              ← Gemini 2.5 Flash — passport OCR extraction
│   ├── components/
│   │   ├── passport-scanner.tsx      ← AI passport scan UI (public + admin forms)
│   │   └── security/turnstile-widget.tsx  ← Cloudflare Turnstile CAPTCHA
│   ├── components/admin/
│   │   ├── admin-shell.tsx           ← Sidebar (desktop) + bottom nav (mobile)
│   │   ├── student-form.tsx          ← Create/edit student form (useFormState)
│   │   ├── student-tabs.tsx          ← Tabs within student detail page
│   │   ├── tracking-updates.tsx      ← Admin tracking portal (stage + comments + attachments)
│   │   └── student-invoices.tsx      ← Invoice CRUD + payment recording for one student
│   └── app/
│       ├── globals.css               ← Design tokens, utility classes
│       ├── layout.tsx                ← Root layout (fonts, Toaster)
│       ├── page.tsx                  ← Public marketing landing
│       ├── login/                    ← Admin sign-in
│       ├── start/                    ← Public student intake form (multi-step)
│       │   ├── page.tsx              ← Start page with Turnstile CAPTCHA
│       │   └── start-form.tsx        ← Multi-step: details → docs → preview → submit
│       ├── track/                    ← Public student tracking
│       │   ├── page.tsx              ← Passport lookup landing
│       │   └── [passport]/
│       │       ├── page.tsx          ← Server-rendered tracking detail
│       │       ├── tracking-view.tsx ← Visual timeline + invoices + contracts + uploads
│       │       ├── receipt-upload-sheet.tsx  ← Mobile-friendly receipt upload
│       │       └── document-upload-sheet.tsx ← Document upload for stage attachments
│       ├── admin/                    ← Auth-protected admin area
│       │   ├── layout.tsx            ← Requires auth, renders AdminShell
│       │   ├── page.tsx              ← Overview dashboard
│       │   ├── students/             ← List, new, [id], [id]/edit
│       │   ├── invoices/             ← List + /[id]/pdf download
│       │   ├── finance/              ← Revenue + commissions overview
│       │   ├── referrals/            ← Referrer rollup
│       │   └── actions/              ← Server actions
│       │       ├── students.ts       ← create/update/delete student
│       │       ├── tracking.ts       ← addStageUpdate, quickSetStage
│       │       └── invoices.ts       ← createInvoice, recordPayment, approve/reject, contract CRUD
│       └── api/
│           └── public/
│               ├── intake/route.ts            ← Anonymous student intake submission
│               ├── upload-receipt/route.ts      ← Anonymous receipt upload → Drive + payment row
│               ├── extract-passport/route.ts    ← AI passport OCR (Gemini 2.5 Flash)
│               ├── invoice-pdf/route.ts         ← Public invoice PDF by passport + invoice ID
│               ├── contract-pdf/route.ts        ← Public contract PDF by passport + contract ID
│               └── sign-contract/route.ts       ← Student e-signing (records signed_at + signed_ip)
├── .env.local                        ← Secrets (gitignored)
├── .env.example                      ← Template
└── package.json
```

---

## 5. Database

See `supabase/schema.sql` for the authoritative schema. Tables:

| Table | Purpose |
|-------|---------|
| `profiles` | Admin users (auto-created from `auth.users` via trigger) |
| `students` | Core record per student (`whatsapp_group_url`, `agency_referred_at`, `agency_referred_to`) |
| `applications` | Optional multi-university apps per student |
| `documents` | Per-student doc checklist (passport, SSC, etc.) |
| `contracts` | Generated contracts (`signed`, `signed_at`, `signed_ip`, `field_values` JSONB) |
| `invoices` | Editable invoices (`line_items`, `field_values` JSONB, `status` enum) |
| `payments` | Each payment, including student-uploaded receipts |
| `transactions` | Ledger (kept loose for now; payments are the source of truth) |
| `referrals` | Who referred whom |
| `commissions` | What universities paid us |
| `stage_history` | Every stage update + comment + Drive attachment link |
| `numbering_counters` | Year-scoped invoice/contract sequence numbers |

Public-safe functions (callable from `anon`):
- `get_tracking_by_passport(p_passport text)` → JSONB student status
- `submit_student_payment(...)` → records a `payments` row with `source='student'`, `status='pending'`

RLS: all admin tables require `auth.role() = 'authenticated'`.

---

## 6. Auth flow

- Admins are created manually in Supabase → Authentication → Users.
- Sign in via `/login` (email/password).
- Middleware (`src/middleware.ts`) checks for session and redirects to `/login` for any path that isn't public.
- **Public paths**: `/`, `/track/*`, `/start`, `/login`, `/api/public/*` (intake, upload-receipt, extract-passport, invoice-pdf, contract-pdf, sign-contract).

---

## 7. Money flow & payment matching

1. Admin creates an invoice on a student → unique number `BTM-YYYY-####` is generated server-side via `next_number` RPC.
2. Filename is auto-generated as `{studentname}_{invoicetype}.pdf` (e.g. `samin_securitydeposit.pdf`).
3. Student opens `/track/{passport}`, sees the unpaid invoice, taps "Upload receipt".
4. The file is uploaded to `/api/public/upload-receipt`, which:
   - Looks up student by passport
   - Ensures `Invoice and Receipt` subfolder exists in their Drive folder (creating it if needed)
   - Uploads the receipt to Drive via service account
   - Records a `payments` row with `source='student'`, `status='pending'`
5. Admin sees the pending receipt on `/admin` dashboard and `/admin/invoices?filter=pending-receipts`.
6. Admin approves/rejects from the student's invoice tab. Approval recomputes `invoices.status`:
   - `paid` if approved payments == total
   - `partially_paid` if < total
   - `overpaid` if > total (excess shown to student on tracking page as "will be credited to next invoice")

## 8. Contracts & e-signing

1. Admin creates a contract from `/admin/students/[id]` → generates a PDF via `@react-pdf/renderer` → uploaded to Drive `Contracts` subfolder.
2. Student sees contract card on `/track/{passport}` with "View contract" and "Sign contract" buttons.
3. Student clicks "Sign contract" → POST to `/api/public/sign-contract` with IP capture.
4. DB records `signed=true`, `signed_at=now()`, `signed_ip=client_ip`.
5. Contract PDF shows "SIGNED" stamp with date. Admin and student can download the signed PDF anytime.

## 9. AI passport scanner

1. Student or admin uploads a passport photo in the intake form or admin student form.
2. Image sent to `/api/public/extract-passport` → Gemini 2.5 Flash extracts 14 fields (name, passport no, DOB, address, phone, father/mother name, etc.).
3. Extracted fields auto-fill the form (full_name, passport_no, address, phone).
4. Requires `GEMINI_API_KEY` env var. Get free key at https://aistudio.google.com/apikey.

## 10. WhatsApp groups & student communication

- Each student can have a dedicated `whatsapp_group_url` stored on their record (set in admin form).
- If set, the tracking page shows "Open your WhatsApp group" linking directly to the group.
- If not set, falls back to generic support WhatsApp number.
- Agency referral: admin can mark a student as "forwarded to agency" with timestamp + agency name.

---

## 11. Common modification patterns

When you (the AI) want to add or change things, follow these patterns:

### Add a new stage
1. Update the `STAGES` array in `src/lib/utils.ts`.
2. Add the value to the `student_stage` ENUM in `supabase/schema.sql` (alter type + run on Supabase).
3. Update the TypeScript union in `src/types/database.ts`.

### Add a new invoice type
1. Add a string to `INVOICE_TYPES` in `src/lib/utils.ts`.
2. That's it — the type is a free-form string in the DB.

### Add a new attachment kind (e.g. medical certificate)
1. Add to `attachment_type` ENUM in `supabase/schema.sql`.
2. Add to `ATTACHMENT_KINDS` in `src/lib/utils.ts` and the `attachmentLabels` map in `src/app/track/[passport]/tracking-view.tsx`.

### Add a new admin
1. In Supabase dashboard → Authentication → Users → Add user → invite by email.
2. They'll get a confirmation email and can sign in.

### Change the contract or invoice PDF design
- Invoice: `src/lib/pdf/invoice-pdf.tsx` — pure `@react-pdf/renderer` JSX.
- Contract: `src/lib/pdf/contract-pdf.tsx` — same pattern.

### Change email content
- Templates: `src/lib/email/templates.ts`. All use inline-styled HTML for email-client compatibility.

### Add a new public API
- Anything under `src/app/api/public/*` is allowed for anonymous access (matched in `middleware.ts`).
- Authenticate the request manually using passport + invoice ownership checks — see `upload-receipt/route.ts`.

---

## 12. Environment variables & setup

### Required (already configured)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase settings → API → service_role key
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_KEY` — Google Cloud → Service Account
- `GOOGLE_DRIVE_PARENT_FOLDER_ID` — Drive folder ID shared with service account
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO` — Resend.com

### 🔴 Must set up now

#### Cloudflare Turnstile (CAPTCHA on /start)
1. Go to **https://dash.cloudflare.com** → Turnstile → Add site
2. Add domains: `localhost` (for dev) AND your production domain (e.g., `bridgetomalaysia.vercel.app`)
3. Widget mode: **Managed**
4. Copy keys:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = Site key
   - `TURNSTILE_SECRET_KEY` = Secret key
5. Add both to **Vercel → Settings → Environment Variables**

> **Quick test** (no account needed): Use Cloudflare's test keys:
> - `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA`
> - `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`
> These **always pass** — good for dev. Replace with real keys before going live.

#### Upstash Redis (rate limiting on /api/public/intake)
1. Go to **https://upstash.com** → Sign up (free tier: 10k commands/day)
2. Create a **Redis database** (Global or Regional — either is fine)
3. Go to database page → **REST API** tab
4. Copy:
   - `UPSTASH_REDIS_REST_URL` = REST API URL
   - `UPSTASH_REDIS_REST_TOKEN` = REST API Token
5. Add both to **Vercel → Settings → Environment Variables**

> If both are empty, the server falls back to an **in-memory rate limiter** — fine for local dev, NOT safe for production serverless (each instance has its own bucket).

#### Google Gemini (AI passport scanner)
1. Go to **https://aistudio.google.com/apikey**
2. Create API key (free tier: generous daily quota)
3. Add `GEMINI_API_KEY` to Vercel env vars

---

## 13. Deploying

1. Push to GitHub (`saminsarwat007/BRIDGETOMALAYSIA`).
2. Connect the repo to Vercel.
3. Add **all** env vars from `.env.local` to Vercel → Settings → Environment Variables.
4. Set `NEXT_PUBLIC_APP_URL` to the production URL.
5. Vercel will auto-deploy on every push to `main`.

The Drive service account must be shared on the parent "Student details" folder in Drive — once, in the Drive UI.

---

## 14. Known gaps / future work

These were scoped down from the original plan to ship faster:

- Document checklist UI (`/admin/students/[id]?tab=documents`) is not built; the `documents` table is ready.
- Finance dashboard is minimal (no charts yet); the data is there to add Recharts views.
- Commission entry UI is not built; commissions can currently only be inserted via SQL.
- Email notifications for `payment confirmed` and `document rejected` are templated but not yet wired to admin actions.
- Refund/ledger UI for overpaid amounts is not built; overpayment is shown to students but not tracked as a formal credit balance.

The SaaS is **already useful** for end-to-end: AI passport scan → onboard student → generate invoice/contract PDF → student signs contract → uploads receipt → admin approves → status visible on tracking page.
