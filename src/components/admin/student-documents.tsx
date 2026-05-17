import { CheckCircle2, ExternalLink, FileText, RotateCcw } from "lucide-react";
import { REQUIRED_DOCUMENTS } from "@/lib/documents";
import { formatDate } from "@/lib/utils";
import type { DocStatus, Document as StudentDocument, Student } from "@/types/database";
import {
  markDocumentReceivedAction,
  requestDocumentReuploadAction,
} from "@/app/admin/actions/documents";

interface Props {
  student: Student;
  documents: StudentDocument[];
}

export function StudentDocuments({ student, documents }: Props) {
  const byType = new Map(documents.map((doc) => [doc.doc_type, doc]));
  const requiredDocs = REQUIRED_DOCUMENTS.filter((doc) => doc.required);
  const receivedRequired = requiredDocs.filter(
    (doc) => byType.get(doc.label)?.status === "received"
  ).length;

  return (
    <div className="space-y-5">
      <div className="card-paper p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="label-eyebrow">Document review</p>
          <h2 className="font-display text-2xl text-brand-ink mt-1">Student documents</h2>
          <p className="text-sm text-brand-ink/70 mt-1">
            Review uploads, open Drive files, mark documents as received, or request a re-upload with a reason.
          </p>
        </div>
        <div className="rounded-xl bg-brand-cream px-4 py-3 text-sm text-brand-ink">
          <span className="font-display text-xl text-brand-bridge">{receivedRequired}</span>
          <span className="text-brand-muted"> / {requiredDocs.length} required received</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {REQUIRED_DOCUMENTS.map((docDef) => {
          const existing = byType.get(docDef.label) ?? null;
          const status = existing?.status ?? "pending";

          return (
            <article key={docDef.key} className="card-paper p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-brand-ink">{docDef.label}</h3>
                    {docDef.required ? (
                      <span className="rounded-full bg-brand-gold/15 text-brand-bridge px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Required
                      </span>
                    ) : (
                      <span className="rounded-full bg-brand-stone/40 text-brand-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-brand-muted mt-1">
                    {docDef.acceptedFormats} · Max {docDef.maxSizeMB}MB
                  </p>
                </div>
                <DocumentStatusBadge status={status} />
              </div>

              {existing?.drive_link ? (
                <a
                  href={existing.drive_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-brand-bridge hover:text-brand-ink"
                >
                  <FileText className="h-4 w-4" /> View uploaded file <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="text-sm text-brand-muted">No file uploaded yet.</p>
              )}

              {existing?.rejection_reason && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                    Re-upload reason shown to student
                  </p>
                  <p className="text-sm text-rose-800 mt-1">{existing.rejection_reason}</p>
                </div>
              )}

              {existing?.updated_at && (
                <p className="text-xs text-brand-muted">Last updated {formatDate(existing.updated_at)}</p>
              )}

              <div className="border-t border-brand-stone/60 pt-4 space-y-3">
                <form action={markDocumentReceivedAction}>
                  <input type="hidden" name="student_id" value={student.id} />
                  <input type="hidden" name="doc_key" value={docDef.key} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark received
                  </button>
                </form>

                <form action={requestDocumentReuploadAction} className="space-y-2">
                  <input type="hidden" name="student_id" value={student.id} />
                  <input type="hidden" name="doc_key" value={docDef.key} />
                  <textarea
                    name="rejection_reason"
                    rows={2}
                    placeholder="Why should the student upload again? Example: image is blurry, missing back side, wrong document..."
                    defaultValue={existing?.status === "rejected" ? existing.rejection_reason ?? "" : ""}
                    className="input-paper min-h-20 text-sm resize-y"
                    required
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Request re-upload
                  </button>
                </form>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: DocStatus | "pending" }) {
  const config = {
    received: "bg-emerald-50 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-50 text-rose-700 border-rose-200",
    pending: "bg-brand-stone/40 text-brand-muted border-brand-stone",
  } as const;

  const label = status === "received" ? "Received" : status === "rejected" ? "Re-upload needed" : "Pending";

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${config[status]}`}>
      {label}
    </span>
  );
}
