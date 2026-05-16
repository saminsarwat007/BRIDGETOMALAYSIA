import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Admin Sign In — Bridge to Malaysia",
};

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="min-h-screen paper">
      <div className="mx-auto max-w-md px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-3 mb-12">
          <Image src="/logo.jpg" alt="" width={40} height={40} className="rounded" />
          <div className="leading-tight">
            <div className="font-display text-lg text-brand-ink">Bridge to Malaysia</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-brand-muted">Admin Portal</div>
          </div>
        </Link>

        <p className="label-eyebrow">Welcome back</p>
        <h1 className="mt-2 font-display text-3xl text-brand-ink">Sign in to manage students</h1>
        <p className="mt-3 text-sm text-brand-ink/70">
          Use your Bridge to Malaysia email and password.
        </p>

        <div className="mt-10">
          <Suspense fallback={<div className="text-sm text-brand-muted">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-8 text-xs text-brand-muted">
          Need access? Ask the lead admin to invite you from Supabase → Authentication → Users.
        </p>
      </div>
    </main>
  );
}
