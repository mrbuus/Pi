"use client";

import { FilePen, LoaderCircle, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import InfoHint from "@/components/ui/InfoHint";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { getRole } from "@/lib/api";
import { cn } from "@/lib/cn";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import { draftApi } from "./draftApi";
import { SUBJECT_LABEL, type DraftSetSummary } from "./model";
import { NoAccess } from "./SetDialogs";

const noop = () => () => {};
type Filter = "ALL" | "DRAFT" | "PUBLISHED";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "Бүгд" },
  { value: "DRAFT", label: "Ноорог" },
  { value: "PUBLISHED", label: "Нийтэлсэн" },
];

export default function SetList() {
  const role = useSyncExternalStore(noop, getRole, () => null);
  if (role === null) return null;
  if (role !== "ADMIN" && role !== "TEACHER_PLUS") return <NoAccess />;
  return <List />;
}

function List() {
  const router = useRouter();
  const [sets, setSets] = useState<DraftSetSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    draftApi
      .list()
      .then((list) => {
        if (!alive) return;
        setSets(list);
        setError(null);
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Жагсаалт ирсэнгүй"));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const counts = useMemo(
    () => ({
      ALL: sets?.length ?? 0,
      DRAFT: sets?.filter((s) => s.status === "DRAFT").length ?? 0,
      PUBLISHED: sets?.filter((s) => s.status === "PUBLISHED").length ?? 0,
    }),
    [sets],
  );
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (sets ?? []).filter(
      (s) =>
        (filter === "ALL" || s.status === filter) &&
        (!needle || `${s.title} ${s.topic ?? ""} ${s.chapter?.title ?? ""}`.toLowerCase().includes(needle)),
    );
  }, [filter, q, sets]);

  async function create() {
    setCreating(true);
    try {
      const set = await draftApi.create();
      router.push(`/app/internal/${set.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ноорог үүсгэж чадсангүй");
      setCreating(false);
    }
  }

  return (
    <div className="pb-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="cyrillic-heading text-[28px] font-extrabold leading-tight tracking-tight text-ink">Дотоод</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-dim">
            Нийтлэхээс өмнөх бодлого, тестийн ноорог
            <InfoHint label="Хэн харах вэ">Зөвхөн Багш+ болон Админ харна — сурагч, эцэг эхэд хэзээ ч харагдахгүй</InfoHint>
          </p>
        </div>
        <Button onClick={() => void create()} disabled={creating}>
          {creating ? <LoaderCircle className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
          Шинэ ноорог
        </Button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Төлөв" className="inline-flex rounded-2xl bg-ink/5 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition",
                filter === f.value ? "bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink",
              )}
            >
              {f.label}
              {sets && <span className="text-xs font-bold text-ink-dim">{counts[f.value]}</span>}
            </button>
          ))}
        </div>
        <label className="relative min-w-0 flex-1 basis-56">
          <span className="sr-only">Хайх</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Нэр, сэдвээр хайх"
            className="min-h-11 w-full rounded-2xl border border-line bg-surface pl-10 pr-3 text-[15px] text-ink placeholder:text-ink-dim/70 focus:border-brand-bright focus:outline-none focus:ring-2 focus:ring-brand-bright/25"
          />
        </label>
      </div>

      {error && !sets ? (
        <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
      ) : !sets ? (
        <div role="status" aria-label="Ноорог ачаалж байна" className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="chunky space-y-3 p-5">
              <SkeletonLine width="70%" height={20} />
              <SkeletonLine width="50%" />
              <SkeletonLine width="35%" />
            </div>
          ))}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState
          icon={FilePen}
          title="Ноорог алга"
          hint="Шинэ ноорог үүсгээд бодлогоо бичих, ChatGPT эсвэл Word-оос оруулна"
          action={
            <Button onClick={() => void create()} disabled={creating}>
              <Plus aria-hidden /> Шинэ ноорог
            </Button>
          }
        />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title="Тохирох ноорог алга" hint="Өөр үгээр хайх эсвэл шүүлтүүрийг солино" />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {shown.map((s) => (
            <li key={s.id}>
              <Link
                href={`/app/internal/${s.id}`}
                className="chunky chunky-press flex h-full flex-col gap-3 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/50"
              >
                <div className="flex items-start gap-3">
                  <h2 className="line-clamp-2 min-w-0 flex-1 text-[17px] font-bold leading-snug text-ink">{s.title}</h2>
                  <Badge tone={s.status === "PUBLISHED" ? "success" : "brand"} className="shrink-0">
                    {s.status === "PUBLISHED" ? "Нийтэлсэн" : "Ноорог"}
                  </Badge>
                </div>
                <Meta
                  className="text-sm text-ink-dim"
                  items={[
                    SUBJECT_LABEL[s.subject],
                    s.chapter ? s.chapter.title.replace(/\s+·\s+/g, " — ") : null,
                    s.topic,
                  ]}
                />
                <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-display text-xl font-bold text-ink">{s.count}</span>
                    <span className="text-sm text-ink-dim">бодлого</span>
                  </span>
                  <span className="text-right text-xs leading-snug text-ink-dim">
                    {s.updatedByName}
                    <br />
                    {s.changedSincePublish ? "нийтэлснээс хойш засварласан, " : ""}
                    {relativeTimeMn(s.updatedAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
