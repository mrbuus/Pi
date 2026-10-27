"use client";

import { useState } from "react";
import { BookOpen, BrainCircuit, CalendarCheck, History, Target } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { formatMnDate } from "@/lib/dateMn";
import { minuteLabel } from "./meta";
import { MissedProblems, TopicBar } from "./ExamParts";
import { Panel } from "./OverviewTab";
import PastCoverageDialog from "./PastCoverageDialog";
import type { ClassDashboard } from "./types";

const SOURCE_LABEL: Record<string, string> = {
  MANUAL: "Гараар тохируулсан",
  LESSON_TOPIC: "Хичээлийн сэдвээс",
  COVERED: "Үзсэн сэдвээс",
  EXAM: "Сүүлийн шалгалтаас",
};

export default function TopicsTab({ data, onChanged }: { data: ClassDashboard; onChanged?: () => void }) {
  const cur = data.syllabus.current;
  const coverage = data.syllabus.coverage;
  const [marking, setMarking] = useState(false);
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Panel
        icon={BookOpen}
        title="Одоогийн бүлэг"
        hint="Гараар тохируулсан бүлэг, эс бөгөөс хичээлийн сэдэв, эс бөгөөс үзсэн сэдвийн хамгийн хол бүлэг (батлагдсан хичээл ба өмнө үзсэн), эс бөгөөс сүүлийн шалгалтаас"
      >
        {cur ? (
          <div>
            <p className="text-lg font-bold text-ink">{cur.title}</p>
            <Meta className="text-sm text-ink-dim" items={[cur.book, cur.topic, cur.source ? SOURCE_LABEL[cur.source] : null]} />
            {cur.position && cur.total && (
              <div className="mt-3">
                <div className="h-2.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                  <span className="block h-full rounded-full bg-brand-bright" style={{ width: `${(cur.position / cur.total) * 100}%` }} />
                </div>
                <p className="mt-1 text-sm text-ink">
                  Бүлэг <span className="font-semibold tabular-nums">{cur.position}</span> / {cur.total}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-dim">Одоогийн бүлэг тодорхойгүй — өмнө үзсэн сэдвээ тэмдэглэх эсвэл хичээл батлах үед гарна</p>
        )}
        {coverage && coverage.books.length > 0 && (
          <ul className="mt-4 space-y-2.5" aria-label="Номын явц">
            {coverage.books.map((b) => (
              <li key={b.code} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{b.title}</span>
                  <span className="shrink-0 tabular-nums text-ink-dim">
                    {b.coveredChapters}/{b.totalChapters} бүлэг
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-brand-bright"
                    style={{ width: `${b.totalChapters ? (b.coveredChapters / b.totalChapters) * 100 : 0}%` }}
                  />
                </div>
                {b.pastChapters > 0 && <p className="mt-0.5 text-xs text-ink-dim">{b.pastChapters} бүлэг нь өмнө үзсэн</p>}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setMarking(true)}
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-brand hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
        >
          <History className="h-4 w-4" aria-hidden /> Өмнө үзсэн сэдэв тэмдэглэх
        </button>
      </Panel>

      <Panel icon={CalendarCheck} title="Батлагдсан хичээлүүд" hint="Өдрийн хичээлээс багш баталсан хичээл (сүүлийн 60 хоног)">
        <p className="text-sm text-ink">
          Нийт <span className="font-semibold tabular-nums">{data.syllabus.confirmedLessons}</span> хичээл
        </p>
        {!!coverage?.pastTests && (
          <p className="mt-1 text-sm text-ink">
            Өмнө үзсэн <span className="font-semibold tabular-nums">{coverage.pastTests}</span> тест
            <span className="text-ink-dim"> — огноогүй</span>
          </p>
        )}
        {data.syllabus.recentLessons.length === 0 ? (
          <p className="mt-2 text-sm text-ink-dim">«Өдрийн хичээл» хэсэгт хичээл батлахад энд сэдвийн дараалал гарна</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {data.syllabus.recentLessons.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-24 shrink-0 tabular-nums text-ink-dim">{formatMnDate(l.date)}</span>
                  <span className="min-w-0 flex-1 truncate font-semibold text-ink">{l.topic || "Сэдэв бичээгүй"}</span>
                </div>
                <Meta
                  className="mt-0.5 text-xs text-ink-dim"
                  items={[minuteLabel(l.startMinute), l.lead, l.assistant, `${l.present}/${l.enrolled} ирсэн`]}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon={BrainCircuit} title="Сэдвийн эзэмшил — бодлогоор" hint="Ангийн сурагчдын бүх оролдлого (16 долоо хоног), сэдвээр. «Буудсан» хариулт зөвд орохгүй">
        {data.topics.practice.length === 0 ? (
          <p className="text-sm text-ink-dim">Сэдэвт холбогдсон бодлогын оролдлого хараахан алга</p>
        ) : (
          <ul className="space-y-2">
            {data.topics.practice.map((t) => (
              <TopicBar
                key={t.topicId}
                name={t.name}
                percent={t.accuracy}
                note={`${t.attempts} оролдлого, ${t.students} сурагч${t.guessed ? `, ${t.guessed} буудсан` : ""}`}
              />
            ))}
          </ul>
        )}
      </Panel>

      <Panel icon={Target} title="Сэдвийн эзэмшил — шалгалтаар" hint="Ангид оноосон шалгалтын бодлого бүрийн оноогоор">
        {data.topics.exam.length === 0 ? (
          <p className="text-sm text-ink-dim">Бодлого тус бүрийн дүн оруулсан шалгалт алга</p>
        ) : (
          <ul className="space-y-2">
            {data.topics.exam.map((t) => (
              <TopicBar key={t.key} name={t.name} percent={t.percent} note={`${t.earned}/${t.max}`} />
            ))}
          </ul>
        )}
      </Panel>

      {marking && (
        <PastCoverageDialog
          classroomId={data.classroom.id}
          className={data.classroom.name}
          onClose={() => setMarking(false)}
          onSaved={() => onChanged?.()}
        />
      )}

      {data.problems.length > 0 && (
        <div className="lg:col-span-2">
          <MissedProblems problems={data.problems} />
        </div>
      )}
    </div>
  );
}
