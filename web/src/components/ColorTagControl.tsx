"use client";

import { useState } from "react";
import { api } from "@/lib/api";

// Урьдчилан тодорхойлсон өнгө + утга (SPEC §13.1) — зөвхөн багш нар хооронд харагдана
const PALETTE = [
  { color: "#34d6a8", label: "Сайн" },
  { color: "#e8c468", label: "Дунд" },
  { color: "#e24b4a", label: "Анхаарал" },
  { color: "#4f7fe6", label: "Онцлог" },
];

export default function ColorTagControl({
  studentId,
  initialColor,
  initialNote,
}: {
  studentId: string;
  initialColor?: string;
  initialNote?: string;
}) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(initialColor ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save(newColor: string) {
    setSaving(true);
    try {
      await api(`/students/${studentId}/color-tag`, {
        method: "PUT",
        body: { color: newColor, note },
      });
      setColor(newColor);
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      await api(`/students/${studentId}/color-tag`, { method: "DELETE" });
      setColor("");
      setNote("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={note || "Өнгөний тэмдэглэгээ"}
        className="h-4 w-4 rounded-full border border-white/20 transition hover:scale-110"
        style={{ background: color || "transparent" }}
        aria-label="Өнгөний тэмдэглэгээ"
      />
      {open && (
        <div className="absolute left-0 top-6 z-20 w-56 rounded-xl border border-white/15 bg-[#0b142e] p-3 shadow-xl">
          <div className="mb-2 flex gap-2">
            {PALETTE.map((p) => (
              <button
                key={p.color}
                onClick={() => save(p.color)}
                disabled={saving}
                title={p.label}
                className={`h-7 w-7 rounded-full border-2 transition hover:scale-110 ${
                  color === p.color ? "border-white" : "border-white/20"
                }`}
                style={{ background: p.color }}
              />
            ))}
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => color && save(color)}
            placeholder="Тэмдэглэл (зөвхөн багш нар харна)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs outline-none focus:border-brand-bright"
          />
          <div className="mt-2 flex justify-between text-xs">
            <button onClick={clear} className="text-red-300 hover:underline">
              Арилгах
            </button>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-dim hover:text-ink"
            >
              Хаах
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
