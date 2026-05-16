import Image from "next/image";
import Link from "next/link";
import { StartForm } from "./start-form";

export const metadata = {
  title: "Start your application — Bridge to Malaysia",
  description: "Tell us about yourself and we'll get back to you.",
};

export default function StartPage() {
  return (
    <main className="min-h-screen paper grain">
      <div className="mx-auto max-w-2xl px-5 sm:px-6 pt-10 pb-24">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-md" />
          <div className="leading-tight">
            <div className="font-display text-lg text-brand-ink">Bridge to Malaysia</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-brand-muted">Student Portal</div>
          </div>
        </Link>

        <section className="mt-12 sm:mt-16">
          <p className="label-eyebrow">Get started</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-brand-ink leading-[1.05]">
            Tell us about yourself.
          </h1>
          <p className="mt-4 max-w-lg text-brand-ink/75 leading-relaxed">
            Fill in the basics below — we'll set up your profile and reach out on WhatsApp within 24 hours to walk you through the next steps.
          </p>
        </section>

        <div className="mt-10">
          <StartForm />
        </div>

        <footer className="mt-20 text-xs text-brand-muted">
          Already started with us? <Link href="/track" className="text-brand-bridge hover:underline">Track your application instead</Link>.
        </footer>
      </div>
    </main>
  );
}
