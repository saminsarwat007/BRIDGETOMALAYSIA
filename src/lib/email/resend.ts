import "server-only";
import { Resend } from "resend";

let cached: Resend | null = null;

function getClient() {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  cached = new Resend(key);
  return cached;
}

interface SendArgs {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendArgs) {
  const client = getClient();
  const from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  const replyTo = process.env.RESEND_REPLY_TO;

  return client.emails.send({
    from: `Bridge to Malaysia <${from}>`,
    to,
    subject,
    html,
    text,
    replyTo: replyTo ? [replyTo] : undefined,
  });
}
