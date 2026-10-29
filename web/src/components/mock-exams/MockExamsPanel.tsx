"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import type { MockEvent } from "@/components/books/types";
import { EventCard } from "./SorilsClient";
import { useMockExams } from "./useMockExams";

/** Апп доторх «Жишиг сорил» таб — /sorils хуудасны гол хэсэг (толгой, тайлбаргүй) */
export default function MockExamsPanel() {
  const { pub, failed, canRegister, loggedIn, regOf, register, unregister, refresh } = useMockExams();
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  // Сорил эхлэх мөчид төлөв шинэчлэгдэнэ
  useEffect(() => {
    const ev = pub?.next;
    if (!ev) return;
    const ms = new Date(ev.startsAt).getTime() - Date.now();
    if (ms <= 0 || ms > 6 * 3_600_000) return;
    const id = setTimeout(refresh, ms + 500);
    return () => clearTimeout(id);
  }, [pub, refresh]);

  const act = async (ev: MockEvent, on: boolean) => {
    setBusy(ev.id);
    try {
      if (on) {
        await register(ev.id);
        toast.success("Бүртгүүллээ, цагтаа эндээс эхлүүлээрэй");
      } else {
        await unregister(ev.id);
        toast.success("Бүртгэлийг цуцаллаа");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setBusy(null);
    }
  };

  if (failed) return <ErrorState message="Сорилын мэдээллийг ачаалж чадсангүй" onRetry={refresh} />;
  if (!pub) return <LoadingState rows={3} />;
  const main = pub.live ?? pub.next ?? null;
  const rest = pub.upcoming.filter((e) => e.id !== main?.id);
  const card = (ev: MockEvent, big = false) => (
    <EventCard
      ev={ev}
      now={now}
      reg={regOf(ev.id)}
      canRegister={canRegister}
      loggedIn={loggedIn}
      busy={busy === ev.id}
      onAct={(on) => act(ev, on)}
      big={big}
    />
  );

  return (
    <div className="space-y-4">
      {main ? (
        card(main, true)
      ) : (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-dim">
          <CalendarDays className="mx-auto mb-2 h-7 w-7" aria-hidden />
          Дараагийн сорилын хуваарь удахгүй зарлагдана
        </div>
      )}
      {rest.length > 0 && (
        <section aria-labelledby="soril-next" className="space-y-2">
          <h2 id="soril-next" className="font-bold text-ink">
            Дараагийн долоо хоногууд
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {rest.map((ev) => (
              <li key={ev.id}>{card(ev)}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
