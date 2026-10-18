"use client";

import { CircleCheck, Phone } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { RiskMark } from "../shell/status";
import { DEFAULT_CRITERIA, fmtPhone } from "../world";
import { AttRate, FlagBadges, HwRate, Legend, LegendItem, StudentLink } from "./common";
import { WINDOW_DAYS, type StudentStat } from "./stats";

/** Залгах дугаар: эцэг эх (аав, ээж), байхгүй бол сурагч өөрөө */
function contactOf(s: StudentStat["student"]): { who: string; phone: string } {
  if (s.fatherPhone) return { who: "Аав", phone: s.fatherPhone };
  if (s.motherPhone) return { who: "Ээж", phone: s.motherPhone };
  return { who: "Сурагч", phone: s.phone };
}

/** Шалгуур хангаагүй сурагчид: шалтгаан нь улаан шошгоор, эцэг эх рүү шууд залгах холбоостой */
export default function RiskPanel({ rows }: { rows: StudentStat[] }) {
  const risky = rows
    .filter((r) => r.flags.length > 0)
    .sort((a, b) => b.flags.length - a.flags.length || (a.att ?? 101) - (b.att ?? 101) || a.student.index - b.student.index);

  return (
    <div>
      {risky.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Шалгуур хангаагүй сурагч алга" hint={`Сүүлийн ${WINDOW_DAYS} хоногт бүх сурагч ирц, даалгаврын шалгуурыг хангасан`} />
      ) : (
        <ul className="divide-y divide-line">
          {risky.map((r) => {
            const c = contactOf(r.student);
            return (
              <li key={r.student.id} className="flex items-start gap-3 py-3">
                <RiskMark flags={r.flags} className="mt-[0.4rem]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <StudentLink id={r.student.id} className="text-sm">
                      {r.student.name}
                    </StudentLink>
                    <span className="text-xs text-ink-dim">
                      <Meta items={[<span key="a">Ирц <AttRate value={r.att} className="text-xs" /></span>, <span key="h">Даалгавар <HwRate value={r.hw} className="text-xs" /></span>]} />
                    </span>
                  </div>
                  <FlagBadges flags={r.flags} />
                </div>
                <a
                  href={`tel:${c.phone}`}
                  aria-label={`${c.who}-д залгах, ${fmtPhone(c.phone)}`}
                  className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink transition-colors hover:bg-ink/5"
                >
                  <Phone className="size-4 text-brand" aria-hidden />
                  <span className="hidden tabular-nums sm:inline">
                    {c.who} {fmtPhone(c.phone)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
      <Legend>
        <LegendItem>
          Шалгуур (сүүлийн {DEFAULT_CRITERIA.windowDays} хоног): ирц {DEFAULT_CRITERIA.minAttendance}%-иас бага, {DEFAULT_CRITERIA.maxAbsences}+ тасалсан, {DEFAULT_CRITERIA.maxLates}+ хоцорсон,
          даалгавар {DEFAULT_CRITERIA.minHomework}%-иас бага, {DEFAULT_CRITERIA.missingStreak}+ дараалан хийгээгүй
        </LegendItem>
        <LegendItem>Багш+ шалгуурыг ангиараа тохируулна</LegendItem>
      </Legend>
    </div>
  );
}
