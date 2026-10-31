"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { CalendarX2, ChevronRight, ClipboardCheck, Clock, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";
import RoomBadge from "@/components/schedule/RoomBadge";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { cleanTitle } from "@/lib/studentTitle";
import HomeworkPhotoPanel from "./HomeworkPhotoPanel";
import TheoryDayPanel from "./TheoryDayPanel";
import { AttendanceMark, HomeworkMark } from "./Marks";
import { dayKey, dayShort, dayTitle, loadMonth, timeRange, useMonthDays } from "./lib";
import type { HubDay, HubDayTest } from "./types";

/**
 * Нэг хичээлийн өдрийн БҮХ мэдээлэл нэг цонхонд (SURAGCH-V2-GEREE): сэдэв, багш, бодлого,
 * тест, миний ирц, багшийн тэмдэглэгээ, онолын зураг, миний даалгаврын зураг.
 * Утсан дээр доороос гарч ирэх хуудас, компьютер дээр баруун талын самбар.
 * URL: /app/my-class?day=YYYY-MM-DD&c=classroomId — линкээр шууд нээгдэнэ.
 */
export default function DaySheet({
  date,
  classroomId,
  onClose,
}: {
  date: string;
  classroomId: string;
  onClose: () => void;
}) {
  const month = date.slice(0, 7);
  const state = useMonthDays(month);
  const day = state?.data?.days.find((d) => dayKey(d.date) === date && d.classroomId === classroomId) ?? null;
  const refresh = () => loadMonth(month, true);
  const loading = !state || (state.status === "loading" && !state.data);

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="elev-3 fixed inset-x-0 bottom-0 z-[71] flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[30rem] lg:rounded-none lg:border-l lg:border-t-0"
        >
          {/* Утсан дээрх чирэх бариул — зөвхөн дүрс */}
          <span aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 lg:hidden" />
          <header className="flex shrink-0 items-start gap-2 border-b border-line px-4 pb-3 pt-2 lg:pt-3">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="cyrillic-heading truncate text-lg font-extrabold text-ink">{dayTitle(date)}</Dialog.Title>
              <Dialog.Description asChild>
                <div className="mt-0.5 flex min-h-5 items-center gap-2 text-xs text-ink-dim">
                  {day && <RoomBadge room={day.room} />}
                  <Meta items={day ? [day.classroomName, timeRange(day.startMinute, day.endMinute)] : ["Хичээлийн өдөр"]} />
                  {state?.status === "loading" && state.data && (
                    <LoaderCircle className="size-3.5 animate-spin text-brand motion-reduce:animate-none" aria-label="Шинэчилж байна" />
                  )}
                </div>
              </Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Хаах"
              className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {loading ? (
              <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3 p-4">
                <SkeletonLine width="60%" height={20} />
                <SkeletonLine width="40%" />
                <div className="skeleton h-16 rounded-lg" />
                <div className="skeleton h-24 rounded-lg" />
              </div>
            ) : state?.status === "error" && !state.data ? (
              <div className="p-4">
                <ErrorState message={state.error ?? "Мэдээлэл ачаалагдсангүй"} onRetry={refresh} />
              </div>
            ) : !day ? (
              <div className="p-4">
                <EmptyState icon={CalendarX2} title="Энэ өдөр хичээл олдсонгүй" hint="Хичээлүүдийн жагсаалтаас өдрөө сонгоно уу" />
              </div>
            ) : (
              <DayBody day={day} onChange={refresh} />
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3.5 last:border-b-0">
      <h3 className="mb-2 flex items-center justify-between gap-2 text-xs font-bold text-ink-dim">
        {title}
        {hint}
      </h3>
      {children}
    </section>
  );
}

function DayBody({ day, onChange }: { day: HubDay; onChange: () => void }) {
  const date = dayKey(day.date);
  const hw = day.homework;
  return (
    <>
      <section className="border-b border-line px-4 py-3.5">
        {day.topic ? (
          <p className="cyrillic-heading text-base font-bold text-ink">{day.topic}</p>
        ) : (
          <p className="text-sm text-ink-dim">Сэдэв оруулаагүй</p>
        )}
        <Meta
          className="mt-1 text-sm text-ink-dim"
          items={[
            day.teachers.length ? day.teachers.join(", ") : null,
            day.problemNumbers ? `Бодлого ${day.problemNumbers}` : null,
          ]}
        />
      </section>

      <Section title="Миний ирц, даалгавар">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-dim">Ирц</dt>
          <dd>
            <AttendanceMark att={day.attendance} />
          </dd>
          <dt className="text-ink-dim">Даалгавар</dt>
          <dd className="flex flex-wrap items-center gap-x-2">
            <HomeworkMark status={hw.status} />
            {hw.checkedOn && hw.status && <span className="text-xs text-ink-dim">{dayShort(hw.checkedOn)} шалгасан</span>}
          </dd>
        </dl>
        {hw.comment && (
          <p className="mt-2.5 whitespace-pre-line rounded-lg border-l-[3px] border-brand-bright bg-panel px-3 py-2 text-sm text-ink">
            {hw.comment}
          </p>
        )}
      </Section>

      <Section title="Тестүүд" hint={day.tests.length ? <span className="font-medium tabular-nums">{day.tests.length}</span> : undefined}>
        {day.tests.length ? (
          <ul className="-mx-2">
            {day.tests.map((t, i) => (
              <TestRow key={`${t.testId ?? "manual"}-${i}`} test={t} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-dim">Энэ өдөр тест хийгээгүй</p>
        )}
      </Section>

      <Section
        title="Онолын зураг"
        hint={
          day.theory.assignedToMe ? (
            <span className="rounded-full bg-brand-bright/15 px-2 py-0.5 text-[11px] font-bold text-brand-soft">Томилогдсон</span>
          ) : undefined
        }
      >
        <TheoryDayPanel classroomId={day.classroomId} date={date} onChange={onChange} embedded />
      </Section>

      <Section title="Миний даалгаврын зураг">
        <HomeworkPhotoPanel
          classroomId={day.classroomId}
          date={date}
          photo={day.homeworkPhoto}
          canSend={day.canSendHomework}
          onChange={onChange}
        />
      </Section>
    </>
  );
}

function TestRow({ test }: { test: HubDayTest }) {
  const title = cleanTitle(test.title, test.variant, test.title);
  const body = (
    <>
      <ClipboardCheck className="size-5 shrink-0 text-brand-soft" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="cyrillic-tight block truncate font-semibold text-ink">{title}</span>
        {test.variant && <span className="text-xs text-ink-dim">{test.variant} хувилбар</span>}
      </span>
    </>
  );
  if (test.testId && test.open) {
    return (
      <li>
        <Link
          href={`/app/my-class/tests/${encodeURIComponent(test.testId)}`}
          className="row-interactive flex min-h-12 items-center gap-3 rounded-lg px-2 py-2"
        >
          {body}
          <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
        </Link>
      </li>
    );
  }
  return (
    <li className="flex min-h-12 items-center gap-3 px-2 py-2">
      {body}
      {test.testId && !test.open && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/5 px-2.5 py-1 text-xs font-semibold text-ink-dim">
          <Clock className="size-3.5" aria-hidden />
          Маргааш нээгдэнэ
        </span>
      )}
    </li>
  );
}
