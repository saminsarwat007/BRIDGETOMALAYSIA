import "server-only";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Setup:
 *   1. Create a Turnstile site at https://dash.cloudflare.com/?to=/:account/turnstile
 *   2. Add your domain (use `*` for local dev, or list `localhost`).
 *   3. Set env:
 *        NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key — exposed to the browser>
 *        TURNSTILE_SECRET_KEY=<secret — server only>
 *
 * Cloudflare provides a pair of test keys that always pass / always fail —
 * useful for CI:
 *   pass site:    1x00000000000000000000AA
 *   pass secret:  1x0000000000000000000000000000000AA
 *   fail secret:  2x0000000000000000000000000000000AA
 */

export interface TurnstileResult {
  ok: boolean;
  /** True when no secret is configured and we silently allowed the request. */
  bypassed: boolean;
  /** Cloudflare error codes (e.g. "missing-input-secret"). */
  errorCodes?: string[];
  /** Human-readable summary suitable for a JSON error response. */
  message?: string;
}

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Turnstile token against Cloudflare. Returns `{ ok: true, bypassed: true }`
 * when no `TURNSTILE_SECRET_KEY` is configured, so local dev works out of the box.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  // ── Dev / unconfigured path ────────────────────────────────────────────────
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      // In production we refuse to silently bypass — that would defeat the
      // whole point of having Turnstile.
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY missing in production. Refusing all requests."
      );
      return {
        ok: false,
        bypassed: false,
        message: "CAPTCHA is not configured on the server.",
      };
    }
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY not set — bypassing CAPTCHA (dev only)."
      );
    }
    return { ok: true, bypassed: true };
  }

  if (!token || !token.trim()) {
    return {
      ok: false,
      bypassed: false,
      errorCodes: ["missing-input-response"],
      message: "Please complete the CAPTCHA.",
    };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  let json: {
    success: boolean;
    "error-codes"?: string[];
    challenge_ts?: string;
    hostname?: string;
  };
  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Tight timeout so a CAPTCHA outage doesn't hang submissions for 30s.
      signal: AbortSignal.timeout(8_000),
    });
    json = (await res.json()) as typeof json;
  } catch (e) {
    console.error("[turnstile] verification request failed", e);
    return {
      ok: false,
      bypassed: false,
      errorCodes: ["verification-failed"],
      message: "Couldn't verify CAPTCHA — please try again.",
    };
  }

  if (!json.success) {
    return {
      ok: false,
      bypassed: false,
      errorCodes: json["error-codes"] ?? [],
      message: "CAPTCHA verification failed — please retry.",
    };
  }

  return { ok: true, bypassed: false };
}

/** True if the public site key is set, i.e. the widget should render. */
export function turnstileEnabledClient(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}
