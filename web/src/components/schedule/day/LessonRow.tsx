"use client";

import {
  BadgeCheck,
  Camera,
  Circle,
  DoorOpen,
  Hourglass,
  NotebookPen,
  Plus,
  TriangleAlert,
} from "lucide-react";
import type { CSSProperties } from "react";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { formatMinutes, roomCapacityOf } from "../types";
import RoadMap from "./RoadMap";
import { DISMISS_LABEL, shortClass, type DayEntry, type StaffRef, type TestInfo } from "./types";
import { withPlus } from "@/lib/personName";

export interface TeacherOption {
  id: string;
  name: string;
  plus: boolean;
  /** Жинхэнэ эрх — «+» тэмдэг зөвхөн Багш+-д (Админд биш) */
  role?: string | null;
}

interface Props {
  entry: DayEntry;
  /** Харагдаж буй өдөр */
  date: string;
  /** Цагийн блокийн дуусах цаг — ялгаатай бол мөрөнд жижгээр */
  blockEnd: number;
  tests: Record<string, TestInfo>;
  canPlan: boolean;
  canConfirm: boolean;
  /** Тухайн өдөр өнгөрсөн эсвэл өнөөдөр — батлах боломжтой */
  past: boolean;
  teachers: TeacherOption[];
  /** Тухайн өдөр ажлын хүснэгтээр ажиллах багш */
  working: Set<string>;
  rosterOrder: Map<string, number>;
  workingLabel: string;
  saving: boolean;
  clash: (teacherId: string) => boolean;
  armedName: string | null;
  armedId: string | null;
  onQuickAssign: (slot: "lead" | "assistant") => void;
  onStaff: (lead: string, assistant: string) => void;
  onOpen: () => void;
  onConfirm: () => void;
}

/** Тэмдэглэлийн эхний ~40 тэмдэгт */
const preview = (body: string) => (body.length > 42 ? `${body.slice(0, 40).trimEnd()}…` : body);

/**
 * Өдрийн хуваарийн НЭГ мөр — эзний өдрийн Excel: цаг, танхим, анги,
 * тест (өмнөх → өнөөдөр), ахлах, туслах. Мөр дээр дарахад төлөвлөгөөний цонх.
 * Мөрийн доторх байрлал мөрийн ӨӨРИЙН өргөнөөр (container query).
 */
export default function LessonRow(p: Props) {
  const { entry: e, canPlan, canConfirm, past } = p;
  const capacity = roomCapacityOf(e.room);
  const over = capacity ? Math.max(0, e.students - capacity) : 0;
  const dismiss = e.plan?.dismissMode ?? null;
  const time = `${formatMinutes(e.startMinute)}–${formatMinutes(e.endMinute)}`;
  const label = `${shortClass(e.classroomName)}, ${time}`;
  const extras = !!(e.note || e.plan?.photoStudent || dismiss || over > 0 || e.exception);

  return (
    <li
      className={cn("class-row @container", dismiss === "DISMISS" && "bg-info/[0.06]")}
      style={{ "--cls": getClassroomColor(e.classroomId) } as CSSProperties}
    >
      <div
        onClick={(ev) => {
          if (!(ev.target as HTMLElement).closest("button,select,a,label,[role=tooltip]")) p.onOpen();
        }}
        className="row-interactive grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1.5 px-3 py-2.5 hover:bg-ink/[0.025] @xl:grid-cols-[11rem_minmax(0,1fr)_auto] @xl:gap-x-3 @4xl:grid-cols-[12rem_minmax(0,1fr)_9rem_9rem_7rem]"
      >
        <button
          type="button"
          onClick={p.onOpen}
          aria-label={`${label}: ${canPlan ? "төлөвлөгөө засах" : "дэлгэрэнгүй"}`}
          className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg text-left"
        >
          <RoomBadge room={e.room} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-base font-bold text-ink">{shortClass(e.classroomName)}</span>
            <span className="block text-xs tabular-nums text-ink-dim">
              {e.students} сурагч
              {e.endMinute !== p.blockEnd && <span className="ml-2 font-semibold text-ink">{formatMinutes(e.endMinute)} хүртэл</span>}
            </span>
          </span>
        </button>

        <div className="flex items-center justify-end @xl:col-start-3 @xl:row-start-1 @4xl:col-start-5">
          {e.record ? (
            canConfirm ? (
              <button
                type="button"
                onClick={p.onConfirm}
                title={`${e.record.confirmedByName} баталсан`}
                className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs font-semibold text-success hover:bg-success/10"
              >
                <BadgeCheck className="size-4" aria-hidden />
                Батлагдсан
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success" title={`${e.record.confirmedByName} баталсан`}>
                <BadgeCheck className="size-4" aria-hidden />
                Батлагдсан
              </span>
            )
          ) : (
            canConfirm &&
            past && (
              <button
                type="button"
                onClick={p.onConfirm}
                aria-label={`Хичээл орсныг батлах: ${label}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 text-xs font-semibold text-ink hover:border-success hover:text-success"
              >
                <Circle className="size-4" aria-hidden />
                Батлах
              </button>
            )
          )}
        </div>

        <div className="col-span-2 min-w-0 @xl:col-span-1 @xl:col-start-2 @xl:row-start-1">
          <RoadMap entry={e} tests={p.tests} emptyLabel={canPlan ? "Тест сонгоогүй" : "Төлөвлөөгүй"} />
          {extras && (
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-dim">
              {e.exception?.kind === "MOVED" && (
                <span className="font-semibold text-warning">
                  {e.exception.originalDate !== p.date ? `${e.exception.originalDate.slice(5).replace("-", ".")}-ээс зөөсөн` : "Цаг, танхим өөрчилсөн"}
                </span>
              )}
              {dismiss && (
                <span className="inline-flex items-center gap-1 font-semibold text-info">
                  {dismiss === "DISMISS" ? <DoorOpen className="size-3.5" aria-hidden /> : <Hourglass className="size-3.5" aria-hidden />}
                  {DISMISS_LABEL[dismiss]}
                </span>
              )}
              {e.plan?.photoStudent && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Camera className="size-3.5 shrink-0" aria-label="Онолын зураг" />
                  <span className="truncate">{e.plan.photoStudent.name}</span>
                </span>
              )}
              {e.note && (
                <span className="inline-flex min-w-0 items-center gap-1" title={e.note.body}>
                  <NotebookPen className="size-3.5 shrink-0" aria-label="Тэмдэглэл" />
                  <span className="truncate">{preview(e.note.body)}</span>
                </span>
              )}
              {over > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-warning" title={`Танхимд ${capacity} суудал`}>
                  <TriangleAlert className="size-3.5" aria-hidden />
                  {over} суудал дутна
                </span>
              )}
            </p>
          )}
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-2 @xl:col-span-2 @xl:col-start-1 @xl:row-start-2 @4xl:contents">
          <Staff
            label="Ахлах багш"
            value={e.leadTeacher}
            other={e.assistantTeacher?.id ?? ""}
            className="@4xl:col-start-3 @4xl:row-start-1"
            onChange={(id) => p.onStaff(id, e.assistantTeacher?.id ?? "")}
            onQuick={() => p.onQuickAssign("lead")}
            p={p}
          />
          <Staff
            label="Туслах багш"
            value={e.assistantTeacher}
            other={e.leadTeacher?.id ?? ""}
            className="@4xl:col-start-4 @4xl:row-start-1"
            onChange={(id) => p.onStaff(e.leadTeacher?.id ?? "", id)}
            onQuick={() => p.onQuickAssign("assistant")}
            p={p}
          />
        </div>
      </div>
    </li>
  );
}

function initials(name: string) {
  const parts = name.replace(/\./g, " ").split(/\s+/).filter(Boolean);
  return (parts.at(-1)?.[0] ?? "").toUpperCase() + (parts.length > 1 ? (parts[0][0] ?? "").toUpperCase() : "");
}

/** Багш+ = brand, Багш = teal — өнгө + бичвэр (title) хамт */
export function TeacherTag({ who, clash }: { who: StaffRef; clash?: boolean }) {
  const plus = who.role === "TEACHER_PLUS" || who.role === "ADMIN";
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        title={plus ? "Багш+" : "Багш"}
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
          plus ? "bg-brand-bright/15 text-brand-soft" : "bg-accent-teal/15 text-accent-teal",
        )}
      >
        {initials(who.name)}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-ink">{withPlus(who.name, who.role)}</span>
      {clash && (
        <span title="Энэ цагт өөр ангид давхар" className="inline-flex shrink-0 text-warning">
          <TriangleAlert className="size-3.5" aria-hidden />
          <span className="sr-only">Энэ цагт өөр ангид давхар</span>
        </span>
      )}
    </span>
  );
}

function Staff({
  label,
  value,
  other,
  className,
  onChange,
  onQuick,
  p,
}: {
  label: string;
  value: StaffRef | null;
  other: string;
  className?: string;
  onChange: (id: string) => void;
  onQuick: () => void;
  p: Props;
}) {
  const clash = !!value && p.clash(value.id);
  if (!p.canPlan)
    return (
      <div className={cn("flex min-w-0 flex-col gap-0.5 @xl:flex-row @xl:items-center @xl:gap-2 @4xl:flex-col @4xl:items-stretch @4xl:gap-0.5", className)}>
        <p className="text-[11px] font-semibold text-ink-dim @xl:shrink-0 @4xl:sr-only">{label}</p>
        {value ? <TeacherTag who={value} clash={clash} /> : <span className="flex h-6 items-center text-sm text-ink-dim">—</span>}
      </div>
    );
  if (!value && p.armedName && p.armedId !== other)
    return (
      <div className={cn("flex min-w-0 flex-col gap-0.5 @xl:flex-row @xl:items-center @xl:gap-2 @4xl:flex-col @4xl:items-stretch @4xl:gap-0.5", className)}>
        <p className="text-[11px] font-semibold text-ink-dim @xl:shrink-0 @4xl:sr-only">{label}</p>
        <button
          type="button"
          onClick={onQuick}
          disabled={p.saving}
          aria-label={`${label}: ${p.armedName} оноох`}
          className="inline-flex min-h-11 w-full min-w-0 items-center gap-1 rounded-lg border border-dashed border-brand bg-brand-bright/10 px-2 text-sm font-semibold text-brand-soft disabled:opacity-50"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{p.armedName}</span>
        </button>
      </div>
    );
  // Тухайн өдөр ажиллах багш ДЭЭР (хүснэгтийн дарааллаар), бусад нь доор (нэрээр)
  const today = p.teachers
    .filter((t) => p.working.has(t.id))
    .sort((a, b) => (p.rosterOrder.get(a.id) ?? 0) - (p.rosterOrder.get(b.id) ?? 0));
  const rest = p.teachers.filter((t) => !p.working.has(t.id));
  const option = (t: TeacherOption) => (
    <option key={t.id} value={t.id} disabled={t.id === other}>
      {t.name}
    </option>
  );
  return (
    <label className={cn("flex min-w-0 flex-col gap-0.5 @xl:flex-row @xl:items-center @xl:gap-2 @4xl:flex-col @4xl:items-stretch @4xl:gap-0.5", className)}>
      <span className="text-[11px] font-semibold text-ink-dim @xl:shrink-0 @4xl:sr-only">{label}</span>
      <select
        aria-label={label}
        aria-invalid={clash || undefined}
        title={clash ? "Энэ багш энэ цагт өөр ангид давхар оноогдсон" : undefined}
        value={value?.id ?? ""}
        disabled={p.saving}
        onChange={(ev) => onChange(ev.target.value)}
        className={cn(
          "min-h-11 w-full min-w-0 rounded-lg border bg-bg px-2 text-sm",
          clash ? "border-error bg-error/8 text-error" : cn("border-line", value ? "text-ink" : "text-ink-dim"),
        )}
      >
        <option value="">—</option>
        {value && !p.teachers.some((t) => t.id === value.id) && <option value={value.id}>{withPlus(value.name, value.role)}</option>}
        {today.length > 0 && <optgroup label={p.workingLabel}>{today.map(option)}</optgroup>}
        {rest.length > 0 && <optgroup label="Бусад багш">{rest.map(option)}</optgroup>}
      </select>
      {clash && <span className="text-[11px] font-semibold text-error">Энэ цагт давхар</span>}
    </label>
  );
}
