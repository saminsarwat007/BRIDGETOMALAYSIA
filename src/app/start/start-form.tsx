"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Pencil,
  Upload,
  X,
  Paperclip,
  Info,
} from "lucide-react";
import { universitiesByType } from "@/lib/universities";
import { REQUIRED_DOCUMENTS, type DocumentGuideline } from "@/lib/documents";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { PassportScanner } from "@/components/passport-scanner";
import type { PassportData } from "@/lib/ai/gemini";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Compress an image File to JPEG at max 1400px / 75% quality. PDFs pass through unchanged. */
async function compressFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file),
        "image/jpeg", 0.75
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

interface FormData {
  full_name: string;
  passport_no: string;
  email: string;
  phone: string;
  address: string;
  university: string;
  campus: string;
  intake: string;
  subject_1: string;
  subject_2: string;
  referred_by_name: string;
  referred_by_phone: string;
  notes: string;
}

const EMPTY: FormData = {
  full_name: "",
  passport_no: "",
  email: "",
  phone: "",
  address: "",
  university: "",
  campus: "",
  intake: "",
  subject_1: "",
  subject_2: "",
  referred_by_name: "",
  referred_by_phone: "",
  notes: "",
};

type Step = "details" | "documents" | "preview" | "done";
type DocFiles = Record<string, File | null>;

export function StartForm() {
  const [data, setData] = useState<FormData>(EMPTY);
  const [docs, setDocs] = useState<DocFiles>({});
  const [extras, setExtras] = useState<File[]>([]);
  const [step, setStep] = useState<Step>("details");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function setDocFile(key: string, file: File | null) {
    setDocs((d) => ({ ...d, [key]: file }));
  }

  function addExtras(files: FileList | null) {
    if (!files) return;
    setExtras((prev) => [...prev, ...Array.from(files)].slice(0, 10));
  }

  function removeExtra(idx: number) {
    setExtras((prev) => prev.filter((_, i) => i !== idx));
  }

  function goTo(next: Step) {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function detailsNext(e: React.FormEvent) {
    e.preventDefault();
    goTo("documents");
  }

  function submit() {
    startTransition(async () => {
      const fd = new window.FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, v));

      // Documents: compress images before upload to stay under Vercel's 4.5 MB body limit
      for (const [k, file] of Object.entries(docs)) {
        if (file) {
          const compressed = await compressFile(file);
          fd.append(`document__${k}`, compressed, compressed.name);
        }
      }

      // Extra attachments: compress images too
      for (const f of extras) {
        const compressed = await compressFile(f);
        fd.append("attachment", compressed, compressed.name);
      }

      // Turnstile token — server falls back to dev-bypass if no secret is set
      if (captchaToken) fd.append("cf-turnstile-response", captchaToken);

      try {
        const res = await fetch("/api/public/intake", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          toast.error(json.error ?? "Something went wrong");
          // CAPTCHA tokens are single-use — clear so the user can re-solve
          setCaptchaToken(null);
          return;
        }
        goTo("done");
      } catch {
        toast.error("Network error — please try again");
        setCaptchaToken(null);
      }
    });
  }

  if (step === "done") return <DoneView />;

  if (step === "preview")
    return (
      <PreviewView
        data={data}
        docs={docs}
        extras={extras}
        isPending={isPending}
        captchaToken={captchaToken}
        onCaptchaToken={setCaptchaToken}
        onEditDetails={() => goTo("details")}
        onEditDocs={() => goTo("documents")}
        onSubmit={submit}
      />
    );

  if (step === "documents")
    return (
      <DocumentsView
        firstName={data.full_name.trim().split(/\s+/)[0] || "your"}
        docs={docs}
        setDocFile={setDocFile}
        extras={extras}
        addExtras={addExtras}
        removeExtra={removeExtra}
        onBack={() => goTo("details")}
        onNext={() => goTo("preview")}
      />
    );

  function handlePassportScan(extracted: PassportData) {
    if (extracted.full_name) update("full_name", extracted.full_name);
    if (extracted.passport_no) update("passport_no", extracted.passport_no);
    if (extracted.address) update("address", extracted.address);
    if (extracted.phone) update("phone", extracted.phone);
  }

  return <EditView data={data} update={update} onNext={detailsNext} onPassportScan={handlePassportScan} />;
}

// -- Step 1: Edit ------------------------------------------------------------

function EditView({
  data,
  update,
  onNext,
  onPassportScan,
}: {
  data: FormData;
  update: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
  onNext: (e: React.FormEvent) => void;
  onPassportScan: (data: PassportData) => void;
}) {
  return (
    <form onSubmit={onNext} className="space-y-6">
      <Stepper current={1} />

      <PassportScanner onExtracted={onPassportScan} />

      <FieldSet legend="About you">
        <Row>
          <Field label="Full name" required value={data.full_name} onChange={(v) => update("full_name", v)} />
          <Field label="Passport number" mono placeholder="e.g. EH1234567" value={data.passport_no} onChange={(v) => update("passport_no", v.toUpperCase())} />
        </Row>
        <Row>
          <Field label="Email" type="email" required value={data.email} onChange={(v) => update("email", v)} />
          <Field label="WhatsApp / phone" required placeholder="+880…" value={data.phone} onChange={(v) => update("phone", v)} />
        </Row>
        <Textarea label="Address" rows={2} placeholder="Where can we reach you?" value={data.address} onChange={(v) => update("address", v)} />
      </FieldSet>

      <FieldSet legend="What you're studying">
        <UniversitySelect value={data.university} onChange={(v) => update("university", v)} />
        <Row>
          <Field label="Campus (optional)" placeholder="e.g. Skudai, Cyberjaya" value={data.campus} onChange={(v) => update("campus", v)} />
          <Field label="Intake" placeholder="e.g. February 2026" value={data.intake} onChange={(v) => update("intake", v)} />
        </Row>
        <Row>
          <Field label="Subject choice 1" value={data.subject_1} onChange={(v) => update("subject_1", v)} />
          <Field label="Subject choice 2 (optional)" value={data.subject_2} onChange={(v) => update("subject_2", v)} />
        </Row>
      </FieldSet>

      <FieldSet legend="How did you hear about us? (optional)">
        <Row>
          <Field label="Referred by — name" value={data.referred_by_name} onChange={(v) => update("referred_by_name", v)} />
          <Field label="Referred by — phone" value={data.referred_by_phone} onChange={(v) => update("referred_by_phone", v)} />
        </Row>
      </FieldSet>

      <FieldSet legend="Anything else?">
        <Textarea label="" rows={3} placeholder="Any questions or context you want to share" value={data.notes} onChange={(v) => update("notes", v)} />
      </FieldSet>

      <div className="flex justify-end pt-3 border-t border-brand-stone">
        <button type="submit" className="btn-gold">
          Continue to documents <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

// -- Step 2: Documents -------------------------------------------------------

function DocumentsView({
  firstName,
  docs,
  setDocFile,
  extras,
  addExtras,
  removeExtra,
  onBack,
  onNext,
}: {
  firstName: string;
  docs: Record<string, File | null>;
  setDocFile: (key: string, file: File | null) => void;
  extras: File[];
  addExtras: (files: FileList | null) => void;
  removeExtra: (i: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const requiredDocs = REQUIRED_DOCUMENTS.filter((d) => d.required);
  const missingRequired = requiredDocs.filter((d) => !docs[d.key]);

  return (
    <div className="space-y-6 animate-fade-up">
      <Stepper current={2} />

      <div className="card-paper p-5 flex items-start gap-3 border-l-4 border-l-brand-gold">
        <Info className="h-4 w-4 mt-0.5 text-brand-bridge shrink-0" />
        <div>
          <p className="font-semibold text-brand-ink">Upload your documents</p>
          <p className="mt-1 text-sm text-brand-ink/70 leading-relaxed">
            Tap each card to read the requirements and pick a file. Everything you upload
            here goes straight into{" "}
            <span className="font-medium text-brand-ink">"{firstName} Documents"</span> in
            our Drive — only our team has access.
          </p>
          <p className="mt-2 text-xs text-brand-muted">
            You can skip anything you don't have on hand and email it to us later.
          </p>
        </div>
      </div>

      <FieldSet legend="Required documents">
        <div className="grid grid-cols-1 gap-3">
          {requiredDocs.map((d) => (
            <DocumentRow
              key={d.key}
              doc={d}
              file={docs[d.key] ?? null}
              onPick={(f) => setDocFile(d.key, f)}
            />
          ))}
        </div>
      </FieldSet>

      <FieldSet legend="If applicable">
        <div className="grid grid-cols-1 gap-3">
          {REQUIRED_DOCUMENTS.filter((d) => !d.required).map((d) => (
            <DocumentRow
              key={d.key}
              doc={d}
              file={docs[d.key] ?? null}
              onPick={(f) => setDocFile(d.key, f)}
            />
          ))}
        </div>
      </FieldSet>

      <FieldSet legend="Anything else? (optional)">
        <p className="text-sm text-brand-ink/70 -mt-1">
          Add any extra files that don't fit the categories above — bank statements,
          recommendation letters, sponsor documents, etc.
        </p>
        <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-brand-stone bg-brand-cream/40 py-6 px-4 hover:bg-brand-cream transition">
          <Paperclip className="h-5 w-5 text-brand-bridge" />
          <span className="text-sm font-medium text-brand-ink">Attach extra files</span>
          <span className="text-xs text-brand-muted">PDF, image, or DOCX · up to 10 files</span>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,.doc,.docx"
            onChange={(e) => {
              addExtras(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
        </label>

        {extras.length > 0 && (
          <ul className="space-y-2 mt-1">
            {extras.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-lg border border-brand-stone bg-brand-paper px-3 py-2"
              >
                <Paperclip className="h-4 w-4 text-brand-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-brand-ink truncate">{f.name}</div>
                  <div className="text-xs text-brand-muted">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeExtra(i)}
                  className="p-1.5 text-brand-muted hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FieldSet>

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-brand-stone">
        <button onClick={onBack} className="btn-ghost border border-brand-stone">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex flex-col items-end gap-1">
          {missingRequired.length > 0 && (
            <span className="text-xs text-brand-muted">
              {missingRequired.length} required document
              {missingRequired.length === 1 ? "" : "s"} not yet attached — you can still continue.
            </span>
          )}
          <button onClick={onNext} className="btn-gold">
            Review my application <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({
  doc,
  file,
  onPick,
}: {
  doc: DocumentGuideline;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-brand-stone bg-brand-paper overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-brand-ink leading-tight">{doc.label}</div>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-0.5 text-xs text-brand-bridge hover:text-brand-ink inline-flex items-center gap-1"
          >
            {open ? "Hide guidelines" : "What should I upload?"}
          </button>
        </div>

        {file ? (
          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline text-xs text-brand-muted truncate max-w-[160px]">
              {file.name}
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <button
              type="button"
              onClick={() => onPick(null)}
              className="text-xs text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="btn-ghost border border-brand-stone shrink-0 cursor-pointer text-xs">
            <Upload className="h-3.5 w-3.5" /> Upload
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              capture="environment"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-brand-stone bg-brand-cream/40">
          <ul className="mt-3 space-y-1.5 text-sm text-brand-ink/80">
            {doc.guidelines.map((g, i) => (
              <li key={i} className="flex gap-2 leading-snug">
                <span className="text-brand-bridge mt-0.5">·</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-brand-muted">
            Accepted: {doc.acceptedFormats} · Max {doc.maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  );
}

function PreviewView({
  data,
  docs,
  extras,
  isPending,
  captchaToken,
  onCaptchaToken,
  onEditDetails,
  onEditDocs,
  onSubmit,
}: {
  data: FormData;
  docs: Record<string, File | null>;
  extras: File[];
  isPending: boolean;
  captchaToken: string | null;
  onCaptchaToken: (token: string | null) => void;
  onEditDetails: () => void;
  onEditDocs: () => void;
  onSubmit: () => void;
}) {
  const captchaEnabled = Boolean(TURNSTILE_SITE_KEY);
  const captchaSolved = !captchaEnabled || Boolean(captchaToken);
  const groups: Array<{ legend: string; rows: Array<[string, string]> }> = [
    {
      legend: "About you",
      rows: [
        ["Full name", data.full_name],
        ["Passport number", data.passport_no || "—"],
        ["Email", data.email],
        ["WhatsApp / phone", data.phone],
        ["Address", data.address || "—"],
      ],
    },
    {
      legend: "What you're studying",
      rows: [
        ["University", data.university || "—"],
        ["Campus", data.campus || "—"],
        ["Intake", data.intake || "—"],
        ["Subject choice 1", data.subject_1 || "—"],
        ["Subject choice 2", data.subject_2 || "—"],
      ],
    },
    {
      legend: "Referral",
      rows: [
        ["Referred by", data.referred_by_name || "—"],
        ["Referrer phone", data.referred_by_phone || "—"],
      ],
    },
  ];

  if (data.notes.trim()) {
    groups.push({ legend: "Notes", rows: [["Note", data.notes]] });
  }

  const docSummary = REQUIRED_DOCUMENTS.map((d) => {
    const f = docs[d.key];
    return {
      label: d.label,
      required: d.required,
      file: f ? `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)` : null,
    };
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <Stepper current={3} />

      <div className="card-paper p-5 flex items-start gap-3 border-l-4 border-l-brand-gold">
        <Pencil className="h-4 w-4 mt-0.5 text-brand-bridge shrink-0" />
        <div>
          <p className="font-semibold text-brand-ink">Review before submitting</p>
          <p className="mt-1 text-sm text-brand-ink/70">
            Make sure everything looks right. Use <strong>Edit</strong> to change anything.
          </p>
        </div>
      </div>

      {groups.map((g) => (
        <fieldset key={g.legend} className="card-paper p-5">
          <div className="flex items-baseline justify-between">
            <legend className="label-eyebrow px-2">{g.legend}</legend>
            <button
              onClick={onEditDetails}
              className="text-xs text-brand-bridge hover:text-brand-ink inline-flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {g.rows.map(([k, v]) => (
              <div key={k} className="border-b border-brand-stone/50 pb-2 last:border-0">
                <dt className="text-[11px] uppercase tracking-wider text-brand-muted">{k}</dt>
                <dd className="mt-1 text-sm text-brand-ink whitespace-pre-line break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </fieldset>
      ))}

      <fieldset className="card-paper p-5">
        <div className="flex items-baseline justify-between">
          <legend className="label-eyebrow px-2">Documents</legend>
          <button
            onClick={onEditDocs}
            className="text-xs text-brand-bridge hover:text-brand-ink inline-flex items-center gap-1"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        <ul className="mt-4 divide-y divide-brand-stone/50">
          {docSummary.map((row) => (
            <li key={row.label} className="py-2.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-brand-ink truncate">{row.label}</div>
                <div className="text-xs text-brand-muted">
                  {row.required ? "Required" : "If applicable"}
                </div>
              </div>
              {row.file ? (
                <div className="flex items-center gap-2 shrink-0 text-xs text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline truncate max-w-[200px]">{row.file}</span>
                  <span className="sm:hidden">Attached</span>
                </div>
              ) : (
                <span className="text-xs text-brand-muted shrink-0">Not attached</span>
              )}
            </li>
          ))}
        </ul>

        {extras.length > 0 && (
          <div className="mt-4 pt-4 border-t border-brand-stone/50">
            <p className="label-eyebrow mb-2">Extra attachments</p>
            <ul className="space-y-1.5">
              {extras.map((f, i) => (
                <li key={i} className="text-sm text-brand-ink flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 text-brand-muted shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="text-xs text-brand-muted shrink-0">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </fieldset>

      {captchaEnabled && (
        <div className="card-paper p-5 flex flex-col items-center gap-3">
          <p className="label-eyebrow self-start">Quick check</p>
          <p className="text-sm text-brand-ink/70 self-start -mt-1">
            One last step — confirm you're a human before we submit.
          </p>
          <TurnstileWidget
            siteKey={TURNSTILE_SITE_KEY}
            action="public-intake"
            onToken={(t) => onCaptchaToken(t)}
            onExpire={() => onCaptchaToken(null)}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-brand-stone">
        <button onClick={onEditDocs} className="btn-ghost border border-brand-stone">
          <ArrowLeft className="h-4 w-4" /> Back to documents
        </button>
        <div className="flex flex-col items-end gap-1">
          {captchaEnabled && !captchaSolved && (
            <span className="text-xs text-brand-muted">
              Complete the check above to enable submit.
            </span>
          )}
          <button
            onClick={onSubmit}
            disabled={isPending || !captchaSolved}
            className="btn-gold"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              <>
                Submit my application <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Step 3: Done ------------------------------------------------------------

function DoneView() {
  return (
    <div className="card-paper p-8 text-center animate-fade-up">
      <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center">
        <CheckCircle2 className="h-7 w-7" />
      </div>
      <h2 className="mt-5 font-display text-2xl text-brand-ink">Thank you!</h2>
      <p className="mt-3 text-brand-ink/75 max-w-md mx-auto">
        We've received your details. Our team will reach out to you on WhatsApp shortly to walk you through the next steps.
      </p>
      <a href="https://wa.me/8801749913165" className="btn-gold mt-6 inline-flex">
        Message us now
      </a>
    </div>
  );
}

// -- Building blocks ---------------------------------------------------------

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Your details" },
    { n: 2, label: "Documents" },
    { n: 3, label: "Review" },
  ];
  return (
    <ol className="flex items-center gap-3 text-xs">
      {steps.map((s, i) => {
        const state = current === s.n ? "current" : current > s.n ? "done" : "future";
        return (
          <li key={s.n} className="flex items-center gap-3">
            <div
              className={`grid place-items-center h-6 w-6 rounded-full text-[11px] font-semibold border ${
                state === "current"
                  ? "bg-brand-ink text-brand-paper border-brand-ink"
                  : state === "done"
                  ? "bg-brand-bridge text-brand-paper border-brand-bridge"
                  : "bg-brand-paper text-brand-muted border-brand-stone"
              }`}
            >
              {state === "done" ? "✓" : s.n}
            </div>
            <span className={`uppercase tracking-[0.18em] ${state === "future" ? "text-brand-muted" : "text-brand-ink"}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-brand-stone">·</span>}
          </li>
        );
      })}
    </ol>
  );
}

function UniversitySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const groups = universitiesByType();
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-brand-ink">
        University <span className="text-xs font-normal text-brand-muted">(or leave blank if undecided)</span>
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-paper bg-brand-paper appearance-none"
      >
        <option value="">Pick a university — or leave blank</option>
        <option disabled>───────── Public ─────────</option>
        {groups["Public"].map((u) => (
          <option key={u.name} value={u.name}>
            {u.name} ({u.short}) — {u.city}
          </option>
        ))}
        <option disabled>───────── Private ─────────</option>
        {groups["Private"].map((u) => (
          <option key={u.name} value={u.name}>
            {u.name} ({u.short}) — {u.city}
          </option>
        ))}
        <option disabled>──── International branch ────</option>
        {groups["International Branch"].map((u) => (
          <option key={u.name} value={u.name}>
            {u.name} ({u.short}) — {u.city}
          </option>
        ))}
        <option disabled>─────────────────────────</option>
        <option value="Other">Other / not listed</option>
      </select>
      <span className="text-xs text-brand-muted">
        Not sure yet? Pick one for now — we'll help you finalize the right fit.
      </span>
    </label>
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
      <span className="text-sm font-medium text-brand-ink">
        {label}
        {required && <span className="text-brand-bridge ml-1">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`input-paper ${mono ? "font-mono tracking-wider" : ""}`}
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
