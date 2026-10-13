"use client";

import { ChevronDown, Settings2 } from "lucide-react";
import { useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import type { TestSettings } from "./model";

export interface Classroom {
  id: string;
  name: string;
  _count?: { enrollments: number };
}

export interface Chapter {
  id: string;
  title: string;
  grade?: number | null;
  book?: { code: string; title: string; subject?: string } | null;
}

export const TYPE_LABEL: Record<string, string> = {
  DAILY: "Өдрийн тест",
  CHAPTER_EXAM: "Сэдвийн шалгалт",
  EESH_MOCK: "ЭЕШ сорил",
  CUSTOM: "Бусад",
  THEORY: "Онолын тест",
  THOUSAND: "1000 бодлого",
};
const EDITABLE_TYPES = ["DAILY", "CHAPTER_EXAM", "EESH_MOCK", "CUSTOM", "THEORY"];
const SUBJECTS = [
  { value: "", label: "Бүх хичээл" },
  { value: "MATH", label: "Математик" },
  { value: "SOCIAL_STUDIES", label: "Нийгмийн ухаан" },
  { value: "SAT", label: "SAT" },
];

const input =
  "min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 text-base text-ink transition focus:border-brand";

/**
 * Тестийн тохиргоо — анхнаасаа ХУРААСАН (бодлогууд эхэнд). Нэг мөрөнд товч
 * хураангуй; дарахад талбарууд. 1000 бодлогын тестэд төрөл түгжээтэй, ангийг
 * «Шалгалт → Тохиргоо»-оос онооно. Сурагч өгсөн бол зөвхөн нэр, хугацаа.
 */
export default function SettingsCard({
  settings,
  limited,
  thousand,
  isAdmin,
  classrooms,
  chapters,
  classes,
  catalogLoading,
  onOpen,
  onChange,
  onCommit,
  onToggleClass,
  uploadingPdf,
  onUploadPdf,
}: {
  settings: TestSettings;
  limited: boolean;
  thousand: boolean;
  isAdmin: boolean;
  classrooms: Classroom[];
  chapters: Chapter[];
  classes: string[];
  catalogLoading: boolean;
  /** Анх нээхэд анги/бүлгийн жагсаалтыг ачаална */
  onOpen: () => void;
  onChange: (patch: Partial<TestSettings>, coalesceKey?: string) => void;
  onCommit: () => void;
  onToggleClass: (id: string) => void;
  uploadingPdf: boolean;
  onUploadPdf: (file: File) => void;
}) {
  const [open, setOpen] = useState(false);
  const chapter = chapters.find((c) => c.id === settings.chapterId);
  const field = (key: keyof TestSettings, label: string, extra: { numeric?: boolean; placeholder?: string } = {}) => (
    <label className="block text-sm text-ink-dim">
      <span className="mb-1 block">{label}</span>
      <input
        value={settings[key]}
        inputMode={extra.numeric ? "numeric" : undefined}
        placeholder={extra.placeholder}
        onChange={(e) => onChange({ [key]: e.target.value } as Partial<TestSettings>, key)}
        onBlur={onCommit}
        className={input}
      />
    </label>
  );

  return (
    <section className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => {
          if (!open) onOpen();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Settings2 className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-ink">Тохиргоо</span>
          <Meta
            className="text-sm text-ink-dim"
            items={[
              TYPE_LABEL[settings.type] ?? settings.type,
              settings.gradingMode === "MANUAL" ? "Багшийн дүн" : "Авто дүн",
              settings.timeLimit ? `${settings.timeLimit} минут` : "Хугацаагүй",
              chapter?.title,
              !thousand && `${classes.length} анги`,
            ]}
          />
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-ink-dim transition", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <div className="grid gap-3 md:grid-cols-2">
            {field("title", "Тестийн нэр")}
            {field("timeLimit", "Хугацаа, минут", { numeric: true, placeholder: "Хугацаагүй" })}
            {!limited && (
              <>
                <label className="block text-sm text-ink-dim">
                  <span className="mb-1 block">Төрөл</span>
                  {thousand ? (
                    <span className={cn(input, "flex items-center text-ink-dim")}>1000 бодлого (өөрчлөхгүй)</span>
                  ) : (
                    <select value={settings.type} onChange={(e) => onChange({ type: e.target.value })} className={input}>
                      {EDITABLE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
                <label className="block text-sm text-ink-dim">
                  <span className="mb-1 block">Дүгнэх горим</span>
                  <select
                    value={settings.gradingMode}
                    onChange={(e) => onChange({ gradingMode: e.target.value })}
                    className={input}
                  >
                    <option value="AUTO">Авто дүн</option>
                    <option value="MANUAL">Багшийн дүн</option>
                  </select>
                </label>
                <label className="block text-sm text-ink-dim">
                  <span className="mb-1 block">Хичээл</span>
                  <select
                    value={settings.subject}
                    onChange={(e) => onChange({ subject: e.target.value, chapterId: "" })}
                    className={input}
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-ink-dim">
                  <span className="mb-1 block">Бүлэг сэдэв</span>
                  <select
                    value={settings.chapterId}
                    onChange={(e) => onChange({ chapterId: e.target.value })}
                    className={input}
                  >
                    <option value="">Бүлэг сонгохгүй</option>
                    {chapters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.book?.code ? `${c.book.code} — ` : ""}
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                {field("groupKey", "Хувилбарын бүлэг")}
                {field("variantLabel", "Хувилбар")}
                {isAdmin && field("price", "Төлбөр", { numeric: true })}
                <div className="md:col-span-2">
                  <label htmlFor="test-pdf" className="mb-1 block text-sm text-ink-dim">
                    PDF/эх сурвалжийн key
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      id="test-pdf"
                      value={settings.pdfKey}
                      onChange={(e) => onChange({ pdfKey: e.target.value }, "pdfKey")}
                      onBlur={onCommit}
                      className={cn(input, "min-w-0 flex-1")}
                    />
                    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-4 py-2 text-base text-ink hover:border-brand">
                      {uploadingPdf ? "Байршуулж байна" : "Файл сонгох"}
                      <input
                        type="file"
                        accept="application/pdf"
                        disabled={uploadingPdf}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadPdf(file);
                          e.target.value = "";
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {!limited &&
            (thousand ? (
              <p className="text-sm text-ink-dim">1000 бодлогын шалгалтыг ангид «Шалгалт → Тохиргоо» табаас онооно.</p>
            ) : (
              <fieldset>
                <legend className="mb-1 text-sm font-semibold text-ink-dim">Хэн үзэх вэ</legend>
                {catalogLoading ? (
                  <p className="text-sm text-ink-dim">Ангиудыг ачаалж байна</p>
                ) : classrooms.length === 0 ? (
                  <p className="text-sm text-ink-dim">Анги алга</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {classrooms.map((c) => (
                      <label
                        key={c.id}
                        className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 py-2 text-base text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={classes.includes(c.id)}
                          onChange={() => onToggleClass(c.id)}
                          className="h-5 w-5 accent-brand"
                        />
                        <span className="min-w-0 flex-1">{c.name}</span>
                        {c._count && <span className="text-sm text-ink-dim">{c._count.enrollments} сурагч</span>}
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            ))}
        </div>
      )}
    </section>
  );
}
