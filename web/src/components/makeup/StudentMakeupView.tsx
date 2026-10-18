"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  Circle,
  CircleCheck,
  ClipboardCheck,
  Images,
  ListChecks,
  LoaderCircle,
  PenLine,
  RotateCcw,
} from "lucide-react";
import { ATTENDANCE_MARKS, TONE_TEXT } from "@/components/attendance/marks";
import { ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Meta } from "@/components/ui/Meta";
import InfoHint from "@/components/ui/InfoHint";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import PhotoPicker from "./PhotoPicker";
import TheoryPhotoDays from "./TheoryPhotoDays";
import { setMakeupCount } from "./MakeupNavBadge";
import { dayLabel, isOpen, type MyMakeup, type MakeupTest, STATUS_CHIP, STATUS_META, testLabel } from "./types";

export function StatusChip({ status }: { status: MyMakeup["status"] }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_CHIP[meta.tone])}>
      <Icon className="size-3.5" aria-hidden />
      {meta.label}
    </span>
  );
}

export function ReasonMark({ reason }: { reason: MyMakeup["reason"] }) {
  const mark = ATTENDANCE_MARKS[reason];
  const Icon = mark.icon;
  return (
    <span className={cn("inline-flex items-center gap-1", TONE_TEXT[mark.tone])}>
      <Icon className="size-4" aria-hidden />
      <span className="text-ink-dim">{mark.label}</span>
    </span>
  );
}

function TestRow({ test, item, onOpened }: { test: MakeupTest; item: MyMakeup; onOpened: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { title, variant } = testLabel(test);
  const href = `/app/tests/${test.testId}`;

  async function start() {
    setBusy(true);
    setError("");
    try {
      await api(`/makeup/me/${item.classroomId}/${item.date}/tests/${test.testId}/open`, { method: "POST" });
      onOpened();
      router.push(href);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Тестийг нээж чадсангүй");
      setBusy(false);
    }
  }

  return (
    <li className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
      {test.done ? (
        <CircleCheck className="size-5 shrink-0 text-success" aria-label="Хийсэн" />
      ) : (
        <Circle className="size-5 shrink-0 text-ink-dim/60" aria-label="Хийгээгүй" />
      )}
      <span className="min-w-0 flex-1">
        <span className={cn("font-medium", test.done ? "text-ink-dim" : "text-ink")}>{title}</span>
        {variant && (
          <span className="ml-1.5 inline-flex size-5 items-center justify-center rounded-md bg-brand-bright/12 align-[1px] text-[11px] font-bold text-brand-soft">
            {variant}
          </span>
        )}
        {test.inClass && <span className="block text-xs text-ink-dim">Ангид хийсэн тул тооцогдсон</span>}
      </span>
      {!test.done &&
        (test.online === false ? (
          <span className="text-xs text-ink-dim">Дүнг багш оруулна</span>
        ) : test.open ? (
          <Button asChild size="sm" variant="secondary">
            <Link href={href}>
              Эхлэх
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={start} disabled={busy}>
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
            Эхлэх
            {!busy && <ArrowRight aria-hidden />}
          </Button>
        ))}
      {error && (
        <p role="alert" className="w-full pl-8 text-xs text-error">
          {error}
        </p>
      )}
    </li>
  );
}

function MakeupCard({ item, onChange }: { item: MyMakeup; onChange: (next?: MyMakeup) => void }) {
  const todo = item.tests.filter((t) => !t.inClass);
  const done = todo.filter((t) => t.done).length;
  const steps = todo.length + 1;
  const stepsDone = done + (item.photosAccepted ? 1 : 0);
  const headingId = `makeup-${item.classroomId}-${item.date}`;

  async function savePhotos(keys: string[]) {
    const next = await api<MyMakeup>(`/makeup/me/${item.classroomId}/${item.date}/photos`, {
      method: "POST",
      body: { imageKeys: keys },
    });
    onChange(next);
  }

  return (
    <article aria-labelledby={headingId} className="chunky overflow-hidden">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 id={headingId} className="cyrillic-heading font-bold text-ink">
            {dayLabel(item.date)} хичээлээ нөхөх
          </h3>
          <Meta className="mt-0.5 text-sm text-ink-dim" items={[item.classroomName, <ReasonMark key="r" reason={item.reason} />]} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-ink-dim" aria-label={`${steps} алхмаас ${stepsDone} хийсэн`}>
            {stepsDone}/{steps}
          </span>
          <StatusChip status={item.status} />
        </div>
      </header>

      <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
        <section aria-label="Тест">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <ClipboardCheck className="size-4 text-brand-soft" aria-hidden />
            Тест, шалгалтын горимоор
          </h4>
          {item.tests.length ? (
            <ul className="mt-1 divide-y divide-line">
              {item.tests.map((t) => (
                <TestRow key={t.testId} test={t} item={item} onOpened={() => onChange()} />
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-ink-dim">Энэ өдөр анги тест хийгээгүй</p>
          )}
        </section>

        <section aria-label="Тэмдэглэлийн зураг">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <PenLine className="size-4 text-brand-soft" aria-hidden />
            Онолын тэмдэглэлийн зураг
            {item.photosAccepted && <CircleCheck className="size-4 text-success" aria-label="Илгээсэн" />}
          </h4>
          {item.resubmit && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-warning">
              <RotateCcw className="size-4 shrink-0" aria-hidden />
              Багш зургаа дахин илгээхийг хүссэн
            </p>
          )}
          <div className="mt-2">
            <PhotoPicker
              key={`${item.imageKeys.join("|")}:${item.submittedAt ?? ""}`}
              current={item.imageKeys}
              pages={item.photos}
              onSave={savePhotos}
              highlight={item.resubmit}
              fileName={`nuhuh-${item.date}.pdf`}
              addLabel="Дэвтрийн зураг"
            />
          </div>
        </section>
      </div>
    </article>
  );
}

function DoneRow({ item }: { item: MyMakeup }) {
  return (
    <li className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2">
      <span className="min-w-0">
        <span className="font-medium text-ink">{dayLabel(item.date)}</span>
        <Meta className="ml-2 text-sm text-ink-dim" items={[item.classroomName]} />
      </span>
      <StatusChip status={item.status} />
    </li>
  );
}

function CardSkeleton() {
  return (
    <div className="chunky space-y-3 p-4 sm:p-5" aria-hidden>
      <SkeletonLine width="60%" height={18} />
      <SkeletonLine width="35%" />
      <div className="space-y-2 pt-2">
        <SkeletonLine height={36} />
        <SkeletonLine height={36} />
      </div>
      <div className="grid grid-cols-3 gap-2 pt-1 sm:grid-cols-4">
        <div className="skeleton aspect-[3/4] rounded-xl" />
        <div className="skeleton aspect-[3/4] rounded-xl" />
      </div>
    </div>
  );
}

export default function StudentMakeupView() {
  const [items, setItems] = useState<MyMakeup[] | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api<MyMakeup[]>("/makeup/me");
      setItems(data);
      setMakeupCount(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Нөхөх хичээлийг нээж чадсангүй");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ачаалал эхлүүлэх
    void load();
  }, [load, reload]);

  // Шалгалтаас буцаж ирэхэд (таб дахин харагдахад) явцыг шинэчилнэ
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  function update(next?: MyMakeup) {
    if (!next) return void load();
    const list = (items ?? []).map((i) => (i.classroomId === next.classroomId && i.date === next.date ? next : i));
    setItems(list);
    setMakeupCount(list);
  }

  const pending = (items ?? []).filter((i) => isOpen(i.status));
  const done = (items ?? []).filter((i) => !isOpen(i.status));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <section aria-labelledby="makeup-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-brand-soft" aria-hidden />
          <h1 id="makeup-title" className="cyrillic-heading text-xl font-extrabold tracking-tight text-ink">
            Нөхөх хичээл
          </h1>
          <InfoHint label="Нөхөх хичээлийн тайлбар">
            Тасалсан, чөлөөтэй эсвэл хоцорсон өдрийн онолоо дэвтэртээ бичээд зургийг нь илгээж, тэр өдрийн тестийн A, B
            хувилбарыг шалгалтын горимоор хийнэ. Ангид суусан бол ангид хийсэн хувилбар тооцогдоно
          </InfoHint>
          {items && pending.length > 0 && (
            <span className="ml-auto rounded-full bg-error/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-error">
              {pending.length} үлдсэн
            </span>
          )}
        </div>

        {error && !items ? (
          <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
        ) : !items ? (
          <div className="space-y-4" role="status" aria-label="Ачаалж байна">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : pending.length ? (
          <div className="space-y-4">
            {pending.map((item) => (
              <MakeupCard key={`${item.classroomId}:${item.date}`} item={item} onChange={update} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CircleCheck}
            title="Нөхөх хичээл алга"
            hint="Хичээл тасалсан, чөлөө авсан эсвэл хоцорсон өдөр энд гарч ирнэ"
          />
        )}

        {done.length > 0 && (
          <details className="group chunky px-4 py-1 sm:px-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold text-ink [&::-webkit-details-marker]:hidden">
              <CircleCheck className="size-4 text-success" aria-hidden />
              Нөхсөн
              <span className="text-sm font-normal tabular-nums text-ink-dim">{done.length}</span>
              <ChevronDown className="ml-auto size-4 text-ink-dim transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden />
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {done.map((item) => (
                <DoneRow key={`${item.classroomId}:${item.date}`} item={item} />
              ))}
            </ul>
          </details>
        )}
      </section>

      <section aria-labelledby="theory-title" className="space-y-4">
        <div className="flex items-center gap-2">
          <Images className="size-5 text-brand-soft" aria-hidden />
          <h2 id="theory-title" className="cyrillic-heading text-lg font-bold text-ink">
            Онолын зураг
          </h2>
          <InfoHint label="Онолын зургийн тайлбар">
            Хичээл бүрийн онолыг томилогдсон сурагч зургаар илгээнэ. Тэр өдрийн тестүүдтэй холбогдож хадгалагдах тул
            хэдэн сарын дараа ч тестийнхээ онолыг эндээс олно
          </InfoHint>
        </div>
        <TheoryPhotoDays />
      </section>
    </div>
  );
}
