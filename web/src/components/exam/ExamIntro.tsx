"use client";

import { useEffect, useState, useCallback } from "react";
import { TriangleAlert, Wifi, WifiOff, AlertCircle, CheckCircle2, Circle } from "lucide-react";

import { pingApi } from "@/lib/api";
/* ============================================================================
 * ExamIntro — шалгалт эхлэхийн өмнөх дэлгэц: дүрэм, бэлтгэл, "Эхлэх" товч
 *
 * Фазы:
 * 1. intro — шалгалтын мэдээлэл + "Бэлтгэл шалга" товч
 * 2. prep — сүлжээ, батерей, мэдэгдэл гэх мэт урьдчилан сөрөгдүүлнэ
 * 3. confirmStart — сүүлд "Бэлэн үү?" сальвар
 * ========================================================================== */

export default function ExamIntro({
  title,
  variantLabel,
  problemCount,
  minutes,
  totalPoints,
  manualGrading,
  leaveWarn,
  leaveMax,
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
  leaveWarn: number;
  leaveMax: number;
  resume: boolean;
  starting: boolean;
  confirmStart: boolean;
  error: string;
  /** Товч дарахад: resume бол шууд эхэлнэ, эсрэгээр prep → confirmStart дарна */
  onStart: () => void;
  onConfirmStart: () => void;
  onCancelConfirm: () => void;
  onBack: () => void;
}) {
  const [showPrep, setShowPrep] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [networkValidated, setNetworkValidated] = useState(false);
  const [batteryPercent, setBatteryPercent] = useState<number | null>(null);
  const [checklist, setChecklist] = useState({
    notifications: false,
    silentMode: false,
    quietPlace: false,
  });

  // Сүлжээний төлөв + бодит хүсэлт
  const checkNetwork = useCallback(async () => {
    try {
      setNetworkOnline(await pingApi());
      setNetworkValidated(true);
    } catch {
      setNetworkOnline(false);
      setNetworkValidated(true);
    }
  }, []);

  // Battery Status API-г оролдох (ихэнх хөтөчид үл ажилладаг)
  const checkBattery = useCallback(async () => {
    try {
      if ("getBattery" in navigator) {
        const battery = await (navigator as any).getBattery();
        setBatteryPercent(Math.round(battery.level * 100));
      }
    } catch {
      // API боломжгүй
    }
  }, []);

  useEffect(() => {
    const onOnline = () => setNetworkOnline(true);
    const onOffline = () => setNetworkOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handlePrepStart = useCallback(() => {
    void checkNetwork();
    void checkBattery();
    setShowPrep(true);
  }, [checkNetwork, checkBattery]);

  const handlePrepDone = useCallback(() => {
    setShowPrep(false);
    onStart();
  }, [onStart]);

  // Resume: сүүлд бэлтгэл үзсэн гэж тооцох
  const handleResumeClick = useCallback(() => {
    if (resume) {
      void onStart();
    } else {
      handlePrepStart();
    }
  }, [resume, onStart, handlePrepStart]);

  return (
    <div className="mx-auto max-w-lg">
      {/* === ҮНДСЭН ИНТРО === */}
      {!showPrep && (
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
            <p className="mt-6 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">Энэ шалгалтын дүнг багш гараар оруулна — онлайнаар өгөгдөхгүй.
            </p>
          ) : (
            <>
              <ul className="list-disc pl-5 mt-6 space-y-2 text-left text-sm text-ink-dim">
                <li>Хариулт бүр шууд хадгалагдана — сүлжээ тасарсан ч үргэлжлүүлж болно.</li>
                <li><b className="text-ink">Шударга байдлын хяналт:</b>Хөтчөө нээлттэй байлга. Таб солих,
                  дэлгэцээс гарах, бүтэн дэлгэцээс гарах, хэмжээлэх гэх мэт оролдлого <b className="text-ink">{leaveWarn} дэх удаа</b> анхаарлыг сүрдүүлнэ, <b className="text-ink">{leaveMax} дэх удаа</b>-д шалгалт автоматаар дуусна.
                </li>
                {minutes > 0 && <li>Цагийг сервер тоолно — цаг дуусахад автоматаар илгээгдэнэ.</li>}
              </ul>

              <button
                type="button"
                onClick={handleResumeClick}
                disabled={starting}
                className="glow-pulse mt-7 w-full rounded-xl bg-brand-bright py-4 text-lg font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
                aria-label={resume ? "Үргэлжлүүлэх" : "Бэлтгэл шалга"}
              >
                {starting ? "Ачаалж байна…" : resume ? "Үргэлжлүүлэх" : "Бэлтгэл шалга"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onBack}
            className="mt-3 text-sm text-ink-dim hover:text-ink"
            aria-label="Шалгалтын жагсаалт руу буцах"
          >Буцах
          </button>
          {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
        </div>
      )}

      {/* === БЭЛТГЭЛИЙН ДЭЛГЭЦ === */}
      {showPrep && (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h2 className="text-center text-xl font-bold text-ink">Шалгалтын өмнөх бэлтгэл</h2>

          {/* Сүлжээний төлөв */}
          <div className="mt-6 rounded-xl border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Интернет холболт</span>
              {!networkValidated ? (
                <button
                  type="button"
                  onClick={() => void checkNetwork()}
                  className="text-xs text-ink-dim hover:text-ink"
                >Шалгах…
                </button>
              ) : networkOnline ? (
                <div className="flex items-center gap-2 text-xs text-success">
                  <Wifi className="h-4 w-4" aria-hidden />Холбогдсон
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-error">
                  <WifiOff className="h-4 w-4" aria-hidden />Холбогдоогүй
                </div>
              )}
            </div>
            {!networkOnline && networkValidated && (
              <p className="mt-2 text-xs text-error">Сүлжээнд холбогдоогүй байна. Хүссэнээр холбогдоно уу.</p>
            )}
          </div>

          {/* Батерейны төлөв */}
          <div className="mt-4 rounded-xl border border-line bg-panel p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Утасны цэнэг</span>
              {batteryPercent !== null ? (
                <span className="text-xs text-ink-dim">{batteryPercent}%</span>
              ) : (
                <span className="text-xs text-ink-dim">API ажилладаггүй</span>
              )}
            </div>
            {batteryPercent !== null && batteryPercent < 20 && (
              <p className="mt-2 text-xs text-warning">Цэнэг бага байна. Цэнэглэн авна уу.</p>
            )}
            {batteryPercent === null && (
              <p className="mt-2 text-xs text-ink-dim">Батерейны API ихэнх хөтөчид ажилладаггүй. Утсаа цэнэглэсэн эсэхээ өөрөө шалгана уу.
              </p>
            )}
          </div>

          {/* Гараар сонгох жагсаалт */}
          <div className="mt-4 rounded-xl border border-line bg-panel p-4">
            <p className="mb-3 text-sm font-semibold text-ink">Өмнөх сүүлчүүлэх жагсаалт</p>
            <div className="space-y-2">
              {Object.entries({
                notifications: "Мэдэгдлээ унтраасан",
                silentMode: "Чимээгүй горимд оруулсан",
                quietPlace: "Тайван орчинд байгаа",
              }).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={checklist[key as keyof typeof checklist]}
                    onChange={(e) =>
                      setChecklist((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 cursor-pointer"
                    aria-label={label}
                  />
                  <span className="text-sm text-ink-dim">{label}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-dim">Эдгээр нь зөвлөмж юм. Сонгоогүйгээр үргэлжлүүлж болно.
            </p>
          </div>

          {/* Түүхий лог */}
          <div className="mt-4 rounded-xl border border-line bg-panel p-4">
            <p className="text-xs font-semibold text-ink-dim uppercase">⚙ Техникийн тайлбар</p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-xs text-ink-dim">
              <li>Вэб сайт wifi асаах/унтраахыг хянаж чаддаггүй — самбайн хяналтаас хамаарна</li>
              <li>Батерейны API-г ихэнх хөтөч үл дэмжинэ (HTTPS + хязгаартай)</li>
              <li>Мэдэгдлийг унтраасан эсэхийг вэб сайт нь ҮЛ тоолж чаддаг — ОС-ийн түвшин</li>
              <li>Вэб сайт таб солих, дэлгэцээс гарах гэх мэтийг мэднэ — эдгээр л тоолно</li>
            </ul>
          </div>

          {/* Товчнууд */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPrep(false)}
              className="flex-1 rounded-lg border border-line px-4 py-3 text-sm font-semibold text-ink hover:bg-panel"
            >Эргэж явах
            </button>
            <button
              type="button"
              onClick={handlePrepDone}
              disabled={starting}
              className="flex-1 rounded-lg bg-brand-bright px-4 py-3 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
            >
              {starting ? "Ачаалж байна…" : "Шалгалт эхлэх"}
            </button>
          </div>

          {error && <p className="mt-3 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>}
        </div>
      )}

      {/* === СҮҮЛЧИЙН САНУУЛГА === */}
      {confirmStart && (
        <div className="mt-4 flex min-h-[200px] items-center justify-center rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <div className="text-center">
            <p className="inline-flex items-center gap-1.5 text-lg font-bold text-warning">
              <TriangleAlert className="h-5 w-5" aria-hidden />Анхаар!
            </p>
            <p className="mt-2 text-sm text-ink-dim">
              {minutes > 0 ? (
                <>Танд <b className="text-ink">{minutes} минут</b> байна. Эхэлмэгц цагийг сервер тоолно.
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
              >Болих
              </button>
              <button
                type="button"
                onClick={onConfirmStart}
                className="rounded-lg border border-warning bg-warning/15 px-6 py-2 text-sm font-bold text-warning"
              >Тийм, эхлэх
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
