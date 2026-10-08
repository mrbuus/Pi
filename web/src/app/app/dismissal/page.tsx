"use client";
import { useEffect, useState } from "react";
import { Clock, Save } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
type Class = { id: string; name: string; teacher: { id: string } };
type Record = {
  approximateAt: string;
  lastLeftAt: string | null;
  note: string | null;
};
const clock = (value: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
export default function DismissalPage() {
  const [classes, setClasses] = useState<Class[]>([]),
    [classId, setClassId] = useState(""),
    [date, setDate] = useState(() =>
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(
        new Date(),
      ),
    );
  const [time, setTime] = useState(""),
    [last, setLast] = useState(""),
    [note, setNote] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  function load() {
    Promise.all([
      api<Class[]>("/classrooms"),
      api<{ id: string; role: string }>("/auth/me"),
    ])
      .then(([rows, me]) => {
        setClasses(
          rows.filter(
            (row) => me.role === "ADMIN" || row.teacher?.id === me.id,
          ),
        );
      })
      .catch(() =>
        setError(
          "Ангийн мэдээлэл нээгдсэнгүй. Багшийн бүртгэл болон холболтоо шалгана уу.",
        ),
      )
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  async function open() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const record = await api<Record | null>(
        `/learning-lab/classrooms/${encodeURIComponent(classId)}/dismissal?date=${date}`,
      );
      setTime(record ? clock(record.approximateAt) : "");
      setLast(record?.lastLeftAt ? clock(record.lastLeftAt) : "");
      setNote(record?.note ?? "");
      setMessage(
        record
          ? "Энэ өдрийн бүртгэл нээгдлээ."
          : "Энэ өдөр цаг хараахан тэмдэглээгүй.",
      );
    } catch {
      setError("Бүртгэл нээгдсэнгүй. Өдөр болон ангийн эрхээ шалгана уу.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(
        `/learning-lab/classrooms/${encodeURIComponent(classId)}/dismissal?date=${date}`,
        {
          method: "PUT",
          body: {
            approximateTime: time,
            lastLeftTime: last || null,
            note: note || null,
          },
        },
      );
      setMessage(
        "Ангийн тарах ойролцоо цаг хадгалагдлаа. Баталгаажсан эцэг эхэд ангийн мэдээлэл хэлбэрээр харагдана.",
      );
    } catch {
      setError("Хадгалагдсангүй. Өдөр, цагуудаа шалгаад дахин оролдоно уу.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 pb-24 text-ink">
      <header>
        <h1 className="cyrillic-heading text-2xl font-semibold flex items-center gap-2">
          <Clock size={22} /> Анги тарах ойролцоо цаг
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Энэ нь багшийн гаргасан ангийн мэдээлэл. Хүүхэд тус бүрийн бодит
          гарсан цагийг батлахгүй.
        </p>
      </header>
      {loading ? (
        <LoadingState rows={4} />
      ) : (
        <Card>
          <CardContent className="pt-5 space-y-4">
            {!classes.length && (
              <p>Танд харьяалагдсан идэвхтэй анги хараахан байхгүй.</p>
            )}
            <label className="block">
              Анги
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setTime("");
                  setLast("");
                  setNote("");
                  setMessage("");
                }}
                className="mt-2 w-full min-h-11 rounded-lg border border-line bg-surface px-3"
              >
                <option value="">Анги сонгох</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              Өдөр — Улаанбаатарын цагаар
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTime("");
                  setLast("");
                  setNote("");
                  setMessage("");
                }}
                className="mt-2 w-full min-h-11 rounded-lg border border-line bg-surface px-3"
              />
            </label>
            <Button
              variant="outline"
              disabled={!classId || !date || busy}
              onClick={open}
            >
              Бүртгэл нээх
            </Button>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label className="block">
                Тарах ойролцоо цаг
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                  className="mt-2 w-full min-h-11 rounded-lg border border-line bg-surface px-3"
                />
              </label>
              <label className="block">
                Сүүлийн сурагч явсан цаг — заавал биш
                <input
                  type="time"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  className="mt-2 w-full min-h-11 rounded-lg border border-line bg-surface px-3"
                />
              </label>
              <p className="text-xs text-ink-dim">
                Сүүлийн сурагчийн цагийг бүх хүүхдийн гарсан цаг гэж ойлгохгүй.
                Энэ өдөр шөнө дундыг давсан цаг бүртгэхгүй.
              </p>
              <label className="block">
                Сурагч, эцэг эхэд харагдах тайлбар
                <textarea
                  value={note}
                  maxLength={1000}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-2 w-full min-h-24 rounded-lg border border-line bg-surface p-3"
                />
              </label>
              <p className="text-xs text-ink-dim">
                Энд дотоод, хувийн ажиглалт бичихгүй. Тайлбар хүүхэд, эцэг эхэд
                харагдана.
              </p>
              <Button
                type="submit"
                disabled={!classId || !date || !time || busy}
                className="w-full"
              >
                <Save size={18} />
                {busy ? "Хадгалж байна…" : "Цаг тэмдэглэх"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
      {error && (
        <ErrorState
          message={error}
          onRetry={() => {
            setError("");
            if (classId) void open();
            else load();
          }}
        />
      )}
      {message && (
        <p role="status" className="rounded-lg bg-panel p-3 text-sm">
          {message}
        </p>
      )}
    </main>
  );
}
