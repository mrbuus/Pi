"use client";

import { useState } from "react";
import { CalendarPlus, Check, Copy, Download, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surface";

interface IssuedCalendarToken {
  token: string;
}

interface CalendarExport {
  filename: string;
  ics: string;
}

function buildFeedUrl(token: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";
  const feed = new URL(`${apiUrl.replace(/\/+$/, "")}/schedule/my.ics`);
  feed.searchParams.set("token", token);
  return feed.toString();
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  if (!copied) throw new Error("Холбоосыг хуулж чадсангүй. Гар аргаар сонгон хуулна уу.");
}

export default function CalendarSubscriptionCard() {
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resetCalendarLink() {
    setCreating(true);
    setError(null);
    try {
      const result = await api<IssuedCalendarToken>("/schedule/me/calendar-token", {
        method: "POST",
      });
      setCalendarUrl(buildFeedUrl(result.token));
      setConfirmReset(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хуанлийн холбоос үүсгэсэнгүй.");
    } finally {
      setCreating(false);
    }
  }

  async function downloadCalendar() {
    setDownloading(true);
    setError(null);
    try {
      const result = await api<CalendarExport>("/schedule/me/ics");
      const objectUrl = URL.createObjectURL(new Blob([result.ics], { type: "text/calendar;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Хуваарийн файлыг татаж чадсангүй.");
    } finally {
      setDownloading(false);
    }
  }

  async function copyCalendarUrl() {
    if (!calendarUrl) return;
    try {
      await copyText(calendarUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Холбоосыг хуулж чадсангүй.");
    }
  }

  return (
    <Card>
      <SectionHeader
        icon={CalendarPlus}
        title="Утасны хуанлид нэмэх"
        hint={<span className="text-xs font-normal text-ink-dim">Ойрын 12 долоо хоногийн хичээл</span>}
      />
      <p className="mb-4 text-sm text-ink-dim">
        Хувийн холбоосоо iPhone-ийн Calendar эсвэл Android-ийн календарийн аппд нэмбэл хуваарь шинэчлэгдэхэд автоматаар татагдана.
      </p>

      {error && <p role="alert" className="mb-3 rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">{error}</p>}

      {confirmReset ? (
        <div className="rounded-xl border border-line bg-bg p-4" role="group" aria-labelledby="calendar-reset-title">
          <h3 id="calendar-reset-title" className="font-semibold text-ink">Холбоос үүсгэх үү?</h3>
          <p className="mt-1 text-sm text-ink-dim">Шинэ нууц холбоос гаргана. Өмнөх холбоос байвал түүнийг хүчингүй болгож, хуанлидаа шинээр нэмэх шаардлагатай.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={() => void resetCalendarLink()} loading={creating} className="inline-flex min-h-11 items-center">Шинэ холбоос үүсгэх</Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmReset(false)} className="min-h-11">Болих</Button>
          </div>
        </div>
      ) : calendarUrl ? (
        <div className="space-y-3">
          <label htmlFor="calendar-subscription-url" className="block text-sm font-semibold text-ink">Таны хувийн хуанлийн холбоос</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="calendar-subscription-url"
              type="url"
              readOnly
              value={calendarUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-ink"
              aria-describedby="calendar-url-privacy"
            />
            <Button type="button" variant="secondary" onClick={() => void copyCalendarUrl()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2">
              {copyState === "copied" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copyState === "copied" ? "Хуулагдлаа" : "Хуулах"}
            </Button>
          </div>
          <p id="calendar-url-privacy" className="text-xs text-ink-dim">Энэ холбоос таны хуваарийг үзэх нууц түлхүүртэй тул бусдад бүү дамжуулаарай. Шинэ холбоос үүсгэвэл өмнөх нь шууд хүчингүй болно.</p>
          <div className="grid gap-2 text-sm text-ink-dim sm:grid-cols-2">
            <p><strong className="text-ink">iPhone:</strong> Settings, Calendar, Accounts, Add Account, Other, Add Subscribed Calendar гэсэн дарааллаар нээнэ.</p>
            <p><strong className="text-ink">Android:</strong> Google Calendar-ийн веб хувилбар дахь Other calendars, From URL хэсэгт холбоосоо нэмнэ.</p>
          </div>
        </div>
      ) : (
        <Button type="button" onClick={() => setConfirmReset(true)} className="inline-flex min-h-11 items-center gap-2">
          <CalendarPlus className="h-4 w-4" aria-hidden />
          Хувийн холбоос үүсгэх
        </Button>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <Button type="button" variant="secondary" onClick={() => void downloadCalendar()} loading={downloading} className="inline-flex min-h-11 items-center gap-2">
          <Download className="h-4 w-4" aria-hidden />
          .ics файл татах
        </Button>
        <span className="ml-2 text-xs text-ink-dim">Нэг удаагийн календарийн файл</span>
      </div>
      {calendarUrl && (
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={() => { setConfirmReset(true); setCopyState("idle"); }} className="inline-flex min-h-11 items-center gap-2 px-2">
            <RotateCcw className="h-4 w-4" aria-hidden />
            Холбоос хүчингүй болгож шинэчлэх
          </Button>
        </div>
      )}
    </Card>
  );
}
