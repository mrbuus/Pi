"use client";

import type { AuditFilterValues, StaffUser } from "./types";

const ENTITY_OPTIONS = [
  "Payment",
  "StudentProfile",
  "TestResult",
  "UserPass",
  "Classroom",
  "Problem",
  "Test",
  "Pass",
  "User",
  "Enrollment",
  "Attendance",
];

const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "CONFIRM",
  "REJECT",
  "REVERSE",
  "REVOKE",
  "DELETE",
  "ARCHIVE",
  "GRANT",
];

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

/** Аудит логийн шүүлтүүр — entity/action чөлөөт бичихтэй, санал болгосон утгатай. */
export default function AuditFilters({
  values,
  staff,
  onChange,
  onSubmit,
  onReset,
}: {
  values: AuditFilterValues;
  staff: StaffUser[];
  onChange: (values: AuditFilterValues) => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  function set<K extends keyof AuditFilterValues>(key: K, v: string) {
    onChange({ ...values, [key]: v });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div>
        <label htmlFor="audit-entity" className="mb-1 block text-xs font-semibold text-ink-dim">
          Обьект (entity)
        </label>
        <input
          id="audit-entity"
          list="audit-entity-options"
          value={values.entity}
          onChange={(e) => set("entity", e.target.value)}
          placeholder="ж: Payment"
          className={inputCls}
        />
        <datalist id="audit-entity-options">
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="audit-action" className="mb-1 block text-xs font-semibold text-ink-dim">
          Үйлдэл (action)
        </label>
        <input
          id="audit-action"
          list="audit-action-options"
          value={values.action}
          onChange={(e) => set("action", e.target.value)}
          placeholder="ж: UPDATE"
          className={inputCls}
        />
        <datalist id="audit-action-options">
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor="audit-actor" className="mb-1 block text-xs font-semibold text-ink-dim">
          Хэн хийсэн
        </label>
        <select
          id="audit-actor"
          value={values.actorId}
          onChange={(e) => set("actorId", e.target.value)}
          className={inputCls}
        >
          <option value="">Бүгд</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName} ({s.role})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="audit-from" className="mb-1 block text-xs font-semibold text-ink-dim">
          Эхлэх огноо
        </label>
        <input
          id="audit-from"
          type="date"
          value={values.from}
          onChange={(e) => set("from", e.target.value)}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="audit-to" className="mb-1 block text-xs font-semibold text-ink-dim">
          Дуусах огноо
        </label>
        <input
          id="audit-to"
          type="date"
          value={values.to}
          onChange={(e) => set("to", e.target.value)}
          className={inputCls}
        />
      </div>

      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
        <button
          type="submit"
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition"
        >
          Шүүх
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:text-ink"
        >
          Цэвэрлэх
        </button>
      </div>
    </form>
  );
}
