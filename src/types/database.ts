/**
 * Database row types. These mirror supabase/schema.sql.
 * Update both when changing the schema.
 */

export type StudentStage =
  | "initial_consultation"
  | "university_application"
  | "offer_letter_received"
  | "emgs_processing"
  | "visa_application"
  | "tuition_fee_payment"
  | "flight_booking"
  | "airport_pickup"
  | "medical_check"
  | "university_registration";

export type DocStatus = "pending" | "received" | "rejected";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overpaid"
  | "cancelled";

export type PaymentSource = "admin" | "student";
export type PaymentStatus = "pending" | "approved" | "rejected";

export type AttachmentKind =
  | "offer_letter"
  | "evisa"
  | "emgs_approval"
  | "tuition_receipt"
  | "visa"
  | "medical"
  | "flight_ticket"
  | "other";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  passport_no: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  university: string | null;
  campus: string | null;
  intake: string | null;
  subject_1: string | null;
  subject_2: string | null;
  drive_folder_url: string | null;
  drive_folder_id: string | null;
  invoice_subfolder_id: string | null;
  contract_required: boolean;
  current_stage: StudentStage;
  notes: string | null;
  referred_by_name: string | null;
  referred_by_phone: string | null;
  upload_enabled: boolean;
  whatsapp_group_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  student_id: string;
  doc_type: string;
  status: DocStatus;
  rejection_reason: string | null;
  drive_link: string | null;
  updated_at: string;
}

export interface Contract {
  id: string;
  student_id: string;
  contract_number: string;
  field_values: Record<string, unknown>;
  signed: boolean;
  signed_at: string | null;
  signed_ip: string | null;
  drive_file_id: string | null;
  drive_link: string | null;
  generated_at: string;
  notes: string | null;
}

export interface InvoiceLineItem {
  description: string;
  amount: number;
  quantity?: number;
}

export interface Invoice {
  id: string;
  student_id: string;
  invoice_number: string;
  invoice_type: string;
  field_values: Record<string, unknown>;
  line_items: InvoiceLineItem[];
  total_amount: number;
  currency: string;
  status: InvoiceStatus;
  due_date: string | null;
  drive_file_id: string | null;
  drive_link: string | null;
  pdf_filename: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  student_id: string;
  amount_received: number;
  payment_date: string;
  payment_method: string | null;
  bank_reference: string | null;
  description: string | null;
  receipt_drive_file_id: string | null;
  receipt_drive_link: string | null;
  source: PaymentSource;
  status: PaymentStatus;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  student_id: string;
  referrer_name: string;
  referrer_phone: string | null;
  commission_amount: number;
  commission_currency: string;
  paid: boolean;
  paid_on: string | null;
  notes: string | null;
  created_at: string;
}

export interface Commission {
  id: string;
  student_id: string | null;
  university: string;
  amount: number;
  currency: string;
  received_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface StageHistory {
  id: string;
  student_id: string;
  stage: StudentStage;
  comment: string | null;
  attachment_label: string | null;
  attachment_kind: AttachmentKind | null;
  attachment_drive_link: string | null;
  notify_student: boolean;
  changed_by: string | null;
  changed_at: string;
}

export interface TrackingPayload {
  student: {
    id: string;
    full_name: string;
    current_stage: StudentStage;
    university: string | null;
    campus: string | null;
    intake: string | null;
    upload_enabled: boolean;
    whatsapp_group_url: string | null;
  };
  invoices: Array<{
    id: string;
    invoice_number: string;
    invoice_type: string;
    total_amount: number;
    currency: string;
    status: InvoiceStatus;
    due_date: string | null;
    created_at: string;
    total_paid: number;
  }>;
  stage_history: Array<{
    id: string;
    stage: StudentStage;
    comment: string | null;
    attachment_label: string | null;
    attachment_kind: AttachmentKind | null;
    attachment_drive_link: string | null;
    changed_at: string;
  }>;
  contracts: Array<{
    id: string;
    contract_number: string;
    signed: boolean;
    signed_at: string | null;
    generated_at: string;
  }>;
}
