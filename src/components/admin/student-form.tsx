"use client";

import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PassportScanner } from "@/components/passport-scanner";
import type { PassportData } from "@/lib/ai/gemini";
import type { Student } from "@/types/database";
import { universitiesByType } from "@/lib/universities";
import {
  createStudentAction,
  updateStudentAction,
  type StudentFormState,
} from "@/app/admin/actions/students";

interface Props {
  mode: "create" | "edit";
  student?: Student;
}

export function StudentForm({ mode, student }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const initialState: StudentFormState = null;

  const action =
    mode === "create"
      ? createStudentAction
      : updateStudentAction.bind(null, student!.id);

  const [state, formAction] = useFormState<StudentFormState, FormData>(
    action,
    initialState
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(mode === "create" ? "Student added" : "Saved");
      router.push(`/admin/students/${state.id}`);
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state, mode, router]);

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      formAction(formData);
    });
  }

  const fe = (key: string) =>
    state && !state.ok ? state.fieldErrors?.[key] : undefined;

  function handlePassportScan(data: PassportData) {
    const form = formRef.current;
    if (!form) return;
    const set = (name: string, value: string | null) => {
      if (!value) return;
      const el = form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el) {
        // Trigger React's internal value tracking
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        )?.set ?? Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value"
        )?.set;
        nativeInputValueSetter?.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    set("full_name", data.full_name);
    set("passport_no", data.passport_no);
    set("address", data.address);
    set("phone", data.phone);
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-8">
      {mode === "create" && (
        <PassportScanner onExtracted={handlePassportScan} />
      )}
      <FieldSet legend="Personal">
        <Row>
          <Field label="Full name" name="full_name" required defaultValue={student?.full_name} error={fe("full_name")} />
          <Field label="Passport number" name="passport_no" defaultValue={student?.passport_no ?? ""} placeholder="e.g. EH1234567" mono />
        </Row>
        <Row>
          <Field label="Email" name="email" type="email" defaultValue={student?.email ?? ""} error={fe("email")} />
          <Field label="Phone" name="phone" defaultValue={student?.phone ?? ""} placeholder="+880…" />
        </Row>
        <Textarea label="Address" name="address" defaultValue={student?.address ?? ""} rows={2} />
      </FieldSet>

      <FieldSet legend="Application">
        <Row>
          <UniversitySelect name="university" defaultValue={student?.university ?? ""} />
          <Field label="Campus" name="campus" defaultValue={student?.campus ?? ""} />
        </Row>
        <Row>
          <Field label="Intake" name="intake" defaultValue={student?.intake ?? ""} placeholder="e.g. February 2026" />
          <div />
        </Row>
        <Row>
          <Field label="Subject choice 1" name="subject_1" defaultValue={student?.subject_1 ?? ""} />
          <Field label="Subject choice 2" name="subject_2" defaultValue={student?.subject_2 ?? ""} />
        </Row>
      </FieldSet>

      <FieldSet legend="Drive folder & access">
        <Field
          label="Google Drive folder URL"
          name="drive_folder_url"
          defaultValue={student?.drive_folder_url ?? ""}
          placeholder="https://drive.google.com/drive/folders/…"
          help="Used to store generated invoices, contracts, and student-uploaded receipts."
          error={fe("drive_folder_url")}
        />
        <div className="flex flex-wrap gap-6">
          <Toggle
            name="contract_required"
            label="Contract required"
            defaultChecked={student?.contract_required ?? true}
          />
          <Toggle
            name="upload_enabled"
            label="Allow student to upload receipts"
            defaultChecked={student?.upload_enabled ?? true}
          />
        </div>
      </FieldSet>

      <FieldSet legend="Referral (optional)">
        <Row>
          <Field
            label="Referred by — name"
            name="referred_by_name"
            defaultValue={student?.referred_by_name ?? ""}
          />
          <Field
            label="Referred by — phone"
            name="referred_by_phone"
            defaultValue={student?.referred_by_phone ?? ""}
          />
        </Row>
      </FieldSet>

      <FieldSet legend="Notes">
        <Textarea label="Internal notes" name="notes" defaultValue={student?.notes ?? ""} rows={3} />
      </FieldSet>

      <div className="flex justify-end gap-3 pt-4 border-t border-brand-stone">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-ghost border border-brand-stone"
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-gold">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : mode === "create" ? (
            "Add student"
          ) : (
            "Save changes"
          )}
        </button>
      </div>
    </form>
  );
}

function FieldSet({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <fieldset className="card-paper p-5">
      <legend className="label-eyebrow px-2">{legend}</legend>
      <div className="mt-4 space-y-4">{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  help,
  error,
  mono,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
  error?: string;
  mono?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-brand-ink">
        {label}
        {required && <span className="text-brand-bridge ml-1">*</span>}
      </span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={`input-paper ${mono ? "font-mono tracking-wider" : ""} ${error ? "border-rose-400" : ""}`}
      />
      {help && <span className="text-xs text-brand-muted">{help}</span>}
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </label>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-brand-ink">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="input-paper resize-none"
      />
    </label>
  );
}

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-brand-stone text-brand-bridge focus:ring-brand-gold"
      />
      <span className="text-sm text-brand-ink">{label}</span>
    </label>
  );
}

function UniversitySelect({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const groups = universitiesByType();
  const known = Object.values(groups)
    .flat()
    .map((u) => u.name);
  const isCustom = defaultValue && !known.includes(defaultValue);

  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-brand-ink">University</span>
      <select
        name={name}
        defaultValue={isCustom ? "__custom__" : defaultValue ?? ""}
        className="input-paper bg-brand-paper appearance-none"
      >
        <option value="">— Not selected —</option>
        <optgroup label="Public">
          {groups["Public"].map((u) => (
            <option key={u.name} value={u.name}>
              {u.name} ({u.short})
            </option>
          ))}
        </optgroup>
        <optgroup label="Private">
          {groups["Private"].map((u) => (
            <option key={u.name} value={u.name}>
              {u.name} ({u.short})
            </option>
          ))}
        </optgroup>
        <optgroup label="International branch">
          {groups["International Branch"].map((u) => (
            <option key={u.name} value={u.name}>
              {u.name} ({u.short})
            </option>
          ))}
        </optgroup>
        {isCustom && (
          <option value={defaultValue}>{defaultValue} (custom)</option>
        )}
        <option value="Other">Other / not listed</option>
      </select>
    </label>
  );
}
