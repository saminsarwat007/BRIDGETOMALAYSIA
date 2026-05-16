"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, getCurrentAdminId } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { emailTemplates } from "@/lib/email/templates";
import { buildInvoiceFilename, formatCurrency } from "@/lib/utils";
import { renderAndUploadPdf } from "@/lib/pdf/pdf-to-drive";
import { InvoicePDF } from "@/lib/pdf/invoice-pdf";
import React from "react";

const LineItemSchema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().min(0),
  quantity: z.coerce.number().min(1).default(1),
});

const InvoiceSchema = z.object({
  student_id: z.string().uuid(),
  invoice_type: z.string().min(1),
  currency: z.string().default("BDT"),
  due_date: z.string().optional().nullable(),
  line_items: z.array(LineItemSchema).min(1),
  field_values: z.record(z.unknown()).default({}),
  status: z.enum(["draft", "sent"]).default("draft"),
});

export type InvoiceInput = z.infer<typeof InvoiceSchema>;

export async function createInvoiceAction(input: InvoiceInput) {
  const parsed = InvoiceSchema.parse(input);

  const supabase = createClient();

  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id, full_name, email, passport_no, drive_folder_id, drive_folder_url, invoice_subfolder_id, address, phone, university, campus, intake")
    .eq("id", parsed.student_id)
    .single();
  if (stuErr || !student) throw new Error("Student not found");

  // Generate invoice number BTM-YYYY-####
  const year = new Date().getFullYear();
  const { data: nextNum, error: numErr } = await supabase.rpc("next_number", {
    p_scope: `invoice_${year}`,
  });
  if (numErr) throw new Error(numErr.message);
  const padded = String(nextNum).padStart(4, "0");
  const invoiceNumber = `BTM-${year}-${padded}`;

  const total = parsed.line_items.reduce(
    (s, li) => s + li.amount * (li.quantity ?? 1),
    0
  );

  const pdfFilename = buildInvoiceFilename(student.full_name, parsed.invoice_type);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      student_id: parsed.student_id,
      invoice_number: invoiceNumber,
      invoice_type: parsed.invoice_type,
      currency: parsed.currency,
      due_date: parsed.due_date || null,
      line_items: parsed.line_items,
      field_values: parsed.field_values,
      total_amount: total,
      status: parsed.status,
      pdf_filename: pdfFilename,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (parsed.status === "sent" && student.email) {
    const trackingUrl =
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/track/${encodeURIComponent(student.passport_no ?? "")}`;
    const tpl = emailTemplates.invoiceCreated({
      studentName: student.full_name,
      invoiceNumber,
      amount: formatCurrency(total, parsed.currency),
      description: parsed.invoice_type,
      trackingUrl,
    });
    try {
      await sendEmail({ to: student.email, ...tpl });
    } catch (err) {
      console.error("invoice email failed", err);
    }
  }

  // Generate PDF and upload to Google Drive (non-blocking — failures don't break the action)
  const invoiceRecord = {
    ...parsed,
    id: data.id,
    invoice_number: invoiceNumber,
    total_amount: total,
    pdf_filename: pdfFilename,
    field_values: parsed.field_values,
    line_items: parsed.line_items,
    status: parsed.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    drive_file_id: null,
    drive_link: null,
  };
  try {
    const pdfElement = React.createElement(InvoicePDF, {
      invoice: invoiceRecord as any,
      student: student as any,
      payments: [],
    });
    await renderAndUploadPdf({
      student,
      pdfElement,
      filename: pdfFilename,
      subfolder: "Invoice and Receipt",
      table: "invoices",
      recordId: data.id,
    });
  } catch (e) {
    console.error("Invoice PDF Drive upload failed (non-blocking):", e);
  }

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/students/${parsed.student_id}`);
  return { ok: true, id: data.id, invoice_number: invoiceNumber };
}

export async function updateInvoiceAction(
  id: string,
  input: Partial<InvoiceInput> & { status?: string }
) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.invoice_type !== undefined) patch.invoice_type = input.invoice_type;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.due_date !== undefined) patch.due_date = input.due_date || null;
  if (input.line_items !== undefined) {
    patch.line_items = input.line_items;
    patch.total_amount = input.line_items.reduce(
      (s: number, li: any) => s + Number(li.amount) * Number(li.quantity ?? 1),
      0
    );
  }
  if (input.field_values !== undefined) patch.field_values = input.field_values;
  if (input.status !== undefined) patch.status = input.status;

  const { error } = await supabase.from("invoices").update(patch).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/invoices");
  return { ok: true };
}

const PaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount_received: z.coerce.number().min(0),
  payment_date: z.string(),
  payment_method: z.string().optional().nullable(),
  bank_reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receipt_drive_link: z.string().url().optional().or(z.literal("")).nullable(),
});

export async function recordPaymentAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = PaymentSchema.parse(raw);

  const supabase = createClient();
  const adminId = await getCurrentAdminId();

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("id, student_id, total_amount, currency, invoice_number, students(full_name, email, passport_no)")
    .eq("id", parsed.invoice_id)
    .single();
  if (invErr || !invoice) throw new Error("Invoice not found");

  const { error: payErr } = await supabase.from("payments").insert({
    invoice_id: parsed.invoice_id,
    student_id: invoice.student_id,
    amount_received: parsed.amount_received,
    payment_date: parsed.payment_date,
    payment_method: parsed.payment_method || null,
    bank_reference: parsed.bank_reference || null,
    notes: parsed.notes || null,
    receipt_drive_link: parsed.receipt_drive_link || null,
    source: "admin",
    status: "approved",
    recorded_by: adminId,
  });
  if (payErr) throw new Error(payErr.message);

  await recomputeInvoiceStatus(parsed.invoice_id);

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${parsed.invoice_id}`);
  revalidatePath(`/admin/students/${invoice.student_id}`);
}

export async function approvePaymentAction(paymentId: string) {
  const supabase = createClient();
  const { data: payment, error } = await supabase
    .from("payments")
    .select("id, invoice_id, student_id")
    .eq("id", paymentId)
    .single();
  if (error || !payment) throw new Error("Payment not found");

  const { error: updErr } = await supabase
    .from("payments")
    .update({ status: "approved" })
    .eq("id", paymentId);
  if (updErr) throw new Error(updErr.message);

  await recomputeInvoiceStatus(payment.invoice_id);

  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/students/${payment.student_id}`);
}

export async function rejectPaymentAction(paymentId: string) {
  const supabase = createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, invoice_id, student_id")
    .eq("id", paymentId)
    .single();

  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected" })
    .eq("id", paymentId);
  if (error) throw new Error(error.message);

  if (payment?.invoice_id) await recomputeInvoiceStatus(payment.invoice_id);

  revalidatePath("/admin/invoices");
  if (payment?.student_id) revalidatePath(`/admin/students/${payment.student_id}`);
}

async function recomputeInvoiceStatus(invoiceId: string) {
  const supabase = createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total_amount")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return;

  const { data: pays } = await supabase
    .from("payments")
    .select("amount_received, status")
    .eq("invoice_id", invoiceId)
    .eq("status", "approved");

  const totalPaid = (pays ?? []).reduce(
    (s, p) => s + Number(p.amount_received),
    0
  );

  let status: string = "sent";
  if (totalPaid <= 0) status = "sent";
  else if (totalPaid < Number(invoice.total_amount)) status = "partially_paid";
  else if (totalPaid > Number(invoice.total_amount)) status = "overpaid";
  else status = "paid";

  await supabase.from("invoices").update({ status }).eq("id", invoiceId);
}

export async function deleteInvoiceAction(id: string, studentId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/students/${studentId}`);
}
