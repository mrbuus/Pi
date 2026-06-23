"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ParentLink {
  id: string;
  verified: boolean;
  verifiedAt?: string | null;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    studentProfile?: { grade?: number; school?: string | null } | null;
    classroom?: { id: string; name: string; grade?: number | null } | null;
    attendances?: {
      date: string;
      status: string;
      classroom: { name: string };
    }[];
    submissions?: {
      state: string;
      note?: string | null;
      submittedAt?: string | null;
      checkedAt?: string | null;
      assignment: {
        title: string;
        dueDate?: string | null;
        classroom: { name: string };
      };
    }[];
    testResults?: {
      totalScore: number;
      maxScore: number;
      source: string;
      createdAt: string;
      test: { title: string; type: string };
    }[];
  };
}

const ATT_LABEL: Record<string, { text: string; cls: string }> = {
  PRESENT: { text: "Ирсэн", cls: "bg-teal-400/15 text-teal-300" },
  LATE: { text: "Хоцорсон", cls: "bg-amber-400/15 text-amber-300" },
  ABSENT: { text: "Тасалсан", cls: "bg-red-400/15 text-red-300" },
  EXCUSED: { text: "Чөлөөтэй", cls: "bg-brand-bright/15 text-brand-soft" },
};

const SUB_LABEL: Record<string, { text: string; cls: string }> = {
  NOT_DONE: { text: "Хийгээгүй", cls: "bg-white/10 text-ink-dim" },
  SUBMITTED: { text: "Илгээсэн", cls: "bg-amber-400/15 text-amber-300" },
  DONE_ONLINE: { text: "Батлагдсан", cls: "bg-teal-400/15 text-teal-300" },
  DONE_IN_CLASS: { text: "Ангид шалгасан", cls: "bg-teal-400/15 text-teal-300" },
  RETURNED: { text: "Буцаасан", cls: "bg-red-400/15 text-red-300" },
};

function pct(total: number, max: number) {
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

function ChildPanel({ link }: { link: ParentLink }) {
  const attendance = link.student.attendances ?? [];
  const results = link.student.testResults ?? [];
  const submissions = link.student.submissions ?? [];
  const attendanceSummary = attendance.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  if (!link.verified) {
    return (
      <section className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">
              {link.student.firstName} {link.student.lastName}
            </h2>
            <p className="mt-1 text-sm text-ink-dim">{link.student.phone}</p>
          </div>
          <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300">
            Баталгаажуулалт хүлээж байна
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold">
            {link.student.firstName} {link.student.lastName}
          </h2>
          <p className="mt-1 text-sm text-ink-dim">
            {link.student.studentProfile?.grade
              ? `${link.student.studentProfile.grade}-р анги`
              : "Анги тодорхойгүй"}
            {link.student.classroom ? ` · ${link.student.classroom.name}` : ""}
            {link.student.studentProfile?.school
              ? ` · ${link.student.studentProfile.school}`
              : ""}
          </p>
        </div>
        <span className="rounded-full bg-teal-400/15 px-3 py-1 text-xs font-bold text-teal-300">
          Холбогдсон
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(["PRESENT", "LATE", "ABSENT"] as const).map((status) => (
          <div key={status} className="rounded-xl border border-white/8 p-4">
            <p className="text-2xl font-extrabold">
              {attendanceSummary[status] ?? 0}
            </p>
            <p className="mt-1 text-xs text-ink-dim">{ATT_LABEL[status].text}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 font-bold text-brand-soft">Сүүлийн шалгалтууд</h3>
          {results.length === 0 && (
            <p className="text-sm text-ink-dim">Дүн хараахан алга байна</p>
          )}
          <div className="space-y-2">
            {results.map((r, i) => {
              const scorePct = pct(r.totalScore, r.maxScore);
              return (
                <div
                  key={`${r.test.title}-${i}`}
                  className="rounded-xl border border-white/8 px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{r.test.title}</span>
                    <span className="font-bold">
                      {r.totalScore}/{r.maxScore}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full ${
                        scorePct >= 80
                          ? "bg-teal-400"
                          : scorePct >= 50
                            ? "bg-amber-400"
                            : "bg-red-400"
                      }`}
                      style={{ width: `${Math.max(scorePct, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-bold text-brand-soft">Сүүлийн даалгаврууд</h3>
          {submissions.length === 0 && (
            <p className="text-sm text-ink-dim">Даалгаврын төлөв алга байна</p>
          )}
          <div className="space-y-2">
            {submissions.map((s, i) => {
              const st = SUB_LABEL[s.state] ?? SUB_LABEL.NOT_DONE;
              return (
                <div
                  key={`${s.assignment.title}-${i}`}
                  className="rounded-xl border border-white/8 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{s.assignment.title}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${st.cls}`}>
                      {st.text}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-dim">
                    {s.assignment.classroom.name}
                    {s.checkedAt ? ` · ${s.checkedAt.slice(0, 10)}` : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="mb-3 font-bold text-brand-soft">Сүүлийн ирц</h3>
        {attendance.length === 0 && (
          <p className="text-sm text-ink-dim">Ирцийн мэдээлэл алга байна</p>
        )}
        <div className="flex flex-wrap gap-2">
          {attendance.map((a, i) => {
            const st = ATT_LABEL[a.status] ?? ATT_LABEL.ABSENT;
            return (
              <span key={`${a.date}-${i}`} className={`rounded-lg px-3 py-1 text-xs ${st.cls}`}>
                {a.date.slice(0, 10)} · {st.text}
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function ParentPage() {
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<ParentLink[]>("/parent/children").then(setLinks).catch(() => {});
  }, []);

  useEffect(load, [load]);

  async function requestLink() {
    setMsg("");
    try {
      await api("/parent/links", {
        method: "POST",
        body: { studentPhone: phone.replace(/\D/g, "") },
      });
      setPhone("");
      setMsg("Хүсэлт илгээгдлээ");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Хүүхдийн явц</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Баталгаажсан хүүхдийн ирц, даалгавар, шалгалтын дүн энд харагдана.
        </p>
      </div>

      <section className="rounded-2xl border border-brand-bright/30 bg-brand-bright/5 p-6">
        <h2 className="font-bold text-brand-soft">Хүүхэд холбох</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
            placeholder="Сурагчийн утасны дугаар"
            className="min-w-56 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-brand-bright"
          />
          <button
            onClick={requestLink}
            disabled={phone.replace(/\D/g, "").length !== 8}
            className="rounded-xl bg-brand-bright px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Хүсэлт илгээх
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-teal-300">{msg}</p>}
      </section>

      {links.length === 0 && (
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
          <p className="text-sm text-ink-dim">Холбосон хүүхэд алга байна</p>
        </section>
      )}

      <div className="space-y-5">
        {links.map((link) => (
          <ChildPanel key={link.id} link={link} />
        ))}
      </div>
    </div>
  );
}
