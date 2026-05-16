"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

export function TrackForm() {
  const router = useRouter();
  const [passport, setPassport] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = passport.trim();
    if (!value) return;
    startTransition(() => {
      router.push(`/track/${encodeURIComponent(value)}`);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="passport" className="block text-sm font-medium text-brand-ink">
        Passport number
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id="passport"
          type="text"
          autoFocus
          required
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={passport}
          onChange={(e) => setPassport(e.target.value.toUpperCase())}
          className="input-paper sm:flex-1 font-mono text-base tracking-wider"
          placeholder="e.g. EH1234567"
        />
        <button type="submit" disabled={isPending} className="btn-gold sm:w-auto">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Looking up…
            </>
          ) : (
            <>
              Track <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      <p className="text-xs text-brand-muted">
        Use the same passport number you shared with our team during onboarding.
      </p>
    </form>
  );
}
