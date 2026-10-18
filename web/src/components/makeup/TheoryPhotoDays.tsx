"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Camera, ExternalLink, FileText, Images } from "lucide-react";
import { ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/kit/button";
import { api, fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import PhotoPicker from "./PhotoPicker";
import { dayLabel, testLabel, type TheoryDay } from "./types";

const PAGE = 8;

function Tests({ tests }: { tests: TheoryDay["tests"] }) {
  if (!tests.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Тестүүд">
      {tests.map((t) => {
        const { title, variant } = testLabel(t);
        return (
          <li key={t.testId} className="inline-flex items-center gap-1 rounded-lg bg-brand-bright/10 px-2 py-0.5 text-xs font-medium text-brand-soft">
            {title}
            {variant && <span className="font-bold">{variant}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function DayCard({ day, onChange }: { day: TheoryDay; onChange: (next: TheoryDay) => void }) {
  const mine = day.photos.find((p) => p.isMine);
  const others = day.photos.filter((p) => !p.isMine);
  const assignedToMe = day.uploader?.isMe ?? false;

  async function save(keys: string[]) {
    const next = await api<TheoryDay>(`/lesson-day/${day.classroomId}/${day.date}/photos`, {
      method: "POST",
      body: { imageKeys: keys },
    });
    onChange({ ...next, classroomName: day.classroomName });
  }

  return (
    <article className={cn("chunky space-y-3 p-4 sm:p-5", assignedToMe && day.canUpload && !mine && "border-brand-bright/50")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="cyrillic-heading font-bold text-ink">{dayLabel(day.date)}</h3>
          <Meta
            className="mt-0.5 text-sm text-ink-dim"
            items={[
              day.classroomName,
              day.uploader ? (assignedToMe ? "Та илгээнэ" : `Илгээх: ${day.uploader.name}`) : null,
            ]}
          />
        </div>
        {day.photos.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
            <Images className="size-3.5" aria-hidden />
            Илгээсэн
          </span>
        )}
      </div>
      <Tests tests={day.tests} />
      {others.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel px-3 py-2">
          <FileText className="size-5 shrink-0 text-brand-soft" aria-hidden />
          <span className="min-w-0 flex-1 text-sm">
            <span className="font-semibold text-ink">{p.uploaderName}</span>
            <span className="ml-2 tabular-nums text-ink-dim">{p.pages} хуудас</span>
          </span>
          {p.imageKeys.map((key, i) => (
            <a
              key={key}
              href={fileUrl(key)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              {p.imageKeys.length > 1 ? `Нээх ${i + 1}` : "Нээх"}
            </a>
          ))}
        </div>
      ))}
      {day.canUpload ? (
        <div className="space-y-2">
          {!mine && (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-soft">
              <Camera className="size-4" aria-hidden />
              Энэ өдрийн онолын зургийг та илгээнэ
            </p>
          )}
          <PhotoPicker
            key={mine?.imageKeys.join("|") ?? "new"}
            current={mine?.imageKeys ?? []}
            pages={mine?.pages ?? 0}
            onSave={save}
            fileName={`onol-${day.date}.pdf`}
            addLabel="Онолын зураг"
          />
        </div>
      ) : (
        mine && (
          <p className="text-sm text-ink-dim">
            Таны илгээсэн <span className="tabular-nums">{mine.pages}</span> хуудас
          </p>
        )
      )}
      {!day.photos.length && !day.canUpload && <p className="text-sm text-ink-dim">Онолын зураг хараахан ирээгүй</p>}
    </article>
  );
}

export default function TheoryPhotoDays() {
  const [days, setDays] = useState<TheoryDay[] | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    try {
      setDays(await api<TheoryDay[]>("/lesson-day/me/photos"));
      setError("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Онолын зургийг нээж чадсангүй");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ачаалал эхлүүлэх
    void load();
  }, [load, retry]);

  if (error && !days) return <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />;
  if (!days)
    return (
      <div className="chunky space-y-3 p-4" role="status" aria-label="Ачаалж байна">
        <SkeletonLine width="45%" height={16} />
        <SkeletonLine width="30%" />
        <SkeletonLine height={40} />
      </div>
    );

  const upcoming = days.filter((d) => d.upcoming).sort((a, b) => a.date.localeCompare(b.date));
  const past = days.filter((d) => !d.upcoming);

  if (!upcoming.length && !past.length)
    return (
      <EmptyState
        icon={Images}
        title="Онолын зураг алга"
        hint="Багш онолын зураг илгээх сурагчийг томилмогц энд харагдана"
      />
    );

  return (
    <div className="space-y-3">
      {upcoming.length > 0 && (
        <ul className="chunky divide-y divide-line px-4 sm:px-5" aria-label="Дараагийн хичээлүүд">
          {upcoming.map((d) => (
            <li key={`${d.classroomId}:${d.date}`} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <CalendarClock className="size-4 shrink-0 text-brand-soft" aria-hidden />
              <span className="font-medium text-ink">{dayLabel(d.date)}</span>
              <span
                className={cn(
                  "ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  d.uploader?.isMe ? "bg-brand-bright/15 text-brand-soft" : "bg-ink/8 text-ink-dim",
                )}
              >
                {d.uploader?.isMe ? "Та зураг илгээнэ" : `Зураг: ${d.uploader?.name ?? "—"}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {past.slice(0, shown).map((d) => (
        <DayCard
          key={`${d.classroomId}:${d.date}`}
          day={d}
          onChange={(next) =>
            setDays((prev) => (prev ?? []).map((x) => (x.classroomId === next.classroomId && x.date === next.date ? next : x)))
          }
        />
      ))}
      {past.length > shown && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setShown((n) => n + PAGE)}>
          Өмнөх өдрүүд ({past.length - shown})
        </Button>
      )}
    </div>
  );
}
