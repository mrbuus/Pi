"use client";
import { useEffect, useState } from "react";
import { Video, X } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LessonVideoPlayer, { type LessonVideo } from "./LessonVideoPlayer";
type VideoSummary = { id: string; title: string; duration: number | null };
export default function ProblemVideoDisclosure({
  problemId,
  autoOpen = false,
  onClose,
}: {
  problemId: string;
  /**
   * Бодлогын сан: гох (дүрс товч) нь гадна талд, энэ компонент зөвхөн нээлттэй
   * самбарыг харуулна — гурван дүрс нэг мөрөнд хамт үлдэнэ (эзний хүсэлт 2026-10-18)
   */
  autoOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(autoOpen),
    [rows, setRows] = useState<VideoSummary[]>([]),
    [selected, setSelected] = useState<LessonVideo | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function reveal() {
    setOpen(true);
    setBusy(true);
    setError("");
    try {
      setRows(
        await api<VideoSummary[]>(
          `/videos/problem?problemId=${encodeURIComponent(problemId)}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Бичлэг ачаалсангүй");
    } finally {
      setBusy(false);
    }
  }
  // autoOpen үед жагсаалтыг mount-ийн дараа ачаална (render дотор state шууд өөрчлөхгүй)
  useEffect(() => {
    if (autoOpen) void Promise.resolve().then(reveal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function select(id: string) {
    setBusy(true);
    setError("");
    try {
      setSelected(
        await api<LessonVideo>(`/videos/${encodeURIComponent(id)}/open`, {
          method: "POST",
          body: { problemId },
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Бичлэг нээгдсэнгүй");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      {!open ? (
        <Button variant="outline" onClick={reveal}>
          <Video aria-hidden /> Бичлэгээр тайлбар
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-line p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Бичлэгээр тайлбар</p>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setSelected(null);
                onClose?.();
              }}
            >
              <X aria-hidden /> Бодлогод буцах
            </Button>
          </div>
          {busy && <p role="status">Ачаалж байна…</p>}
          {error && (
            <p role="alert" className="text-sm text-error">
              {error}
            </p>
          )}
          {!busy && !error && !rows.length && (
            <p className="text-sm text-ink-dim">
              Энэ бодлогод бичлэг хараахан холбогоогүй.
            </p>
          )}
          {rows.map((v) => (
            <Button
              key={v.id}
              variant="outline"
              disabled={busy}
              onClick={() => select(v.id)}
              className="h-auto min-h-11 w-full whitespace-normal"
            >
              {v.title}
            </Button>
          ))}
          {selected && (
            <>
              <p className="text-xs text-ink-dim">
                Тайлбар нээсэн үйлдлийг тусламжтай оролдлогын баримт болгон
                хадгална. Бичлэгийг бүрэн үзсэн гэж тооцохгүй.
              </p>
              <LessonVideoPlayer key={selected.id} video={selected} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
