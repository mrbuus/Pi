"use client";

import { ChevronRight, Info, TriangleAlert, Users } from "lucide-react";
import InfoHint from "@/components/ui/InfoHint";
import { MetaTitle } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import {
  BAR_FILL,
  correctTone,
  RELIABILITY_TEXT,
  useExamAnalytics,
  type ExamAnalytics,
  type ItemAnalytics,
} from "./analytics";
import ClassChips from "./ClassChips";

const BIN_LABELS = ["0–20", "20–40", "40–60", "60–80", "80–100"];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2">
      <p className="text-xs text-ink-dim">{label}</p>
      <p className="font-display text-lg font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

const pct = (v: number | null) => (v === null ? "-" : `${v}%`);

/** «#28» (1-р хэсэг) эсвэл «2-1» (2-р хэсгийн алхмын багц). */
export function itemName(item: Pick<ItemAnalytics, "label" | "group">): string {
  return item.group ? item.label : `#${item.label}`;
}

/**
 * «Тойм» (SHALGALT-TOLOVLOGOO §3): өгсөн/нийт, дундаж, медиан, их/бага,
 * тархалт, анги харьцуулалт, «Анхаарах 5 бодлого», сэдвийн эзэмшил,
 * найдвартай байдал (зөвхөн Багш+/Админ — сервер өөрөө нуудаг).
 */
export default function OverviewTab({
  testId,
  classId,
  onClassChange,
  onOpenItem,
}: {
  testId: string;
  classId: string;
  onClassChange: (id: string) => void;
  onOpenItem: (key: string) => void;
}) {
  const { data, error, retry } = useExamAnalytics(testId, classId);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <LoadingState rows={4} label="Тойм ачаалж байна" />;

  const s = data.summary;
  const expected = s.students - s.absent;

  return (
    <div className="space-y-5">
      <ClassChips chips={data.chips} value={classId} onChange={onClassChange} />

      {s.students === 0 ? (
        <EmptyState
          icon={Users}
          title="Оноосон анги алга"
          hint="«Тохиргоо» табаас ангид оноох эсвэл «Дүн» табаас ангиа сонгож цаасан дүн шивнэ."
        />
      ) : s.taken === 0 ? (
        <EmptyState
          icon={Users}
          title="Дүн хараахан ороогүй"
          hint="Сурагчид онлайнаар өгмөгц эсвэл «Дүн» табаас шивмэгц энд харагдана."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Өгсөн" value={`${s.taken}/${expected}`} />
            <Stat label="Дундаж" value={pct(s.avg)} />
            <Stat label="Медиан" value={pct(s.median)} />
            <Stat label="Хамгийн их" value={pct(s.max)} />
            <Stat label="Хамгийн бага" value={pct(s.min)} />
            <Stat label="Ирээгүй" value={String(s.absent)} />
          </div>

          {data.reliability && <Reliability value={data.reliability} />}

          <Histogram bins={data.histogram} />

          {data.classes.length > 1 && (
            <section aria-labelledby={`cmp-${testId}`} className="space-y-2">
              <h3 id={`cmp-${testId}`} className="text-sm font-bold text-ink">
                Анги харьцуулалт
              </h3>
              <ul className="space-y-1.5">
                {data.classes.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 truncate font-semibold text-ink sm:w-32" title={c.name}>
                      {c.name}
                    </span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/40">
                      <span
                        className="block h-full rounded-full bg-brand-bright"
                        style={{ width: `${c.avg ?? 0}%` }}
                      />
                    </span>
                    <span className="w-20 shrink-0 text-right tabular-nums text-ink">
                      {pct(c.avg)} <span className="text-ink-dim">({c.taken})</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Attention data={data} onOpenItem={onOpenItem} />

          {data.topics.length > 1 && (
            <section aria-labelledby={`topics-${testId}`} className="space-y-2">
              <h3 id={`topics-${testId}`} className="flex items-center gap-1 text-sm font-bold text-ink">
                Сэдвийн эзэмшил
                <InfoHint label="Сэдвийн эзэмшлийн тайлбар">
                  Сэдэв бүрийн бодлогоос авсан оноог боломжит оноонд хуваасан хувь. Сул сэдэв эхэндээ.
                </InfoHint>
              </h3>
              <ul className="space-y-1.5">
                {data.topics.map((t) => (
                  <li key={t.key} className="flex items-center gap-3 text-sm">
                    <span className="w-28 shrink-0 truncate text-ink sm:w-44" title={t.name.replace(/\s+·\s+/g, " — ")}>
                      <MetaTitle>{t.name}</MetaTitle>
                    </span>
                    <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/40">
                      <span
                        className={cn("block h-full rounded-full", BAR_FILL[correctTone(t.percent)])}
                        style={{ width: `${t.percent}%` }}
                      />
                    </span>
                    <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-ink">{t.percent}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.markedStudents < s.taken && (
            <p className="flex items-start gap-2 text-xs text-ink-dim">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {s.taken - data.markedStudents} сурагчийн зөвхөн нийт оноо орсон тул бодлогын задаргаанд ороогүй.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Reliability({ value }: { value: NonNullable<ExamAnalytics["reliability"]> }) {
  const dot = value.level === "GOOD" ? "bg-success" : value.level === "FAIR" ? "bg-warning" : "bg-error";
  return (
    <p className="flex items-center gap-2 text-sm text-ink">
      <span className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", dot)} aria-hidden />
      <span>
        Шалгалтын найдвартай байдал: <span className="font-semibold">{RELIABILITY_TEXT[value.level]}</span>
      </span>
      <InfoHint label="Найдвартай байдлын тайлбар">
        Бодлогууд нэг чадварыг тууштай хэмжиж байгаа эсэх ({value.value.toFixed(2)}). Ногоон — найдвартай, шар — дунд
        зэрэг, улаан — сул: дүнг болгоомжтой тайлбарлана. 10-аас дээш сурагчтай үед бодогдоно.
      </InfoHint>
    </p>
  );
}

function Histogram({ bins }: { bins: number[] }) {
  const max = Math.max(1, ...bins);
  return (
    <section className="space-y-2" aria-label="Онооны тархалт">
      <h3 className="text-sm font-bold text-ink">Тархалт</h3>
      <ol className="grid h-36 grid-cols-5 items-end gap-2 sm:gap-3">
        {bins.map((n, i) => (
          <li key={BIN_LABELS[i]} className="flex h-full flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums text-ink">{n}</span>
            <span
              className={cn("w-full max-w-14 rounded-t-md", n ? "bg-brand-bright" : "bg-line/50")}
              style={{ height: `${Math.max(4, (n / max) * 100)}%` }}
              aria-hidden
            />
            <span className="whitespace-nowrap text-[11px] tabular-nums text-ink-dim">{BIN_LABELS[i]}%</span>
            <span className="sr-only">
              {BIN_LABELS[i]} хувьд {n} сурагч
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Attention({ data, onOpenItem }: { data: ExamAnalytics; onOpenItem: (key: string) => void }) {
  const byKey = new Map(data.items.map((i) => [i.key, i]));
  const rows = data.attention.map((k) => byKey.get(k)).filter((i): i is ItemAnalytics => !!i);
  if (rows.length === 0) return null;
  return (
    <section className="space-y-2" aria-labelledby={`attn-${data.test.id}`}>
      <h3 id={`attn-${data.test.id}`} className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <TriangleAlert className="h-4 w-4 text-warning" aria-hidden /> Анхаарах {rows.length} бодлого
      </h3>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
        {rows.map((item) => {
          const wrong = item.choices?.mostWrong;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onOpenItem(item.key)}
                className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-ink/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                <span className="w-12 shrink-0 font-bold tabular-nums text-ink">{itemName(item)}</span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className="font-semibold tabular-nums text-ink">{item.percent}% зөв</span>
                  {wrong && (
                    <span className="block text-ink-dim sm:inline">
                      <span className="hidden sm:inline"> — </span>
                      Ихэнх нь {wrong.letter}-г сонгосон{wrong.note ? ` (${wrong.note})` : ""}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
