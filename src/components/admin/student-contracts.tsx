"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Loader2,
  Trash2,
  FileText,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Student, Contract } from "@/types/database";
import {
  createContractAction,
  deleteContractAction,
  updateContractAction,
} from "@/app/admin/actions/contracts";

interface Props {
  student: Student;
  contracts: Contract[];
}

const DEFAULT_SERVICES = [
  "University application",
  "EMGS",
  "eVisa",
  "Flight ticketing",
  "Airport pickup",
  "Any financial transaction assistance",
];

export function StudentContracts({ student, contracts }: Props) {
  const [composer, setComposer] = useState(false);

  if (!student.contract_required && contracts.length === 0) {
    return (
      <div className="card-paper p-8 text-center">
        <p className="label-eyebrow">Contract not required</p>
        <p className="mt-2 text-sm text-brand-ink/70 max-w-md mx-auto">
          You marked this student as not needing a contract. You can still generate one anyway if needed.
        </p>
        <button onClick={() => setComposer(true)} className="btn-gold mt-5">
          Generate contract anyway
        </button>
        {composer && (
          <div className="mt-6 text-left">
            <ContractComposer
              student={student}
              onClose={() => setComposer(false)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <p className="text-sm text-brand-ink/70">
          {contracts.length === 0
            ? "No contract yet."
            : `${contracts.length} contract${contracts.length === 1 ? "" : "s"} on file`}
        </p>
        <button onClick={() => setComposer((v) => !v)} className="btn-gold text-sm">
          <Plus className="h-4 w-4" /> New contract
        </button>
      </div>

      {composer && (
        <ContractComposer
          student={student}
          onClose={() => setComposer(false)}
        />
      )}

      {contracts.map((contract) => (
        <ContractCard key={contract.id} student={student} contract={contract} />
      ))}
    </div>
  );
}

function ContractComposer({
  student,
  onClose,
  contract,
}: {
  student: Student;
  onClose: () => void;
  contract?: Contract;
}) {
  const f = (contract?.field_values ?? {}) as Record<string, any>;

  const [clientName, setClientName] = useState<string>(f.client_name ?? student.full_name);
  const [clientPassport, setClientPassport] = useState<string>(f.client_passport ?? student.passport_no ?? "");
  const [clientAddress, setClientAddress] = useState<string>(f.client_address ?? student.address ?? "");
  const [providerName, setProviderName] = useState<string>(f.provider_name ?? "Huzaifa Saoman");
  const [providerAddress, setProviderAddress] = useState<string>(
    f.provider_address ?? "191, Jalan Impian Emas 59, Taman Impian Emas, 81300 Skudai, Johor, Malaysia"
  );
  const [services, setServices] = useState<string[]>(
    Array.isArray(f.services) ? f.services : DEFAULT_SERVICES.slice(0, 5)
  );
  const [currency, setCurrency] = useState<string>(f.currency ?? "BDT");
  const [totalAmount, setTotalAmount] = useState<string>(String(f.total_amount ?? 0));
  const [securityDeposit, setSecurityDeposit] = useState<string>(String(f.security_deposit ?? 3000));
  const [universityFee, setUniversityFee] = useState<string>(f.university_fee ?? "RM 450");
  const [startDate, setStartDate] = useState<string>(
    f.start_date ?? new Date().toISOString().slice(0, 10)
  );
  const [contractDate, setContractDate] = useState<string>(
    f.contract_date ?? new Date().toISOString().slice(0, 10)
  );
  const [signatoryName, setSignatoryName] = useState<string>(f.signatory_name ?? "Huzaifa Saoman");
  const [signatoryRole, setSignatoryRole] = useState<string>(f.signatory_role ?? "CMO and Co-founder");
  const [signatureDate, setSignatureDate] = useState<string>(
    f.signature_date ?? new Date().toISOString().slice(0, 10)
  );
  const [customClauses, setCustomClauses] = useState<string>(f.custom_clauses ?? "");
  const [signatureImage, setSignatureImage] = useState<string>(f.signature_image ?? "");

  const [isPending, startTransition] = useTransition();

  function toggleService(s: string) {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function buildFieldValues() {
    return {
      client_name: clientName,
      client_passport: clientPassport,
      client_address: clientAddress,
      provider_name: providerName,
      provider_address: providerAddress,
      services,
      currency,
      total_amount: Number(totalAmount) || 0,
      security_deposit: Number(securityDeposit) || 0,
      university_fee: universityFee,
      start_date: startDate,
      contract_date: contractDate,
      signatory_name: signatoryName,
      signatory_role: signatoryRole,
      signature_date: signatureDate,
      custom_clauses: customClauses,
      signature_image: signatureImage || undefined,
    };
  }

  async function handleSignaturePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) {
      toast.error("Signature image is too large (max 1.5MB)");
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setSignatureImage(dataUrl);
    } catch {
      toast.error("Couldn't read that image");
    }
  }

  function handleSubmit() {
    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    startTransition(async () => {
      try {
        if (contract) {
          await updateContractAction(contract.id, { field_values: buildFieldValues() });
          toast.success("Contract updated");
          onClose();
        } else {
          const res = await createContractAction({
            student_id: student.id,
            field_values: buildFieldValues(),
          });
          toast.success(`Contract ${res.contract_number} created`);
          onClose();
          // Open the PDF in a new tab
          window.open(`/admin/contracts/${res.id}/pdf`, "_blank");
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save contract");
      }
    });
  }

  return (
    <div className="card-paper p-5 space-y-5 animate-fade-up">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="label-eyebrow">{contract ? "Edit contract" : "New contract"}</p>
          <h3 className="mt-1 font-display text-lg text-brand-ink">
            Service agreement
          </h3>
        </div>
      </div>

      <FieldSet legend="Client">
        <Row>
          <Field label="Full name" value={clientName} onChange={setClientName} required />
          <Field label="Passport no." value={clientPassport} onChange={setClientPassport} mono />
        </Row>
        <Textarea label="Address" value={clientAddress} onChange={setClientAddress} rows={2} />
      </FieldSet>

      <FieldSet legend="Service Provider">
        <Row>
          <Field label="Name" value={providerName} onChange={setProviderName} />
          <Field label="Signatory role" value={signatoryRole} onChange={setSignatoryRole} />
        </Row>
        <Textarea label="Address" value={providerAddress} onChange={setProviderAddress} rows={2} />
      </FieldSet>

      <FieldSet legend="Services">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DEFAULT_SERVICES.map((s) => (
            <label key={s} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={services.includes(s)}
                onChange={() => toggleService(s)}
                className="h-4 w-4 rounded border-brand-stone text-brand-bridge"
              />
              <span className="text-sm text-brand-ink">{s}</span>
            </label>
          ))}
        </div>
      </FieldSet>

      <FieldSet legend="Financials">
        <Row>
          <Field label="Currency" value={currency} onChange={setCurrency} placeholder="BDT / MYR / USD" />
          <Field
            label="Total amount"
            value={totalAmount}
            onChange={setTotalAmount}
            type="number"
            mono
          />
        </Row>
        <Row>
          <Field
            label="Refundable security deposit"
            value={securityDeposit}
            onChange={setSecurityDeposit}
            type="number"
            mono
          />
          <Field label="University application fee" value={universityFee} onChange={setUniversityFee} />
        </Row>
      </FieldSet>

      <FieldSet legend="Dates">
        <Row>
          <Field label="Contract date" value={contractDate} onChange={setContractDate} type="date" />
          <Field label="Services start date" value={startDate} onChange={setStartDate} type="date" />
        </Row>
        <Row>
          <Field
            label="Signature date"
            value={signatureDate}
            onChange={setSignatureDate}
            type="date"
          />
          <Field label="Signatory name" value={signatoryName} onChange={setSignatoryName} />
        </Row>
      </FieldSet>

      <FieldSet legend="Signature (optional)">
        <p className="text-xs text-brand-muted -mt-1">
          Upload a transparent-background PNG of the service-provider's signature. It will appear
          above the signature line on the contract. Re-upload anytime to change.
        </p>
        {signatureImage ? (
          <div className="rounded-md border border-brand-stone bg-brand-paper p-3 flex items-center gap-4">
            <div className="bg-white/70 rounded p-2 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={signatureImage}
                alt="Signature preview"
                className="h-16 object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 text-sm">
              <div className="font-medium text-brand-ink">Signature attached</div>
              <div className="text-xs text-brand-muted">
                Shown above the signature line on the contract PDF
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSignatureImage("")}
              className="text-xs text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-brand-stone bg-brand-cream/40 py-6 px-4 hover:bg-brand-cream transition">
            <span className="text-sm text-brand-ink">Upload signature image</span>
            <span className="text-xs text-brand-muted">PNG, JPG (transparent background recommended)</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleSignaturePick}
              className="hidden"
            />
          </label>
        )}
      </FieldSet>

      <FieldSet legend="Custom clauses (optional)">
        <Textarea
          label=""
          value={customClauses}
          onChange={setCustomClauses}
          rows={3}
          placeholder="Anything special you want added to this specific contract"
        />
      </FieldSet>

      <div className="flex justify-end gap-2 pt-3 border-t border-brand-stone">
        <button onClick={onClose} className="btn-ghost border border-brand-stone">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={isPending} className="btn-gold">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </>
          ) : contract ? (
            "Save changes"
          ) : (
            "Create & download"
          )}
        </button>
      </div>
    </div>
  );
}

function ContractCard({ student, contract }: { student: Student; contract: Contract }) {
  const [edit, setEdit] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function markSigned() {
    startTransition(async () => {
      await updateContractAction(contract.id, { signed: !contract.signed });
      toast.success(contract.signed ? "Marked unsigned" : "Marked signed");
    });
  }

  async function remove() {
    if (!confirm("Delete this contract?")) return;
    startTransition(async () => {
      await deleteContractAction(contract.id, student.id);
      toast.success("Contract deleted");
    });
  }

  if (edit) {
    return <ContractComposer student={student} contract={contract} onClose={() => setEdit(false)} />;
  }

  return (
    <article className="card-paper p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-brand-muted">{contract.contract_number}</span>
            {contract.signed && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Signed
              </span>
            )}
          </div>
          <h3 className="mt-1 font-display text-lg text-brand-ink">Service agreement</h3>
          <p className="text-xs text-brand-muted">
            Generated {formatDate(contract.generated_at)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/admin/contracts/${contract.id}/pdf`}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-stone bg-brand-paper px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-cream transition"
        >
          <Download className="h-3.5 w-3.5" /> Download PDF
        </Link>
        <button
          onClick={() => setEdit(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-brand-stone bg-brand-paper px-3 py-1.5 text-xs font-medium text-brand-ink hover:bg-brand-cream transition"
        >
          <FileText className="h-3.5 w-3.5" /> Edit fields
        </button>
        <button
          onClick={markSigned}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand-ink text-brand-paper px-3 py-1.5 text-xs font-medium hover:bg-brand-bridge transition"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {contract.signed ? "Mark unsigned" : "Mark signed"}
        </button>
        <button
          onClick={remove}
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-brand-muted hover:text-rose-600 transition"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </article>
  );
}

// ---------- shared form primitives ----------

function FieldSet({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label-eyebrow mb-3">{legend}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-brand-ink">
          {label}
          {required && <span className="text-brand-bridge ml-1">*</span>}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`input-paper ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-medium text-brand-ink">{label}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="input-paper resize-none"
      />
    </label>
  );
}
