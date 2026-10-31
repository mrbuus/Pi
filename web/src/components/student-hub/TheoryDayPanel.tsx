"use client";

import { useCallback, useEffect, useState } from "react";
import { Camera, Images, UserCheck } from "lucide-react";
import { dayLabel, testLabel } from "@/components/makeup/types";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import PhotoPages from "./PhotoPages";
import PhotoSetSender, { sentTime } from "./PhotoSetSender";
import { THEORY_MAX_PAGES, type TheoryDayV2, type TheoryListDay, type TheoryPhotoSet } from "./photo-types";

function AssignedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-bright/10 px-2 py-0.5 text-[11px] font-semibold text-brand-soft">
      <UserCheck className="size-3.5" aria-hidden />
      Томилогдсон
    </span>
  );
}

function SetHeading({ set, assigned }: { set: TheoryPhotoSet; assigned: boolean }) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <span className="cyrillic-tight truncate font-bold text-ink">{set.isMine ? "Таны зураг" : set.uploaderName}</span>
      {assigned && <AssignedTag />}
    </span>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Ачаалж байна">
      <SkeletonLine width="55%" height={16} />
      <div className="flex gap-2">
        <SkeletonLine width={90} height={22} />
        <SkeletonLine width={70} height={22} />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-xl" aria-hidden />
        ))}
      </div>
    </div>
  );
}

/**
 * Нэг хичээлийн өдрийн онолын зураг: сэдэв, тест, ангийнхны илгээсэн бүх багц
 * (жижиг зураг → бүтэн дэлгэц), өөрийн багцаа илгээх / солих / устгах.
 * Илгээх эрх (`canUpload`): тухайн өдөр ангид байсан сурагч, өнөөдөр ба сүүлийн 13 хоног.
 */
export default function TheoryDayPanel({
  classroomId,
  date,
  onChange,
  embedded = false,
}: {
  classroomId: string;
  date: string;
  onChange?: () => void;
  /** Өдрийн дэлгэрэнгүйд — сэдэв, тест дээр нь харагдсан тул давтахгүй */
  embedded?: boolean;
}) {
  const [day, setDay] = useState<TheoryDayV2 | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  // Шинээр илгээсний дараа миний багцад «Илгээгдлээ» харуулна
  const [flash, setFlash] = useState(false);
  const base = `/lesson-day/${encodeURIComponent(classroomId)}/${date}/photos`;

  const load = useCallback(async () => {
    try {
      const data = await api<TheoryDayV2>(base);
      setDay(data);
      setError("");
      if ("topic" in data) {
        setTopic(data.topic ?? null);
      } else {
        // Сэдэв энэ хариунд байхгүй — өдрийн жагсаалтаас (алдаа гарвал сэдэвгүй үлдэнэ)
        api<TheoryListDay[]>(`/student-hub/theory?from=${date}&to=${date}`)
          .then((rows) => setTopic(rows.find((r) => r.classroomId === classroomId)?.topic ?? null))
          .catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Онолын зургийг нээж чадсангүй");
    }
  }, [base, classroomId, date]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ачаалал эхлүүлэх
    void load();
  }, [load, retry]);

  async function save(keys: string[]) {
    const next = await api<TheoryDayV2>(base, { method: "POST", body: { imageKeys: keys } });
    setDay((prev) => ({ ...next, classroomName: next.classroomName || prev?.classroomName || "" }));
    setFlash(keys.length > 0);
    onChange?.();
  }

  if (error && !day) return <ErrorState message={error} onRetry={() => setRetry((n) => n + 1)} />;
  if (!day) return <PanelSkeleton />;

  const assigned = day.uploader;
  const isAssigned = (p: TheoryPhotoSet) =>
    !!assigned && (p.isMine ? assigned.isMe : !assigned.isMe && p.uploaderName === assigned.name);
  const mine = day.photos.find((p) => p.isMine);
  const sets = [...day.photos].sort(
    (a, b) =>
      Number(isAssigned(b)) - Number(isAssigned(a)) ||
      Number(b.isMine) - Number(a.isMine) ||
      a.createdAt.localeCompare(b.createdAt),
  );
  const assignedToMe = day.assignedToMe ?? assigned?.isMe ?? false;
  const subtitle = [dayLabel(date), day.classroomName].filter(Boolean).join(" — ");

  return (
    <div className="space-y-4">
      {!embedded && (topic || day.tests.length > 0) && (
        <div className="space-y-2">
          {topic && <p className="cyrillic-tight text-base font-semibold text-ink">{topic}</p>}
          {day.tests.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Тестүүд">
              {day.tests.map((t) => {
                const { title, variant } = testLabel(t);
                return (
                  <li
                    key={t.testId}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-bright/10 px-2 py-0.5 text-xs font-medium text-brand-soft"
                  >
                    {title}
                    {variant && <span className="font-bold">{variant}</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {day.canUpload && !mine && (
        <section
          aria-label="Онолын зураг илгээх"
          className="space-y-3 rounded-xl border border-brand-bright/40 bg-brand-bright/5 p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Camera className="size-5 shrink-0 text-brand-soft" aria-hidden />
            <h3 className="font-bold text-ink">Онолын зураг илгээх</h3>
            {assignedToMe && <AssignedTag />}
          </div>
          <PhotoSetSender
            sent={null}
            canEdit
            onSave={save}
            purpose="theory"
            maxPages={THEORY_MAX_PAGES}
            crop
            fileName={`onol-${date}.pdf`}
            viewerTitle="Таны зураг"
            viewerSubtitle={subtitle}
          />
        </section>
      )}

      {sets.length > 0 ? (
        <ul className="space-y-3" aria-label="Илгээсэн зургууд">
          {sets.map((p) => (
            <li key={p.id} className="space-y-3 rounded-xl border border-line bg-surface p-3 sm:p-4">
              {p.isMine && day.canUpload ? (
                <PhotoSetSender
                  sent={{ keys: p.imageKeys, pages: p.pages, at: p.createdAt }}
                  canEdit
                  onSave={save}
                  onDelete={() => save([])}
                  purpose="theory"
                  maxPages={THEORY_MAX_PAGES}
                  crop
                  fileName={`onol-${date}.pdf`}
                  viewerTitle="Таны зураг"
                  viewerSubtitle={subtitle}
                  heading={<SetHeading set={p} assigned={isAssigned(p)} />}
                  autoLoad
                  flash={flash}
                />
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <SetHeading set={p} assigned={isAssigned(p)} />
                    <Meta className="text-sm tabular-nums text-ink-dim" items={[sentTime(p.createdAt), `${p.pages} хуудас`]} />
                  </div>
                  <PhotoPages
                    keys={p.imageKeys}
                    pages={p.pages}
                    title={p.isMine ? "Таны зураг" : p.uploaderName}
                    subtitle={subtitle}
                    autoLoad
                  />
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        !day.canUpload && (
          <EmptyState
            icon={Images}
            title="Онолын зураг алга"
            hint={assigned ? `Томилогдсон: ${assigned.name}` : "Ангийнхан илгээмэгц энд харагдана"}
          />
        )
      )}
    </div>
  );
}
