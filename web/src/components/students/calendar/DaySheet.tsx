"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRightLeft, CalendarClock, DoorOpen, StickyNote, X } from "lucide-react";
import type { ReactNode } from "react";
import { ATTENDANCE_MARKS, HOMEWORK_MARKS, TONE_TEXT } from "@/components/attendance/marks";
import QuizScoreChip from "@/components/homework-quiz/QuizScoreChip";
import { MakeupVisitBody } from "@/components/makeup-visits/MakeupHistory";
import type { MakeupHistoryItem } from "@/components/makeup-visits/types";
import { useIsDesktop } from "@/components/TeacherDashboard/board/Popover";
import { LATE_RANGE_SHORT, dayLabel, hm, shortDay } from "@/components/TeacherDashboard/board/lib";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { regroupTopicText } from "@/lib/testNames";
import type { LessonDay } from "./types";

export type SheetItem = { kind: "lesson"; day: LessonDay } | { kind: "makeup"; visit: MakeupHistoryItem };

/**
 * Хуанлийн нэг өдрийн дэлгэрэнгүй (эзэн 2026-11-08): ЖИЖИГ цонх — компьютер дээр төвд, утсан дээр
 * доороос гарч доош чирж хаадаг хуудас. X, гадна дарах, Escape — бүгд хаана. Шинэ хуудас нээхгүй.
 */
export default function DaySheet({
  item,
  studentId,
  makeups,
  onClose,
}: {
  item: SheetItem;
  studentId: string;
  /** Тасалсан өдрийн тестийг дараа нь нөхсөн эсэхийг харуулахад */
  makeups: MakeupHistoryItem[];
  onClose: () => void;
}) {
  const desktop = useIsDesktop();
  const date = item.kind === "lesson" ? item.day.date : item.visit.date;
  const title = dayLabel(date);
  const sub =
    item.kind === "lesson" ? (
      <Meta
        items={[
          item.day.classroomName,
          item.day.startMinute !== null && item.day.endMinute !== null
            ? `${hm(item.day.startMinute)}–${hm(item.day.endMinute)}`
            : null,
          item.day.room,
        ]}
      />
    ) : (
      item.visit.label
    );
  const body = item.kind === "lesson" ? <LessonBody day={item.day} makeups={makeups} /> : <MakeupVisitBody v={item.visit} studentId={studentId} />;

  if (!desktop)
    return (
      <Drawer open onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="mx-auto w-full max-w-xl">
          <header className="flex items-start gap-2 border-b border-line px-4 pb-3 pt-2">
            <div className="min-w-0 flex-1">
              <DrawerTitle className="cyrillic-heading text-base font-extrabold text-ink">{title}</DrawerTitle>
              <DrawerDescription className="text-sm text-ink-dim">{sub}</DrawerDescription>
            </div>
            <CloseButton onClick={onClose} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{body}</div>
        </DrawerContent>
      </Drawer>
    );

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/30" />
        <Dialog.Content className="elev-3 fixed left-1/2 top-1/2 z-[71] flex max-h-[80dvh] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-line bg-surface">
          <header className="flex items-start gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="cyrillic-heading text-base font-extrabold text-ink">{title}</Dialog.Title>
              <Dialog.Description className="text-sm text-ink-dim">{sub}</Dialog.Description>
            </div>
            <CloseButton onClick={onClose} />
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">{body}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseButton(props: { onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label="Хаах"
      {...props}
      className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
    >
      <X className="size-5" aria-hidden />
    </button>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 py-1.5 text-sm">
      <dt className="text-xs font-semibold leading-5 text-ink-dim">{label}</dt>
      <dd className="min-w-0 break-words text-ink">{children}</dd>
    </div>
  );
}

function LessonBody({ day, makeups }: { day: LessonDay; makeups: MakeupHistoryItem[] }) {
  const att = day.attendance ? ATTENDANCE_MARKS[day.attendance.status] : null;
  const hw = day.homework?.status ? HOMEWORK_MARKS[day.homework.status] : null;
  const teachers = [day.lead, day.assistant].filter(Boolean) as string[];
  const topic = day.topic ? regroupTopicText(day.topic) : null;
  const missed = day.attendance?.status === "ABSENT" || day.attendance?.status === "EXCUSED";
  // Тасалсан өдрийн тестийг дараа нь нөхсөн нөхөлт
  const testIds = new Set(day.tests.map((t) => t.testId).filter(Boolean));
  const madeUp = missed
    ? makeups.filter((m) => m.date >= day.date && m.tests.some((t) => t.testId && t.source !== "PLANNED" && testIds.has(t.testId)))
    : [];

  return (
    <div>
      {day.movedFrom && (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-dim">
          <CalendarClock className="size-3.5 text-brand" aria-hidden />
          {shortDay(day.movedFrom)}-ний хичээлийг зөөсөн
        </p>
      )}
      {!day.own && (
        <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-info/[0.08] px-2.5 py-1.5 text-xs text-ink">
          <ArrowRightLeft className="size-3.5 shrink-0 text-info" aria-hidden />
          Тэр өдөр өөрийн анги биш {day.classroomName} ангид тэмдэглэгдсэн
        </p>
      )}
      <dl className="divide-y divide-line">
        <Row label="Багш">{teachers.length ? teachers.join(", ") : (day.scheduleTeacher ?? "Оноогоогүй")}</Row>
        <Row label="Сэдэв">
          {day.testsText ? (
            <span className="font-semibold">{day.testsText}</span>
          ) : topic ? (
            <span>
              {topic}
              <span className="ml-1 text-xs text-ink-dim">{day.confirmed ? "" : "төлөвлөгөөгөөр"}</span>
            </span>
          ) : (
            <span className="text-ink-dim">{day.future ? "Төлөвлөөгүй" : "Бүртгэгдээгүй"}</span>
          )}
          {day.testsText && topic && topic !== day.testsText && <span className="mt-0.5 block text-xs text-ink-dim">{topic}</span>}
        </Row>
        {!day.future && (
          <Row label="Ирц">
            {att ? (
              <span>
                <span className={cn("font-semibold", TONE_TEXT[att.tone])}>{att.label}</span>
                {day.attendance?.lateRange && <span className="ml-1">{LATE_RANGE_SHORT[day.attendance.lateRange]}</span>}
                {day.attendance?.note && <span className="mt-0.5 block">{day.attendance.note}</span>}
                {day.attendance?.markedBy && <span className="mt-0.5 block text-xs text-ink-dim">{day.attendance.markedBy}</span>}
              </span>
            ) : (
              <span className="text-ink-dim">Тэмдэглээгүй</span>
            )}
          </Row>
        )}
        {(hw || day.homework?.comment || day.quiz) && (
          <Row label="Даалгавар">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {hw && <span className={cn("font-semibold", TONE_TEXT[hw.tone])}>{hw.label}</span>}
              {day.quiz && <QuizScoreChip score={day.quiz.score} problemCount={day.quiz.problemCount} />}
            </span>
            {day.homework?.comment && <span className="mt-0.5 block">{day.homework.comment}</span>}
          </Row>
        )}
        {day.confirmed && (day.confirmed.description || day.confirmed.problemNumbersText) && (
          <Row label="Батламж">
            {day.confirmed.problemNumbersText && <span className="block">Бодлого: {day.confirmed.problemNumbersText}</span>}
            {day.confirmed.description && <span className="block whitespace-pre-wrap">{day.confirmed.description}</span>}
            <span className="mt-0.5 block text-xs text-ink-dim">{day.confirmed.by}</span>
          </Row>
        )}
        {day.teacherNote && (
          <Row label="Тэмдэглэл">
            <span className="flex gap-1.5">
              <StickyNote className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
              <span className="whitespace-pre-wrap">{day.teacherNote.body}</span>
            </span>
            <span className="mt-0.5 block text-xs text-ink-dim">{day.teacherNote.by}</span>
          </Row>
        )}
        {missed && day.tests.length > 0 && (
          <Row label="Нөхөлт">
            {madeUp.length ? (
              <ul className="space-y-0.5">
                {madeUp.map((m) => (
                  <li key={m.id} className="flex items-center gap-1.5">
                    {m.place.kind === "ROOM_406" ? (
                      <DoorOpen className="size-3.5 text-brand" aria-hidden />
                    ) : (
                      <ArrowRightLeft className="size-3.5 text-brand" aria-hidden />
                    )}
                    {shortDay(m.date)}, {m.label}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="font-semibold text-warning">Нөхөөгүй</span>
            )}
          </Row>
        )}
      </dl>
    </div>
  );
}
