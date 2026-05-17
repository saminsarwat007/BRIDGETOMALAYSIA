"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const AccountSchema = z.object({
  key: z.enum(["bangladesh_bdt", "malaysia_myr"]),
  opening_balance: z.coerce.number(),
  notes: z.string().optional().nullable(),
});

export async function updateCompanyAccountAction(formData: FormData) {
  const parsed = AccountSchema.parse({
    key: formData.get("key"),
    opening_balance: formData.get("opening_balance"),
    notes: formData.get("notes"),
  });

  const supabase = createClient();
  const { error } = await supabase
    .from("company_accounts")
    .update({
      opening_balance: parsed.opening_balance,
      notes: parsed.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("key", parsed.key);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/finance");
}
