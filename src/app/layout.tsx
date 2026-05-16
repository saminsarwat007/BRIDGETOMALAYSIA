import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

export const metadata: Metadata = {
  title: "Bridge to Malaysia — Student Portal",
  description:
    "Helping Bangladeshi students study in Malaysia. Track your application, view invoices, and stay in touch.",
  icons: { icon: "/logo.jpg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable}`}
    >
      <body>
        {children}
        <Toaster
          richColors
          theme="light"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "rounded-xl border border-brand-stone bg-brand-paper text-brand-ink shadow-lg",
            },
          }}
        />
      </body>
    </html>
  );
}
