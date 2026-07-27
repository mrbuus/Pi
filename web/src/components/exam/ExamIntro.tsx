"use client";

/* ============================================================================
 * ExamIntro — шалгалт эхлэхийн өмнөх дэлгэц: мэдээлэл, дүрэм, "Эхлэх"
 * товч, эхлэхийн өмнөх сануулга (confirmStart).
 * ========================================================================== */

export default function ExamIntro({
  title,
  variantLabel,
  problemCount,
  minutes,
  totalPoints,
  manualGrading,
  maxLeaves,
  resume,
  starting,
  confirmStart,
  error,
  onStart,
  onConfirmStart,
  onCancelConfirm,
  onBack,
}: {
  title: string;
  variantLabel?: string | null;
  problemCount: number;
  minutes: number;
  totalPoints: number;
  manualGrading: boolean;
  maxLeaves: number;
  resume: boolean;
  starting: boolean;
  confirmStart: boolean;
  error: string;
  /** Товч дарахад: resume бол шууд эхэлнэ, эсрэгээр сануулга нээнэ */
  onStart: () => void;
  onConfirmStart: () => void;
  onCancelConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-bright">Шалгалт</p>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">
          {title}
          {variantLabel && <span className="ml-1 text-ink-dim">({variantLabel})</span>}
        </h1>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Бодлого" value={`${problemCount}`} />
          <Stat label="Хугацаа" value={minutes ? `${minutes} мин` : "Хязгааргүй"} />
          <Stat label="Нийт оноо" value={`${totalPoints}`} />
        </div>

        {manualGrading ? (
          <p className="mt-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
            Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөгдөхгүй.
          </p>
        ) : (
          <>
            <ul className="mt-6 space-y-2 text-left text-sm text-ink-dim">
              <li>• Хариулт бүр шууд хадгалагдана — гэнэт тасарсан ч үргэлжлүүлж болно.</li>
              <li>
                • Шалгалтын горимоос ({maxLeaves - 1} удаа хүртэл) гарвал анхааруулна, {maxLeaves} дахь
                удаад автоматаар дуусна.
              </li>
              {minutes > 0 && <li>• Цагийг сервер тоолно — цаг дуусахад автоматаар илгээгдэнэ.</li>}
            </ul>

            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              className="glow-pulse mt-7 w-full rounded-xl bg-brand-bright py-4 text-lg font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
            >
              {starting ? "Ачаалж байна…" : resume ? "Үргэлжлүүлэх" : "Шалгалт эхлэх"}
            </button>
          </>
        )}
        <button type="button" onClick={onBack} className="mt-3 text-sm text-ink-dim hover:text-ink">
          Буцах
        </button>
        {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
      </div>

      {confirmStart && (
        <div className="mt-4 flex min-h-[200px] items-center justify-center rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <div className="text-center">
            <p className="text-lg font-bold text-warning">⏱ Анхаар!</p>
            <p className="mt-2 text-sm text-ink-dim">
              {minutes > 0 ? (
                <>
                  Танд <b className="text-ink">{minutes} минут</b> байна. Эхэлмэгц цагийг сервер тоолно.
                  Бэлэн үү?
                </>
              ) : (
                <>Шалгалтыг эхлүүлэх үү?</>
              )}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={onCancelConfirm}
                className="rounded-lg border border-line px-5 py-2 text-sm text-ink"
              >
                Болих
              </button>
              <button
                type="button"
                onClick={onConfirmStart}
                className="rounded-lg border border-warning bg-warning/15 px-6 py-2 text-sm font-bold text-warning"
              >
                Тийм, эхлэх
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-panel p-3">
      <p className="text-xl font-extrabold text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-dim">{label}</p>
    </div>
  );
}
