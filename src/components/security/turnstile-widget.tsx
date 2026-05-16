"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Cloudflare Turnstile widget. Loads the Cloudflare API script once per page,
 * renders explicitly into a div we control, and notifies the parent of token
 * changes via callbacks. Gracefully no-ops if no site key is set so the form
 * still works in environments without Turnstile configured.
 */

interface TurnstileApi {
  render: (
    el: string | HTMLElement,
    options: {
      sitekey: string;
      callback?: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      size?: "normal" | "compact" | "flexible";
      action?: string;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __turnstileLoaders?: Array<() => void>;
    __turnstileOnLoad?: () => void;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__turnstileOnLoad&render=explicit";

function ensureScriptLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.__turnstileLoaders = window.__turnstileLoaders || [];
    window.__turnstileLoaders.push(resolve);

    if (!window.__turnstileOnLoad) {
      window.__turnstileOnLoad = () => {
        for (const fn of window.__turnstileLoaders ?? []) fn();
        window.__turnstileLoaders = [];
      };
    }

    if (document.querySelector(`script[data-turnstile="true"]`)) return;
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.dataset.turnstile = "true";
    document.head.appendChild(s);
  });
}

export interface TurnstileWidgetProps {
  /** Public site key (NEXT_PUBLIC_TURNSTILE_SITE_KEY). If missing, render nothing. */
  siteKey?: string;
  /** Called with the new token whenever Turnstile resolves. */
  onToken: (token: string) => void;
  /** Called when the token expires or the widget errors out. */
  onExpire?: () => void;
  /** Optional action label (shows up in Cloudflare analytics). */
  action?: string;
  /** Visual theme; defaults to auto. */
  theme?: "light" | "dark" | "auto";
}

export function TurnstileWidget({
  siteKey,
  onToken,
  onExpire,
  action,
  theme = "auto",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const fallbackId = useId();

  // Keep latest callbacks without re-rendering the widget.
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    ensureScriptLoaded().then(() => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          action,
          callback: (token) => onTokenRef.current?.(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onExpireRef.current?.(),
          "timeout-callback": () => onExpireRef.current?.(),
        });
      } catch (e) {
        console.error("[turnstile] render failed", e);
      }
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget may already be gone */
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, action]);

  if (!siteKey) {
    return null;
  }
  return (
    <div
      ref={containerRef}
      id={`cf-turnstile-${fallbackId.replace(/:/g, "")}`}
      className="cf-turnstile"
    />
  );
}
