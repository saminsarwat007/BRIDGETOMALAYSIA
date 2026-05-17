"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Check, X, StickyNote } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { createNoteAction, updateNoteAction, deleteNoteAction } from "@/app/admin/actions/notes";

interface Note {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  studentId: string;
  notes: Note[];
}

export function StudentNotes({ studentId, notes }: Props) {
  const [newText, setNewText] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newText.trim()) return;
    startTransition(async () => {
      try {
        await createNoteAction(studentId, newText);
        setNewText("");
        toast.success("Note added");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to add note");
      }
    });
  }

  function startEdit(note: Note) {
    setEditId(note.id);
    setEditText(note.content);
  }

  function handleUpdate(id: string) {
    startTransition(async () => {
      try {
        await updateNoteAction(id, studentId, editText);
        setEditId(null);
        toast.success("Note updated");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to update note");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteNoteAction(id, studentId);
        toast.success("Note deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete note");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Add new note */}
      <div className="card-paper p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-brand-ink mb-2">
          <StickyNote className="h-4 w-4 text-brand-bridge" /> New note
        </label>
        <textarea
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd(); }}
          rows={3}
          className="input-paper w-full resize-none"
          placeholder="Internal note — only admins can see this. Cmd/Ctrl+Enter to save."
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={isPending || !newText.trim()}
            className="btn-gold text-sm disabled:opacity-40"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="card-paper p-8 text-center">
          <StickyNote className="h-8 w-8 text-brand-stone mx-auto mb-2" />
          <p className="text-sm text-brand-muted">No notes yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="card-paper p-4 border-l-4 border-brand-gold/60"
            >
              {editId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="input-paper w-full resize-none text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditId(null)} className="btn-ghost border border-brand-stone text-xs">
                      <X className="h-3.5 w-3.5" /> Cancel
                    </button>
                    <button
                      onClick={() => handleUpdate(note.id)}
                      disabled={isPending || !editText.trim()}
                      className="btn-gold text-xs disabled:opacity-40"
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-brand-ink whitespace-pre-wrap leading-relaxed">{note.content}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-brand-muted">
                      {formatDateTime(note.created_at)}
                      {note.updated_at !== note.created_at && " · edited"}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => startEdit(note)}
                        className="p-1.5 rounded-lg hover:bg-brand-stone/40 text-brand-muted hover:text-brand-ink transition"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-brand-muted hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
