"use client";

import { BookOpen, Check, ChevronDown, ClipboardCheck, DoorOpen, FilePlus2, GraduationCap, Undo2, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { useId, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import type { DemoTest } from "../world";
import {
  ChipBadge,
  ConfirmedBadge,
  DetailBlock,
  Occupancy,
  RolePill,
  RoomTag,
  StatusBadge,
  TeacherTag,
  WarnBadge,
} from "./parts";
import { durationLabel, timeRange, type LessonView } from "./util";

interface Props {
  view: LessonView;
  expanded: boolean;
  confirmed: boolean;
  onToggle: () => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
}

/**
 * Нэг хичээлийн мөр. Бодит системд: Classroom + ClassSchedule(weekday, start, end, room)
 * + тухайн өдрийн LessonStaffing (ахлах/туслах) + LessonTopic + гэрийн даалгаврын Test.
 * Мөрийн дотоод байрлал нь мөрийн ӨӨРИЙН өргөнөөс хамаарна (container query).
 */
export default function LessonRow({ view, expanded, confirmed, onToggle, onConfirm, onUnconfirm }: Props) {
  const { lesson, cls, room, students, capacity, over, lead, assistant, clashes } = view;
  const detailId = useId();
  const done = lesson.status === "done";
  const given = done ? "Өгсөн" : "Өгөх";
  const checked = done ? "Шалгасан" : "Шалгах";
  const time = timeRange(lesson);
  const needsConfirm = done && !confirmed;
  const showBadges = lesson.chips.length > 0 || over > 0;
  // Ирцийн самбар нь ангийн ID ба өдрөөр шууд нээгдэнэ; ангийн хяналтын самбар нь /demo/classes/<id>
  const boardHref = `/demo/teacher?class=${cls.id}&date=${lesson.dateKey}`;
  const classHref = `/demo/classes/${cls.id}`;

  return (
    <li
      className={cn("class-row @container", lesson.status === "now" && "bg-brand-bright/[0.05]")}
      style={{ "--cls": getClassroomColor(cls.id) } as CSSProperties}
    >
      <div
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("a,button")) onToggle();
        }}
        className="row-interactive grid cursor-pointer grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2 hover:bg-ink/[0.025] @3xl:grid-cols-[7.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_6.75rem] @3xl:gap-x-3 @3xl:gap-y-2 @3xl:px-4 @3xl:py-3"
      >
        {/* Цаг, төлөв, баталгаажуулалт (утсан дээр нэг мөр, компьютер дээр тусдаа нүднүүд) */}
        <div className="col-span-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 @3xl:contents">
          <div className="mr-auto flex min-w-0 items-center @3xl:col-start-1 @3xl:row-start-1 @3xl:mr-0 @3xl:flex-col @3xl:items-start @3xl:gap-0.5">
            <span className="whitespace-nowrap text-sm font-bold tabular-nums text-ink">{time}</span>
            <span className="hidden text-xs text-ink-dim @3xl:block">{durationLabel(lesson.slot.start, lesson.slot.end)}</span>
          </div>
          <StatusBadge status={lesson.status} className="@3xl:col-start-1 @3xl:row-start-2 @3xl:self-start @3xl:justify-self-start" />
          {done &&
            (needsConfirm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onConfirm}
                aria-label={`Хичээл орсныг батлах: ${cls.label}, ${time}`}
                className="min-h-11 rounded-lg px-3 @3xl:col-start-5 @3xl:row-start-1 @3xl:min-h-9 @3xl:self-start @3xl:justify-self-end"
              >
                <Check aria-hidden />
                Батлах
              </Button>
            ) : (
              <ConfirmedBadge className="@3xl:col-start-5 @3xl:row-start-1 @3xl:self-start @3xl:justify-self-end" />
            ))}
        </div>

        {/* Анги, сурагчийн тоо, танхим, дэлгэх товч */}
        <div className="col-span-2 flex items-center gap-2 @3xl:contents">
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-0.5 @3xl:col-start-2 @3xl:row-start-1 @3xl:flex-col @3xl:items-start @3xl:justify-start">
            <span className="flex min-w-0 items-baseline gap-2">
              <Link
                href={boardHref}
                className="-my-2.5 inline-flex min-w-11 items-center py-2.5 text-base font-bold text-brand-soft underline-offset-2 hover:underline @3xl:-my-1 @3xl:min-w-0 @3xl:py-1"
              >
                {cls.label}
              </Link>
              <span className="whitespace-nowrap text-xs text-ink-dim">{students} сурагч</span>
            </span>
            <RoomTag room={lesson.slot.room} capacity={capacity} />
          </div>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={expanded ? detailId : undefined}
            aria-label={`${cls.label}, ${time}: ${expanded ? "хураах" : "дэлгэрэнгүй харах"}`}
            onClick={onToggle}
            className="-my-2 -mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink @3xl:col-start-5 @3xl:row-start-2 @3xl:my-0 @3xl:mr-0 @3xl:self-center @3xl:justify-self-end"
          >
            <ChevronDown className={cn("size-5 transition-transform duration-[var(--dur-base)]", expanded && "rotate-180")} aria-hidden />
          </button>
        </div>

        {/* Ахлах ба туслах багш */}
        <div className="col-start-1 min-w-0 @3xl:col-start-3 @3xl:row-start-1">
          <p className="text-[11px] font-semibold text-ink-dim">Ахлах багш</p>
          {lead ? <TeacherTag teacher={lead} clash={clashes.some((c) => c.teacher.id === lead.id)} /> : <span className="flex h-6 items-center text-sm text-ink-dim">Тодорхойгүй</span>}
        </div>
        <div className="col-start-2 min-w-0 @3xl:col-start-4 @3xl:row-start-1">
          <p className="text-[11px] font-semibold text-ink-dim">Туслах багш</p>
          {assistant ? <TeacherTag teacher={assistant} clash={clashes.some((c) => c.teacher.id === assistant.id)} /> : <span className="flex h-6 items-center text-sm text-ink-dim">Туслах байхгүй</span>}
        </div>

        {/* Сэдэв, өгөх ба шалгах даалгавар */}
        <dl className="col-span-2 grid min-w-0 gap-y-px @3xl:col-span-3 @3xl:col-start-2 @3xl:row-start-2 @3xl:grid-cols-3 @3xl:gap-x-3">
          <PlanItem label="Сэдэв" value={lesson.topic} />
          <PlanItem label={given} wideLabel={`${given} даалгавар`} value={lesson.assigned.title} />
          <PlanItem label={checked} wideLabel={`${checked} даалгавар`} value={lesson.homework?.title ?? "байхгүй"} muted={!lesson.homework} />
        </dl>

        {/* Шошго ба анхааруулга */}
        {showBadges && (
          <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-1.5 @3xl:col-span-4 @3xl:col-start-2 @3xl:row-start-3">
            {lesson.chips.map((c) => (
              <ChipBadge key={c} chip={c} />
            ))}
            {over > 0 && <WarnBadge title={`Танхимд ${capacity} суудал, ${students} сурагч`}>{over} сурагч суудалгүй</WarnBadge>}
          </div>
        )}
      </div>

      {expanded && (
        <div
          id={detailId}
          className="grid gap-x-6 gap-y-3.5 border-t border-dashed border-line bg-bg/60 px-3 py-3.5 @xl:grid-cols-2 @3xl:px-4"
        >
          <DetailBlock icon={BookOpen} label="Сэдэв">
            <p className="font-semibold">{lesson.topic}</p>
            <p className="text-xs text-ink-dim">
              <Meta items={[time, durationLabel(lesson.slot.start, lesson.slot.end)]} />
            </p>
          </DetailBlock>

          <DetailBlock icon={DoorOpen} label="Танхим">
            <p className="flex flex-wrap items-center gap-x-2">
              <RoomTag room={lesson.slot.room} capacity={capacity} />
              <span className="text-xs text-ink-dim">{room?.branch ?? cls.branch}</span>
            </p>
            {capacity ? (
              <Occupancy students={students} capacity={capacity} className="mt-1.5 max-w-64" />
            ) : null}
          </DetailBlock>

          <DetailBlock icon={FilePlus2} label={`${given} даалгавар`}>
            <TestInfo test={lesson.assigned} />
          </DetailBlock>

          <DetailBlock icon={ClipboardCheck} label={`${checked} даалгавар`}>
            {lesson.homework ? <TestInfo test={lesson.homework} /> : <p className="text-ink-dim">Энэ нь анхны хичээл тул шалгах даалгавар байхгүй</p>}
          </DetailBlock>

          <DetailBlock icon={GraduationCap} label="Ахлах багш">
            <TeacherLine teacher={lead} empty="Тодорхойгүй" />
          </DetailBlock>

          <DetailBlock icon={UserRound} label="Туслах багш">
            <TeacherLine teacher={assistant} empty="Туслах байхгүй" />
          </DetailBlock>

          {(over > 0 || clashes.length > 0) && (
            <div className="space-y-1 @xl:col-span-2">
              {over > 0 && (
                <p className="text-sm text-warning">
                  Танхимд {capacity} суудал байхад {students} сурагчтай тул {over} сурагч суудалгүй үлдэнэ
                </p>
              )}
              {clashes.map((c) => (
                <p key={c.teacher.id} className="text-sm text-warning">
                  {c.teacher.name} энэ цагт {c.with.join(", ")} ангид мөн хичээлтэй
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2 @xl:col-span-2">
            <Button asChild variant="secondary" size="sm" className="min-h-11 rounded-lg @3xl:min-h-9">
              <Link href={boardHref}>
                <ClipboardCheck aria-hidden />
                Ирц ба даалгавар
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="min-h-11 rounded-lg @3xl:min-h-9">
              <Link href={classHref}>
                <Users aria-hidden />
                Ангийн мэдээлэл
              </Link>
            </Button>
            {done && confirmed && (
              <Button variant="ghost" size="sm" onClick={onUnconfirm} className="min-h-11 rounded-lg @3xl:min-h-9">
                <Undo2 aria-hidden />
                Батламж цуцлах
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function PlanItem({ label, wideLabel, value, muted }: { label: string; wideLabel?: string; value: string; muted?: boolean }) {
  return (
    <div className="flex min-w-0 items-baseline gap-2 @3xl:flex-col @3xl:items-stretch @3xl:gap-0">
      <dt className="w-14 shrink-0 text-xs font-semibold text-ink-dim @3xl:w-auto">
        {wideLabel ? (
          <>
            <span className="@3xl:hidden">{label}</span>
            <span className="hidden @3xl:inline">{wideLabel}</span>
          </>
        ) : (
          label
        )}
      </dt>
      <dd title={value} className={cn("min-w-0 flex-1 truncate text-sm @3xl:flex-none @3xl:text-[13px]", muted ? "text-ink-dim" : "text-ink")}>
        {value}
      </dd>
    </div>
  );
}

function TestInfo({ test }: { test: DemoTest }): ReactNode {
  return (
    <>
      <p className="font-semibold">{test.title}</p>
      <p className="text-xs text-ink-dim">
        <Meta items={[`${test.problems} бодлого`, test.book]} />
      </p>
    </>
  );
}

function TeacherLine({ teacher, empty }: { teacher: LessonView["lead"]; empty: string }) {
  if (!teacher) return <p className="text-ink-dim">{empty}</p>;
  return (
    <p className="flex flex-wrap items-center gap-2">
      <TeacherTag teacher={teacher} className="w-auto" />
      <RolePill role={teacher.role} />
    </p>
  );
}
