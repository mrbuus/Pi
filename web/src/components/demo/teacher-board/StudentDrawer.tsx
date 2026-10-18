"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Minus, Phone, StickyNote, X } from "lucide-react";
import Link from "next/link";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { ATT_META, HW_META, TONE_SELECTED, TONE_TEXT, HwSentIcon } from "../shell/status";
import {
  SEASON_START,
  TUITION_PLAN_LABEL,
  addDays,
  focusOf,
  fmtMoney,
  fmtPhone,
  fromKey,
  lessonDateKeys,
  lessonOn,
  monthLabel,
  paymentOf,
  toKey,
  type AttStatus,
  type DemoClass,
  type DemoLesson,
  type DemoStudent,
  type RiskFlag,
} from "../world";
import { ATT_ORDER } from "./StatusBoxes";
import { dayLabel, resultOf, seenLabel, shortDay, type RecordOf } from "./store";

const fullDate = (k: string) => {
  const d = fromKey(k);
  return `${d.getFullYear()} оны ${d.getMonth() + 1}-р сарын ${d.getDate()}`;
};

function Section({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3.5">
      <h3 className="mb-2 flex items-baseline justify-between gap-2 text-xs font-bold text-ink-dim">
        {title}
        {hint && <span className="font-medium">{hint}</span>}
      </h3>
      {children}
    </section>
  );
}

const PAY_STATUS = {
  paid: { label: "Төлсөн", cls: "bg-success/15 text-success" },
  partial: { label: "Дутуу төлсөн", cls: "bg-warning/15 text-warning" },
  unpaid: { label: "Төлөөгүй", cls: "bg-error/15 text-error" },
} as const;

interface Props {
  cls: DemoClass;
  student: DemoStudent;
  today: string;
  selectedKey: string;
  flags: RiskFlag[];
  recordOf: RecordOf;
  onClose: () => void;
}

/** Сурагчийн товч мэдээлэл: компьютер дээр баруун талын самбар, утсан дээр бүтэн дэлгэц */
export default function StudentDrawer({ cls, student, today, selectedKey, flags, recordOf, onClose }: Props) {
  const sel = fromKey(selectedKey);
  const y = sel.getFullYear();
  const m = sel.getMonth();
  const monthStart = toKey(new Date(y, m, 1));
  const monthEnd = toKey(new Date(y, m + 1, 0));

  // Энэ сарын хичээлтэй өдрүүд (улирал эхэлснээс)
  const monthDays = lessonDateKeys(cls, monthStart < SEASON_START ? SEASON_START : monthStart, monthEnd).filter((k) => lessonOn(cls, k));
  const counts: Record<AttStatus, number> = { present: 0, late: 0, absent: 0, excused: 0 };
  const cells = monthDays.map((k) => {
    const l = lessonOn(cls, k);
    const before = k < student.joinedOn;
    const future = !l || l.status === "upcoming";
    const a = before || future ? null : recordOf(k, student).att;
    if (a) counts[a]++;
    const state = before ? "элсэхээс өмнө" : future ? "хараахан болоогүй" : a ? ATT_META[a].label : "тэмдэглээгүй";
    return { k, a, state, muted: before || future };
  });

  // Сүүлийн 10 хичээл (өнөөдрийг оруулаад, эхэлсэн/дууссан)
  const recent = lessonDateKeys(cls, student.joinedOn > addDays(today, -70) ? student.joinedOn : addDays(today, -70), today)
    .reverse()
    .map((k) => lessonOn(cls, k))
    .filter((l): l is DemoLesson => l !== null && l.status !== "upcoming")
    .slice(0, 10);

  // Багшийн тэмдэглэл: сүүлийн хичээлүүдийн ирц/даалгаврын тайлбар
  const notes = recent
    .flatMap((l) => {
      const r = recordOf(l.dateKey, student);
      const out: Array<{ key: string; date: string; text: string; kind: string }> = [];
      if (r.attNote.trim()) out.push({ key: `${l.dateKey}a`, date: l.dateKey, text: r.attNote.trim(), kind: r.att ? ATT_META[r.att].label : "Ирц" });
      if (r.hwNote.trim()) out.push({ key: `${l.dateKey}h`, date: l.dateKey, text: r.hwNote.trim(), kind: r.hw ? HW_META[r.hw].label : "Даалгавар" });
      return out;
    })
    .slice(0, 6);

  const pay = paymentOf(student);
  const focus = focusOf(student);
  // Сурагч, аав, ээж — гурвуулаа ҮРГЭЛЖ харагдана (дугааргүй бол «оруулаагүй»)
  const phones: Array<{ label: string; phone: string | null }> = [
    { label: "Сурагч", phone: student.phone },
    { label: "Аав", phone: student.fatherPhone },
    { label: "Ээж", phone: student.motherPhone },
  ];

  const facts: Array<[string, string]> = [
    ["Сургууль", student.school],
    ["Анги", `${student.grade}-р анги`],
    ["Сурч эхэлсэн", fullDate(student.joinedOn)],
    ["Бүртгүүлсэн", fullDate(student.registeredOn)],
    ["Сайтад сүүлд орсон", seenLabel(student.lastSeenAt, today)],
    ["Төлбөрийн хэлбэр", TUITION_PLAN_LABEL[student.tuitionPlan]],
  ];

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" />
        <Dialog.Content
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>(`[data-name-id="${student.id}"]`)?.focus();
          }}
          className="elev-3 fixed inset-0 z-[71] flex flex-col bg-surface lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[30rem] lg:border-l lg:border-line"
        >
          <header className="shrink-0 border-b border-line px-4 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Dialog.Title className="cyrillic-heading truncate text-lg font-extrabold text-ink">{student.name}</Dialog.Title>
                <Dialog.Description asChild>
                  <p className="text-xs text-ink-dim">
                    <Meta items={[`${student.lastName} ${student.firstName}`, cls.name, student.code]} />
                  </p>
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Хаах"
                className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink"
              >
                <X className="size-5" aria-hidden />
              </Dialog.Close>
            </div>

            {flags.length > 0 && (
              <div role="note" className="mt-2 flex items-start gap-2 rounded-lg border border-error/40 bg-error/[0.08] px-2.5 py-2 text-sm">
                <span aria-hidden className="mt-1.5 inline-flex size-2.5 shrink-0 rounded-full bg-error ring-2 ring-error/20" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-error">Шалгуур хангаагүй</p>
                  <ul className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 font-semibold text-ink">
                    {flags.map((f) => (
                      <li key={f.kind}>{f.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {phones.map((c) =>
                c.phone ? (
                  <a
                    key={c.label}
                    href={`tel:${c.phone}`}
                    aria-label={`${c.label} руу залгах, ${fmtPhone(c.phone)}`}
                    className="flex min-h-12 min-w-0 flex-col justify-center rounded-lg border border-line px-2 py-1 hover:bg-ink/5"
                  >
                    <span className="flex items-center gap-1 text-[11px] text-ink-dim">
                      <Phone className="size-3 text-brand" aria-hidden />
                      {c.label}
                    </span>
                    <span className="truncate text-sm font-semibold tabular-nums text-ink">{fmtPhone(c.phone)}</span>
                  </a>
                ) : (
                  <span key={c.label} className="flex min-h-12 min-w-0 flex-col justify-center rounded-lg border border-dashed border-line px-2 py-1">
                    <span className="text-[11px] text-ink-dim">{c.label}</span>
                    <span className="truncate text-xs text-ink-dim">оруулаагүй</span>
                  </span>
                ),
              )}
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <Section title={`Ирц, ${monthLabel(y, m)}`}>
              {cells.length ? (
                <>
                  <ul className="flex flex-wrap gap-1">
                    {cells.map((c) => {
                      const meta = c.a ? ATT_META[c.a] : null;
                      const Icon = meta?.icon;
                      const d = fromKey(c.k);
                      return (
                        <li
                          key={c.k}
                          title={`${dayLabel(c.k)}, ${c.state}`}
                          className={cn(
                            "flex h-12 w-9 flex-col items-center justify-center gap-0.5 rounded-lg border text-[11px] tabular-nums",
                            meta ? TONE_SELECTED[meta.tone] : c.muted ? "border-dashed border-line text-ink-dim/60" : "border-line text-ink-dim",
                            c.k === selectedKey && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
                          )}
                        >
                          <span className="font-semibold leading-none">{d.getDate()}</span>
                          {Icon ? <Icon className="size-3.5" aria-hidden /> : c.muted ? <span className="h-3.5" /> : <Minus className="size-3.5 opacity-60" aria-hidden />}
                          <span className="sr-only">
                            {dayLabel(c.k)}, {c.state}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-dim">
                    {ATT_ORDER.map((a) => {
                      const Icon = ATT_META[a].icon;
                      return (
                        <span key={a} className="inline-flex items-center gap-1">
                          <Icon className={cn("size-3.5", TONE_TEXT[ATT_META[a].tone])} aria-hidden />
                          {ATT_META[a].label} <b className="font-bold tabular-nums text-ink">{counts[a]}</b>
                        </span>
                      );
                    })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink-dim">Энэ сард хичээл ороогүй</p>
              )}
            </Section>

            <Section title="Сүүлийн 10 хичээл" hint="Даалгавар, онлайн дүн">
              {recent.length ? (
                <ul className="divide-y divide-line">
                  {recent.map((l) => {
                    const r = recordOf(l.dateKey, student);
                    const meta = r.hw ? HW_META[r.hw] : null;
                    const Icon = meta?.icon;
                    const res = l.homework ? resultOf(student, l.homework) : null;
                    return (
                      <li key={l.dateKey} className="grid min-h-10 grid-cols-[minmax(0,1fr)_6.5rem_3rem_2.75rem] items-center gap-2 py-1.5 text-sm">
                        <span className="min-w-0 leading-tight" title={l.homework?.title}>
                          <span className="block text-ink">{shortDay(l.dateKey)}</span>
                          {l.homework && <span className="block truncate text-xs text-ink-dim">{l.homework.title}</span>}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink">
                          {Icon && meta ? (
                            <>
                              <Icon className={cn("size-4 shrink-0", TONE_TEXT[meta.tone])} aria-hidden />
                              {meta.label}
                            </>
                          ) : (
                            <span className="text-ink-dim">{l.homework ? "Тэмдэглээгүй" : "Даалгаваргүй"}</span>
                          )}
                        </span>
                        <span className="text-right text-xs tabular-nums text-ink-dim" title="Онлайн тест: зөв/нийт">
                          {res ? (
                            <>
                              <b className="font-bold text-ink">{res.correct}</b>/{res.problems.length}
                            </>
                          ) : (
                            "-"
                          )}
                        </span>
                        <span className="inline-flex items-center justify-end gap-0.5 text-xs tabular-nums text-ink-dim" title="Илгээсэн хуудас">
                          {r.submission ? (
                            <>
                              <HwSentIcon className="size-3.5" aria-hidden />
                              {r.submission.pages}
                            </>
                          ) : (
                            "-"
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-ink-dim">Хичээл хараахан ороогүй</p>
              )}
            </Section>

            <Section title="Багшийн тэмдэглэл">
              {notes.length ? (
                <ul className="space-y-2">
                  {notes.map((n) => (
                    <li key={n.key} className="flex gap-2 text-sm">
                      <StickyNote className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-ink">{n.text}</p>
                        <p className="text-xs text-ink-dim">
                          <Meta items={[shortDay(n.date), n.kind]} />
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-dim">Сүүлийн хичээлүүдэд тэмдэглэл алга</p>
              )}
            </Section>

            <Section title="Төлбөр" hint={TUITION_PLAN_LABEL[pay.plan]}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", PAY_STATUS[pay.status].cls)}>{PAY_STATUS[pay.status].label}</span>
                <span className="tabular-nums text-ink">
                  <b className="font-bold">{fmtMoney(pay.paid)}</b>
                  <span className="text-ink-dim"> / {fmtMoney(pay.expected)}</span>
                </span>
                {pay.outstanding > 0 && <span className="tabular-nums text-ink-dim">Үлдэгдэл {fmtMoney(pay.outstanding)}</span>}
              </div>
              {pay.lastPaidOn && <p className="mt-1 text-xs text-ink-dim">Сүүлд төлсөн {fullDate(pay.lastPaidOn)}</p>}
            </Section>

            <Section title="Онлайн идэвх">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                <div>
                  <dt className="text-xs text-ink-dim">Шалгалтын үеэр сайтаас гарсан</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink">
                    {focus.testLeaves} удаа <span className="font-normal text-ink-dim">({focus.testSessions} шалгалтад)</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-dim">Дасгалын үеэр сайтаас гарсан</dt>
                  <dd className="text-sm font-semibold tabular-nums text-ink">{focus.practiceLeaves} удаа</dd>
                </div>
              </dl>
            </Section>

            <Section title="Мэдээлэл">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                {facts.map(([k, v]) => (
                  <div key={k} className="min-w-0">
                    <dt className="text-xs text-ink-dim">{k}</dt>
                    <dd className="text-sm font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>

          <footer className="flex shrink-0 justify-end border-t border-line px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <Link
              href={`/demo/students/${student.id}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-bold text-brand hover:bg-brand-bright/10"
            >
              Бүтэн хуудас
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
