"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Plus, FileText, Trash2, ExternalLink } from "lucide-react";
import { STAGES, ATTACHMENT_KINDS, stageLabel, formatDateTime } from "@/lib/utils";
import {
  addStageUpdateAction,
  quickSetStageAction,
  deleteStageHistoryAction,
} from "@/app/admin/actions/tracking";
import type { Student, StageHistory } from "@/types/database";

interface Props {
  student: Student;
  history: StageHistory[];
}

export function TrackingUpdates({ student, history }: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(student.current_stage);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="card-paper p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="label-eyebrow">Current stage</p>
            <h3 className="mt-1 font-display text-xl text-brand-ink">
              {stageLabel(student.current_stage)}
            </h3>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-gold text-xs sm:text-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add update
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {STAGES.map((s) => {
            const active = s.value === student.current_stage;
            return (
              <form key={s.value} action={quickSetStageAction}>
                <input type="hidden" name="student_id" value={student.id} />
                <input type="hidden" name="stage" value={s.value} />
                <button
                  type="submit"
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    active
                      ? "bg-brand-bridge text-brand-paper border-brand-bridge"
                      : "border-brand-stone text-brand-ink/70 hover:bg-brand-cream hover:border-brand-bridge/40"
                  }`}
                >
                  {s.short}
                </button>
              </form>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-brand-muted">
          Tap a stage to set it instantly, or click "Add update" to include a note and attachment.
        </p>
      </div>

      {open && (
        <form
          action={(fd) =>
            startTransition(async () => {
              try {
                await addStageUpdateAction(fd);
                toast.success("Update added");
                setOpen(false);
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't save update");
              }
            })
          }
          className="card-paper p-5 space-y-4 animate-fade-up"
        >
          <input type="hidden" name="student_id" value={student.id} />

          <div>
            <label className="text-sm font-medium text-brand-ink">Stage</label>
            <select
              name="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as any)}
              className="input-paper mt-1.5"
            >
              {STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-brand-ink">Comment (visible to student)</label>
            <textarea
              name="comment"
              rows={3}
              placeholder='e.g. "Congratulations — your offer letter has arrived!"'
              className="input-paper mt-1.5 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-brand-ink">Attachment type</span>
              <select name="attachment_kind" defaultValue="" className="input-paper mt-1.5">
                <option value="">No attachment</option>
                {ATTACHMENT_KINDS.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-brand-ink">Button label</span>
              <input
                name="attachment_label"
                placeholder="e.g. View Offer Letter"
                className="input-paper mt-1.5"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="text-sm font-medium text-brand-ink">Google Drive link</span>
              <input
                name="attachment_drive_link"
                placeholder="https://drive.google.com/…"
                className="input-paper mt-1.5"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="notify_student"
              defaultChecked
              className="h-4 w-4 rounded border-brand-stone text-brand-bridge focus:ring-brand-gold"
            />
            <span className="text-sm text-brand-ink">
              Email the student about this update
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-stone">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-ghost border border-brand-stone"
            >
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-gold">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                "Add update"
              )}
            </button>
          </div>
        </form>
      )}

      <div>
        <h3 className="font-display text-lg text-brand-ink mb-3">History</h3>
        {history.length === 0 ? (
          <div className="card-paper p-8 text-center text-sm text-brand-muted">
            No updates yet. Add one above — students will see comments and attachments on their tracking page.
          </div>
        ) : (
          <ol className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="card-paper p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-brand-bridge font-semibold">
                      {stageLabel(h.stage)}
                    </div>
                    <div className="text-xs text-brand-muted">{formatDateTime(h.changed_at)}</div>
                  </div>
                  <form
                    action={() => deleteStageHistoryAction(h.id, student.id)}
                    onSubmit={(e) => {
                      if (!confirm("Delete this update?")) e.preventDefault();
                    }}
                  >
                    <button
                      type="submit"
                      className="text-brand-muted hover:text-rose-600 transition"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
                {h.comment && (
                  <p className="mt-2 text-sm text-brand-ink/85 whitespace-pre-line">
                    {h.comment}
                  </p>
                )}
                {h.attachment_drive_link && (
                  <a
                    href={h.attachment_drive_link}
                    target="_blank"
                    rel="noopener"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-bridge hover:text-brand-ink"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {h.attachment_label ?? "View attachment"}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
