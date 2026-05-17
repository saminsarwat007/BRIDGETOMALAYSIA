"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const CommissionSchema = z.object({
  student_id: z.string().uuid().nullable().optional(),
  university: z.string().min(1, "University is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.enum(["BDT", "MYR"]),
  company_account_key: z.string().nullable().optional(),
  received_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

function accountForCurrency(currency: "BDT" | "MYR") {
  return currency === "BDT" ? "bangladesh_bdt" : "malaysia_myr";
}

export async function createCommissionAction(data: unknown) {
  const supabase = createClient();
  const parsed = CommissionSchema.parse(data);
  const row = {
    ...parsed,
    company_account_key: parsed.company_account_key ?? accountForCurrency(parsed.currency),
  };
  const { error } = await supabase.from("commissions").insert(row);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/commissions");
  revalidatePath("/admin/finance");
}

export async function updateCommissionAction(id: string, data: unknown) {
  const supabase = createClient();
  const parsed = CommissionSchema.partial().parse(data);
  if (parsed.currency && !parsed.company_account_key) {
    parsed.company_account_key = accountForCurrency(parsed.currency);
  }
  const { error } = await supabase.from("commissions").update(parsed).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/commissions");
  revalidatePath("/admin/finance");
}

export async function deleteCommissionAction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("commissions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/commissions");
  revalidatePath("/admin/finance");
}
