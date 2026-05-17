"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "tracking", label: "Tracking" },
  { id: "documents", label: "Documents" },
  { id: "invoices", label: "Invoices & Payments" },
  { id: "refunds", label: "Refunds" },
  { id: "contracts", label: "Contract" },
  { id: "notes", label: "Notes" },
  { id: "details", label: "Details" },
];

export function StudentTabs({ current, studentId }: { current: string; studentId: string }) {
  return (
    <nav className="mt-8 border-b border-brand-stone overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = current === t.id;
          return (
            <li key={t.id}>
              <Link
                href={`/admin/students/${studentId}?tab=${t.id}`}
                scroll={false}
                className={cn(
                  "inline-flex px-4 py-2.5 text-sm transition border-b-2 -mb-px",
                  active
                    ? "border-brand-bridge text-brand-ink font-medium"
                    : "border-transparent text-brand-ink/60 hover:text-brand-ink"
                )}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
