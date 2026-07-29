"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import RequireRole from "@/components/nav/RequireRole";
import AtRiskList from "./AtRiskList";
import ClassroomTable from "./ClassroomTable";
import DateRangePicker, { defaultRange } from "./DateRangePicker";
import EngagementChart from "./EngagementChart";
import KpiTiles from "./KpiTiles";
import { EmptyCard, ErrorCard, LoadingCard } from "./StateCard";
import TopicWeaknessList from "./TopicWeaknessList";
import type {
  AtRiskResponse,
  ClassroomsResponse,
  DateRangeValue,
  EngagementResponse,
  OverviewResponse,
  TopicsResponse,
} from "./types";

interface Query<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_QUERY = <T,>(): Query<T> => ({ data: null, loading: true, error: null });

// Хугацааны мужаас хамаарсан 4 endpoint-ыг зэрэг татаж, тус бүрийг бие
// даасан ачаалж/алдаа-гарсан төлөвтэй болгоно — нэг хэсэг унавал бусад нь
// хэвийн харагдсаар байна.
function useRangedQuery<T>(path: string, range: DateRangeValue) {
  const [state, setState] = useState<Query<T>>(INITIAL_QUERY);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<T>(`${path}?from=${range.from}&to=${range.to}`)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : "Алдаа гарлаа",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, range.from, range.to, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

function useAtRiskQuery(windowDays: number) {
  const [state, setState] = useState<Query<AtRiskResponse>>(INITIAL_QUERY);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api<AtRiskResponse>(`/analytics/at-risk?days=${windowDays}`)
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: e instanceof Error ? e.message : "Алдаа гарлаа",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [windowDays, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <h2 className="font-bold text-brand-soft">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-ink-dim">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [range, setRange] = useState<DateRangeValue>(defaultRange());
  const [atRiskDays, setAtRiskDays] = useState(14);

  const overview = useRangedQuery<OverviewResponse>("/analytics/overview", range);
  const engagement = useRangedQuery<EngagementResponse>("/analytics/engagement", range);
  const classrooms = useRangedQuery<ClassroomsResponse>("/analytics/classrooms", range);
  const topics = useRangedQuery<TopicsResponse>("/analytics/topics", range);
  const atRisk = useAtRiskQuery(atRiskDays);

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h1 className="text-lg font-bold text-ink">Аналитик самбар</h1>
        <p className="mb-3 mt-0.5 text-sm text-ink-dim">
          Сурагчдын идэвх, ангийн оролцоо, сэдвийн амжилт — сүүлийн үеийн
          хандлагад тулгуурлан шийдвэр гаргахад.
        </p>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      <Section title="Гол үзүүлэлт">
        {overview.loading && <LoadingCard />}
        {overview.error && <ErrorCard message={overview.error} onRetry={overview.retry} />}
        {!overview.loading && !overview.error && overview.data && (
          <KpiTiles data={overview.data} />
        )}
      </Section>

      <Section
        title="Өдөр тутмын идэвх"
        subtitle="Тухайн өдөр дор хаяж нэг үйлдэл (нэвтрэх, бодлого, видео гэх мэт) хийсэн сурагчийн тоо"
      >
        {engagement.loading && <LoadingCard />}
        {engagement.error && (
          <ErrorCard message={engagement.error} onRetry={engagement.retry} />
        )}
        {!engagement.loading && !engagement.error && engagement.data && (
          <EngagementChart
            days={engagement.data.days}
            lowConfidence={engagement.data.lowConfidence}
            eventStreamAgeDays={engagement.data.eventStreamAgeDays}
          />
        )}
      </Section>

      <Section
        title="Ангиудын харьцуулалт"
        subtitle="Хамгийн бага оролцоотой анги эхэндээ ирнэ — аль анги хоцорч байгааг шууд харна"
      >
        {classrooms.loading && <LoadingCard />}
        {classrooms.error && (
          <ErrorCard message={classrooms.error} onRetry={classrooms.retry} />
        )}
        {!classrooms.loading && !classrooms.error && classrooms.data && (
          classrooms.data.classrooms.length === 0 ? (
            <EmptyCard message="Идэвхтэй анги алга." />
          ) : (
            <ClassroomTable rows={classrooms.data.classrooms} />
          )
        )}
      </Section>

      <Section
        title="Хамгийн сул сэдвүүд"
        subtitle="Амжилтын хувиар сул сэдэв эхэндээ ирнэ — сургалтын хөтөлбөрт хаана анхаарах хэрэгтэйг харуулна"
      >
        {topics.loading && <LoadingCard />}
        {topics.error && <ErrorCard message={topics.error} onRetry={topics.retry} />}
        {!topics.loading && !topics.error && topics.data && (
          topics.data.topics.length === 0 ? (
            <EmptyCard message="Сонгосон хугацаанд үнэлэгдэх оролдлого алга." />
          ) : (
            <TopicWeaknessList
              topics={topics.data.topics}
              minSample={topics.data.minSample}
            />
          )
        )}
      </Section>

      <Section title="Эрсдэлтэй сурагчид">
        <div className="mb-3 flex items-center gap-2 text-xs">
          <span className="text-ink-dim">Идэвхгүй босго:</span>
          {[7, 14, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAtRiskDays(n)}
              aria-pressed={atRiskDays === n}
              className={`rounded-full px-2.5 py-1 font-semibold transition ${
                atRiskDays === n
                  ? "bg-brand-bright text-on-brand"
                  : "border border-line text-ink-dim hover:text-ink"
              }`}
            >
              {n} хоног
            </button>
          ))}
        </div>
        {atRisk.loading && <LoadingCard />}
        {atRisk.error && <ErrorCard message={atRisk.error} onRetry={atRisk.retry} />}
        {!atRisk.loading && !atRisk.error && atRisk.data && (
          <AtRiskList
            students={atRisk.data.students}
            windowDays={atRisk.data.windowDays}
          />
        )}
      </Section>
    </div>
    </RequireRole>
  );
}
