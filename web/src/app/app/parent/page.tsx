"use client";

import { useEffect, useState } from "react";
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
  PRESENT: { text: "Ирсэн", cls: "bg-success/15 text-success" },
  LATE: { text: "Хоцорсон", cls: "bg-warning/15 text-warning" },
  ABSENT: { text: "Тасалсан", cls: "bg-error/15 text-error" },
  EXCUSED: { text: "Чөлөөтэй", cls: "bg-brand-bright/15 text-brand-soft" },
};

const SUB_LABEL: Record<string, { text: string; cls: string }> = {
  NOT_DONE: { text: "Хийгээгүй", cls: "bg-panel text-ink-dim" },
  SUBMITTED: { text: "Илгээсэн", cls: "bg-warning/15 text-warning" },
  DONE_ONLINE: { text: "Батлагдсан", cls: "bg-success/15 text-success" },
  DONE_IN_CLASS: { text: "Ангид шалгасан", cls: "bg-success/15 text-success" },
  RETURNED: { text: "Буцаасан", cls: "bg-error/15 text-error" },
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
      <section className="rounded-2xl border border-warning/20 bg-warning/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">
              {link.student.firstName} {link.student.lastName}
            </h2>
            <p className="mt-1 text-sm text-ink-dim">{link.student.phone}</p>
          </div>
          <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
            Баталгаажуулалт хүлээж байна
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
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
        <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
          Холбогдсон
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(["PRESENT", "LATE", "ABSENT"] as const).map((status) => (
          <div key={status} className="rounded-xl border border-line p-4">
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
                  className="rounded-xl border border-line px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{r.test.title}</span>
                    <span className="font-bold">
                      {r.totalScore}/{r.maxScore}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel">
                    <div
                      className={`h-full rounded-full ${
                        scorePct >= 80
                          ? "bg-success"
                          : scorePct >= 50
                            ? "bg-warning"
                            : "bg-error"
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
                  className="rounded-xl border border-line px-4 py-3 text-sm"
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

type LoadState = "loading" | "ready" | "error";

export default function ParentPage() {
  const [links, setLinks] = useState<ParentLink[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [phone, setPhone] = useState("");
  const [msg, setMsg] = useState("");
  const [linkPending, setLinkPending] = useState(false);

  function fetchLinks() {
    api<ParentLink[]>("/parent/children")
      .then((data) => {
        setLinks(data);
        setLoadState("ready");
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : "Алдаа гарлаа");
        setLoadState("error");
      });
  }

  // Анхны төлөв аль хэдийн "loading" тул mount дээр дахин synchronous
  // setState хийхгүй — зөвхөн дуудлагыг эхлүүлнэ.
  useEffect(fetchLinks, []);

  function reload() {
    // Дахин оролдоход товч дарах мөчид (effect биш) шууд "ачаалж байна" болгоно.
    setLoadState("loading");
    fetchLinks();
  }

  async function requestLink() {
    if (linkPending) return;
    setLinkPending(true);
    setMsg("");
    try {
      await api("/parent/links", {
        method: "POST",
        body: { studentPhone: phone.replace(/\D/g, "") },
      });
      setPhone("");
      setMsg("Хүсэлт илгээгдлээ");
      reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLinkPending(false);
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
            aria-label="Сурагчийн утасны дугаар"
            placeholder="Сурагчийн утасны дугаар"
            className="min-w-56 flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none focus:border-brand-bright"
          />
          <button
            onClick={requestLink}
            disabled={phone.replace(/\D/g, "").length !== 8 || linkPending}
            aria-busy={linkPending}
            className="rounded-xl bg-brand-bright px-5 py-3 text-sm font-bold text-on-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {linkPending ? "Илгээж байна…" : "Хүсэлт илгээх"}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-success">{msg}</p>}
      </section>

      {loadState === "loading" && (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Хүүхдийн мэдээлэл ачаалж байна…
          </p>
        </section>
      )}

      {loadState === "error" && (
        <section className="rounded-2xl border border-error/30 bg-error/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-error">
              Мэдээлэл ачааллахад алдаа гарлаа: {loadError}
            </p>
            <button
              onClick={reload}
              className="shrink-0 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
            >
              Дахин оролдох
            </button>
          </div>
        </section>
      )}

      {loadState === "ready" && links.length === 0 && (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="font-bold text-brand-soft">Холбосон хүүхэд алга байна</h2>
          <p className="mt-2 text-sm text-ink-dim">
            Дээрх хэсэгт сурагчийн утасны дугаараа оруулж хүсэлт илгээнэ үү.
            Сурагч эсвэл төвийн ажилтан баталгаажуулмагц хүүхдийн ирц,
            даалгавар, шалгалтын дүн энд харагдана.
          </p>
        </section>
      )}

      {loadState === "ready" && links.length > 0 && (
        <div className="space-y-5">
          {links.map((link) => (
            <ChildPanel key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
