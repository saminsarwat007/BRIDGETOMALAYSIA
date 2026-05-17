"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";

interface Props {
  defaultName?: string;
  label?: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const FONT = "Dancing Script";
const FONT_CSS = "https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap";

export function TypeSignature({ defaultName = "", label, onSave, onCancel }: Props) {
  const [name, setName] = useState(defaultName);
  const [fontReady, setFontReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Google Font once
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_CSS}"]`)) {
      document.fonts.ready.then(() => setFontReady(true));
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_CSS;
    link.onload = () => document.fonts.ready.then(() => setFontReady(true));
    document.head.appendChild(link);
  }, []);

  // Redraw canvas whenever name or font changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fontReady) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!name.trim()) return;
    ctx.font = `600 54px "${FONT}"`;
    ctx.fillStyle = "#1F1410";
    ctx.textBaseline = "middle";
    ctx.fillText(name.trim(), 16, canvas.height / 2);
  }, [name, fontReady]);

  useEffect(() => { redraw(); }, [redraw]);

  function handleSave() {
    if (!name.trim() || !fontReady) return;
    redraw();
    onSave(canvasRef.current!.toDataURL("image/png"));
  }

  return (
    <div className="space-y-4">
      {label && <p className="text-sm font-medium text-brand-ink">{label}</p>}

      <div>
        <p className="text-xs text-brand-muted mb-1.5">
          Type your full name — it will be used as your signature
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-paper w-full"
          placeholder="Your full name"
          autoFocus
        />
      </div>

      <div className="rounded-xl border border-brand-stone bg-white overflow-hidden">
        <div className="px-3 pt-2 pb-0">
          <p className="text-[10px] uppercase tracking-wider text-brand-muted">Preview</p>
        </div>
        <canvas
          ref={canvasRef}
          width={500}
          height={88}
          className="w-full"
          style={{ opacity: fontReady ? 1 : 0.2 }}
        />
        <div className="mx-3 border-t border-brand-stone" />
        <p className="px-3 py-1.5 text-[10px] text-brand-muted/60">Signature line</p>
      </div>

      <p className="text-[11px] text-brand-muted leading-relaxed">
        By clicking <strong>Adopt &amp; Sign</strong>, you confirm that this typed name is your legally
        binding digital signature. Your IP address and timestamp will be recorded.
      </p>

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost border border-brand-stone text-sm">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || !fontReady}
          className="btn-gold text-sm disabled:opacity-40"
        >
          <Check className="h-3.5 w-3.5" /> Adopt &amp; Sign
        </button>
      </div>
    </div>
  );
}
