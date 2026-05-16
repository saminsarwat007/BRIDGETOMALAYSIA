import Image from "next/image";
import Link from "next/link";
import { TrackForm } from "./track-form";

export const metadata = {
  title: "Track Your Application — Bridge to Malaysia",
  description: "Track your application status and upload payment receipts.",
};

export default function TrackLandingPage() {
  return (
    <main className="min-h-screen paper grain">
      <div className="mx-auto max-w-3xl px-6 pt-12 pb-24">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image src="/logo.jpg" alt="" width={44} height={44} className="rounded-md" />
          <div className="leading-tight">
            <div className="font-display text-lg text-brand-ink">Bridge to Malaysia</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-brand-muted">Student Portal</div>
          </div>
        </Link>

        <section className="mt-16 sm:mt-24">
          <p className="label-eyebrow">Student access</p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl text-brand-ink leading-[1.05]">
            Track your application.
          </h1>
          <p className="mt-4 max-w-lg text-brand-ink/75 leading-relaxed">
            Enter the passport number you submitted to us. You'll see your current stage, comments from our team, every document we've issued, and any pending invoices.
          </p>

          <div className="mt-10">
            <TrackForm />
          </div>
        </section>

        <section className="mt-24 grid sm:grid-cols-3 gap-4">
          <div className="card-paper p-5">
            <div className="text-3xl font-display text-brand-bridge">01</div>
            <div className="mt-3 font-semibold text-brand-ink">See your stage</div>
            <p className="mt-1 text-sm text-brand-ink/70">From consultation to university registration — visualized.</p>
          </div>
          <div className="card-paper p-5">
            <div className="text-3xl font-display text-brand-bridge">02</div>
            <div className="mt-3 font-semibold text-brand-ink">Download documents</div>
            <p className="mt-1 text-sm text-brand-ink/70">Offer letters, e-visa, EMGS — all in one place.</p>
          </div>
          <div className="card-paper p-5">
            <div className="text-3xl font-display text-brand-bridge">03</div>
            <div className="mt-3 font-semibold text-brand-ink">Upload receipts</div>
            <p className="mt-1 text-sm text-brand-ink/70">Submit payment screenshots — we'll review &amp; confirm.</p>
          </div>
        </section>

        <footer className="mt-24 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-brand-muted">
          <div>Need help? Message us on WhatsApp · +880 1749 913165</div>
          <a href="mailto:bridgetomalaysiabd@gmail.com" className="hover:text-brand-ink">bridgetomalaysiabd@gmail.com</a>
        </footer>
      </div>
    </main>
  );
}
