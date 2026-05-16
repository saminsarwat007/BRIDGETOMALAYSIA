import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Search } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen paper grain">
      <div className="relative mx-auto max-w-6xl px-6 pt-14 pb-24">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.jpg" alt="Bridge to Malaysia" width={48} height={48} className="rounded-md" />
            <div className="leading-tight">
              <div className="font-display text-xl text-brand-ink">Bridge to Malaysia</div>
              <div className="text-[11px] tracking-[0.2em] uppercase text-brand-muted">Student Portal</div>
            </div>
          </div>
          <Link href="/login" className="btn-ghost">Admin sign in</Link>
        </header>

        <section className="mt-20 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7">
            <p className="label-eyebrow">For students currently with us</p>
            <h1 className="mt-3 font-display text-5xl sm:text-6xl leading-[1.02] text-brand-ink">
              Your journey,
              <br />
              <span className="text-brand-bridge italic">tracked beautifully.</span>
            </h1>
            <p className="mt-6 text-lg text-brand-ink/80 max-w-xl leading-relaxed">
              Check the status of your application, view your offer letter, visa documents, and submit payment receipts — all in one place.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/start" className="btn-gold">
                Start my application
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 rounded-full border border-brand-stone bg-brand-paper px-5 py-2.5 text-sm font-medium text-brand-ink hover:bg-brand-cream transition"
              >
                Track my application
              </Link>
              <a
                href="https://wa.me/8801749913165"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-brand-bridge hover:text-brand-ink transition"
              >
                Or WhatsApp us
              </a>
            </div>
          </div>

          <aside className="lg:col-span-5 lg:mt-2">
            <div className="card-paper p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-brand-gold/15 p-2.5">
                  <ShieldCheck className="h-5 w-5 text-brand-bridge" />
                </div>
                <div>
                  <div className="font-semibold text-brand-ink">Private &amp; verified</div>
                  <p className="text-sm text-brand-ink/70 mt-1">
                    You'll need your passport number to access your tracking page. Only you and our team can see it.
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-start gap-3">
                <div className="rounded-lg bg-brand-gold/15 p-2.5">
                  <Search className="h-5 w-5 text-brand-bridge" />
                </div>
                <div>
                  <div className="font-semibold text-brand-ink">Always up to date</div>
                  <p className="text-sm text-brand-ink/70 mt-1">
                    See your current stage, comments from us, and download every document we've issued you.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-brand-muted">
              New to Bridge to Malaysia? Message us on WhatsApp — we'll set you up.
            </p>
          </aside>
        </section>

        <footer className="mt-32 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-brand-muted">
          <div>© {new Date().getFullYear()} Bridge to Malaysia · Bangladesh ↔ Malaysia</div>
          <div className="flex gap-4">
            <a href="mailto:bridgetomalaysiabd@gmail.com" className="hover:text-brand-ink">bridgetomalaysiabd@gmail.com</a>
            <span className="text-brand-stone">·</span>
            <span>+880 1749 913165</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
