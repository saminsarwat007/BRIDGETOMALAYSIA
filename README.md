# Bridge to Malaysia — SaaS

Internal SaaS to manage student applications from Bangladesh to Malaysian universities. Built free-tier on **Next.js 14 + Supabase + Google Drive + Resend**, deployed on **Vercel**.

> 👉 For a deep architectural tour and how to extend this app, read [`aicontext.md`](./aicontext.md).

---

## Quick start

### 1. Install
```bash
npm install --legacy-peer-deps
```

### 2. Configure environment

Copy `.env.example` → `.env.local` and fill in:

- **Supabase**: From the Supabase project → Settings → API
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ← the **service role** key, not the anon key
- **Google Drive**: From the service-account JSON downloaded from Google Cloud Console
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL` ← `client_email` from the JSON
  - `GOOGLE_SERVICE_ACCOUNT_KEY` ← `private_key` from the JSON (with `\n` escape sequences)
- **Resend**: From [resend.com](https://resend.com) → API Keys
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL` (leave as `onboarding@resend.dev` if you don't own a domain)

### 3. Set up the database

Open the Supabase SQL editor and paste the full contents of [`supabase/schema.sql`](./supabase/schema.sql). It's idempotent — safe to re-run if you ever lose the project.

### 4. Share your Google Drive parent folder

Share your "Student details" folder in Drive with the service account's `client_email`. Give **Editor** access. All student subfolders inherit access.

### 5. Create the first admin

In Supabase → Authentication → Users → **Add user** (with password). That admin can then sign in at `/login`.

### 6. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Routes

| Path | Who | What |
|------|-----|------|
| `/` | Public | Marketing landing |
| `/track` | Public (students) | Passport-number lookup |
| `/track/[passport]` | Public | Visual application status + invoices + receipt upload |
| `/login` | Public | Admin sign-in |
| `/admin` | Admin | Overview dashboard |
| `/admin/students` | Admin | List + filter + search students |
| `/admin/students/new` | Admin | Onboard a student |
| `/admin/students/[id]` | Admin | Student detail (tabs: tracking, invoices, details) |
| `/admin/invoices` | Admin | All invoices, filter by status / pending receipts |
| `/admin/invoices/[id]/pdf` | Admin | Server-rendered invoice PDF |
| `/admin/finance` | Admin | Money rollup (invoiced / paid / commissions) |
| `/admin/referrals` | Admin | Referrers and their students |

---

## Deploy to Vercel

```bash
vercel link
```

Then add every env var from `.env.local` to Vercel via the dashboard or:

```bash
vercel env pull
```

Vercel auto-deploys on every push to `main`.

---

## Recovery

If you ever lose access to Supabase:

1. Create a new Supabase project.
2. Open SQL editor → paste `supabase/schema.sql` → run.
3. Update `.env.local` and Vercel env vars with the new project's keys.
4. Re-create your admin user in Supabase → Authentication → Users.

If you ever lose the Google service account, the receipts already in Drive are unaffected — you'll just need a new service account and re-share the Drive folders. Update the env vars.

---

## License

Private / internal.
