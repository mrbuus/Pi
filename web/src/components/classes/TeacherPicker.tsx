"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@/app/app/admin/classrooms/ClassroomsClient";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import type { PersonRef } from "./types";

interface TeacherOption {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
}

const selectClass =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand";

/**
 * Ангийн багш + туслах ангийн багш (эзэн 2026-10-13) — Багш+/Админ. Сонголт нь
 * хуваарьт оногддог багш (GET /schedule/teachers). Нэг хүн хоёр үүрэгт байхгүй.
 */
export default function TeacherPicker({
  classroom,
  onClose,
  onSaved,
}: {
  classroom: { id: string; name: string; classTeacher: PersonRef | null; assistantTeacher: PersonRef | null };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [options, setOptions] = useState<TeacherOption[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [lead, setLead] = useState(classroom.classTeacher?.id ?? "");
  const [assistant, setAssistant] = useState(classroom.assistantTeacher?.id ?? "");

  const loadOptions = useCallback(async () => {
    setLoadError("");
    try {
      setOptions(await api<TeacherOption[]>("/schedule/teachers"));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Багшийн жагсаалтыг ачаалж чадсангүй");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void loadOptions(), 0);
    return () => window.clearTimeout(t);
  }, [loadOptions]);

  // Одоогийн багш хуваарийн жагсаалтад байхгүй (хичээл заадаггүй болсон) бол ч харагдана
  const list = useMemo(() => {
    const rows = (options ?? []).map((o) => ({ id: o.id, name: o.displayName }));
    for (const p of [classroom.classTeacher, classroom.assistantTeacher])
      if (p && !rows.some((r) => r.id === p.id)) rows.unshift({ id: p.id, name: p.name });
    return rows;
  }, [options, classroom.classTeacher, classroom.assistantTeacher]);

  const unchanged = lead === (classroom.classTeacher?.id ?? "") && assistant === (classroom.assistantTeacher?.id ?? "");

  async function save() {
    if (lead && lead === assistant) throw new Error("Ангийн багш ба туслах багш өөр хүн байх ёстой");
    await api(`/classrooms/${encodeURIComponent(classroom.id)}/teachers`, {
      method: "PATCH",
      body: { teacherId: lead || null, assistantTeacherId: assistant || null },
    });
    toast.success("Ангийн багшийг хадгаллаа");
    onSaved();
    onClose();
  }

  return (
    <Dialog
      title={`${classroom.name} — ангийн багш`}
      onClose={onClose}
      onConfirm={save}
      confirmLabel="Хадгалах"
      confirmDisabled={!options || unchanged}
    >
      {loadError && <ErrorState message={loadError} onRetry={() => void loadOptions()} />}
      {!options && !loadError && <SkeletonRows rows={2} />}
      {options && (
        <div className="space-y-3">
          <TeacherSelect id="class-teacher" label="Ангийн багш" value={lead} onChange={setLead} list={list} taken={assistant} />
          <TeacherSelect
            id="class-assistant"
            label="Туслах ангийн багш"
            value={assistant}
            onChange={setAssistant}
            list={list}
            taken={lead}
          />
        </div>
      )}
    </Dialog>
  );
}

function TeacherSelect({
  id,
  label,
  value,
  onChange,
  list,
  taken,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  list: { id: string; name: string }[];
  taken: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">Оноогоогүй</option>
        {list.map((t) => (
          <option key={t.id} value={t.id} disabled={!!taken && t.id === taken}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
