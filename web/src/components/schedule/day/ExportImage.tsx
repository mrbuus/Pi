"use client";

import { ImageDown, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState, type CSSProperties } from "react";
import { toJpeg } from "html-to-image";
import { cn } from "@/lib/cn";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import RoomBadge from "../RoomBadge";
import { formatMinutes, roomOrderOf, WEEKDAY_LABELS } from "../types";
import { roadOf } from "./RoadMap";
import { branchOf, shortClass, type DayEntry, type TestInfo } from "./types";
import { withPlus } from "@/lib/personName";

/**
 * Зураг ҮРГЭЛЖ цагаан хуудас шиг (хэрэглэгчийн хар горимоос үл хамаарна): энэ
 * хэсэгт л гэрэлт горимын токенуудыг дахин зарлана — класс нь хэвээр `text-ink`
 * г.м. (`@theme inline` тул шууд үйлчилнэ). Утга нь globals.css-ийн :root-тэй ижил.
 */
const LIGHT_TOKENS = {
  "--bg": "#FAF9F6",
  "--surface": "#FFFFFF",
  "--line": "#DFDCD5",
  "--ink": "#1B1B18",
  "--ink-dim": "#57544D",
  "--logo": "#273F74",
  "--brand-soft": "#1E3A8A",
} as CSSProperties;

const MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

/**
 * «Зураг татах» (эзэн 2026-10-18): өдрийн хуваарийг цэвэрхэн JPG болгоод Web
 * Share-ээр (iPhone «Save Image» → Photos, Android → Gallery), дэмжихгүй бол татна.
 * Зурагт: огноо + цаг, танхим, анги, тест, ахлах, туслах. Тарах/тэмдэглэл ОРОХГҮЙ.
 */
/** Утас/таблет (iOS, Android, iPadOS) — Web Share-ээр Photos/Gallery руу; бусад нь шууд татна */
function isHandheld(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  // iPadOS 13+ нь Mac гэж танигддаг — мэдрэгчтэй дэлгэцээр ялгана
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches && !window.matchMedia("(pointer: fine)").matches;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function ExportImage({
  date,
  entries,
  tests,
}: {
  date: string;
  entries: DayEntry[];
  tests: Record<string, TestInfo>;
}) {
  const node = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(false);
  const [file, setFile] = useState<{ url: string; file: File } | null>(null);
  const [y, m, d] = date.split("-").map(Number);
  const weekday = WEEKDAY_LABELS[new Date(`${date}T00:00:00.000Z`).getUTCDay()];
  const title = `${MONTHS[m - 1]}-р сарын ${d}, ${weekday}`;
  const name = `huvaari-${date}.jpg`;

  async function makeBlob(): Promise<Blob> {
    const el = node.current;
    if (!el) throw new Error("no node");
    await document.fonts?.ready;
    // Safari/Chrome canvas хязгаар (~16 мегапиксел) — урт хуваарьт нягтралыг бууруулна
    const pixelRatio = Math.max(1, Math.min(2, Math.sqrt(15_000_000 / (el.offsetWidth * Math.max(el.offsetHeight, 1)))));
    const options = { quality: 0.92, pixelRatio, backgroundColor: "#FFFFFF" };
    // Safari эхний удаа фонт/SVG-г орхих тохиолдолтой — нэг удаа «халаана»
    await toJpeg(el, options).catch(() => undefined);
    const url = await toJpeg(el, options);
    const blob = await (await fetch(url)).blob();
    if (!blob.size) throw new Error("empty image");
    return blob;
  }

  async function run() {
    setRendering(true);
    try {
      const blob = await makeBlob();
      if (isHandheld()) {
        // Утсанд: Web Share нь хэрэглэгчийн шинэ товшилт шаарддаг тул урьдчилан харуулаад «Хадгалах»
        setFile({ url: URL.createObjectURL(blob), file: new File([blob], name, { type: "image/jpeg" }) });
      } else {
        // Компьютерт: Татаж авсан хавтас руу шууд (macOS Safari-ийн share цонх биш)
        download(blob, name);
        toast.success("Зураг татагдлаа", { description: name });
      }
    } catch (err) {
      console.error("Хуваарийн зураг үүсгэж чадсангүй", err);
      toast.error("Зураг үүсгэж чадсангүй", { description: "Дахин оролдоно уу" });
    } finally {
      setRendering(false);
    }
  }

  async function save() {
    if (!file) return;
    try {
      if (navigator.canShare?.({ files: [file.file] })) {
        await navigator.share({ files: [file.file], title: `Хуваарь ${title}` });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    download(file.file, name);
  }

  function close() {
    if (file) URL.revokeObjectURL(file.url);
    setFile(null);
  }

  const branches = ["Баруун 4", "Зүүн 4", "Бусад"]
    .map((b) => ({
      branch: b,
      rows: entries
        .filter((e) => branchOf(e.classroomName) === b)
        .sort((a, c) => a.startMinute - c.startMinute || roomOrderOf(a.room) - roomOrderOf(c.room)),
    }))
    .filter((g) => g.rows.length);

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={rendering || entries.length === 0}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50"
      >
        <ImageDown className="size-4" aria-hidden />
        {rendering ? "Бэлтгэж байна" : "Зураг татах"}
      </button>

      {/* Зураг болгох хуудас — дэлгэцнээс гадна, 1080px өргөн */}
      <div aria-hidden className="pointer-events-none fixed -left-[12000px] top-0">
        <div ref={node} style={LIGHT_TOKENS} className="w-[1080px] bg-surface p-12 font-sans text-ink">
          <p className="text-2xl font-bold text-brand-soft">Хичээлийн хуваарь, {y}</p>
          <p className="mt-1 text-4xl font-extrabold">{title}</p>
          {branches.map((g) => (
            <div key={g.branch} className="mt-8">
              <p className="mb-2 text-xl font-bold">{g.branch}</p>
              <div className="overflow-hidden rounded-2xl border-2 border-line">
                <div className="grid grid-cols-[7.5rem_4.5rem_8rem_minmax(0,1fr)_9.5rem_9.5rem] gap-x-4 bg-bg px-5 py-3 text-base font-semibold text-ink-dim">
                  <span>Цаг</span>
                  <span>Танхим</span>
                  <span>Анги</span>
                  <span>Тест</span>
                  <span>Ахлах</span>
                  <span>Туслах</span>
                </div>
                {g.rows.map((e, i) => {
                  const { today } = roadOf(e, tests);
                  const testText = today.map((x) => x.short).join(", ") || e.topic || "";
                  return (
                    <div
                      key={`${e.scheduleId}-${i}`}
                      className={cn(
                        "grid grid-cols-[7.5rem_4.5rem_8rem_minmax(0,1fr)_9.5rem_9.5rem] items-center gap-x-4 px-5 py-3 text-lg",
                        i > 0 && "border-t border-line",
                      )}
                    >
                      <span className="font-bold tabular-nums">
                        {formatMinutes(e.startMinute)}–{formatMinutes(e.endMinute)}
                      </span>
                      <span>
                        <RoomBadge room={e.room} size="md" />
                      </span>
                      <span className="font-bold">{shortClass(e.classroomName)}</span>
                      <span className="font-medium">{testText}</span>
                      <span>{withPlus(e.leadTeacher?.name, e.leadTeacher?.role) ?? ""}</span>
                      <span className="text-ink-dim">{withPlus(e.assistantTeacher?.name, e.assistantTeacher?.role) ?? ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Drawer open={file !== null} onOpenChange={(o) => !o && close()}>
        <DrawerContent className="mx-auto w-full max-w-2xl" aria-describedby={undefined}>
          <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4 pt-2">
            <DrawerTitle className="text-lg font-bold">Хуваарийн зураг</DrawerTitle>
            {file && (
              // eslint-disable-next-line @next/next/no-img-element -- локал blob зураг
              <img src={file.url} alt={`Хуваарь ${title}`} className="min-h-0 flex-1 overflow-auto rounded-xl border border-line object-contain" />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-line bg-panel text-sm font-semibold"
              >
                Хаах
              </button>
              <button
                type="button"
                onClick={save}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-bright text-sm font-semibold text-on-brand"
              >
                <Share2 className="size-4" aria-hidden />
                Хадгалах
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
