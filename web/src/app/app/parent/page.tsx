"use client";

import { useEffect, useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { AcknowledgeResultDialog } from "@/components/parent/AcknowledgeResultDialog";
import { Check, CircleCheck, CircleX, Clock, Link2, Wallet, type LucideIcon } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { formatMnt } from "@/lib/orgInfo";
import { STATUS_LABEL } from "@/components/payments/paymentHelpers";
import PaidUntilCard from "@/components/payments/PaidUntilCard";
import {
  HOMEWORK_MARK_OPTIONS,
  type HomeworkMark,
} from "@/components/homework/HomeworkMarkPills";

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
    // Танхимын анги: багшийн өдрийн тэмдэглэгээ (Хийсэн / Дутуу / Хийгээгүй)
    dailyHomeworkMarks?: {
      date: string;
      status: HomeworkMark;
      comment?: string | null;
      classroom: { name: string };
    }[];
    // Онлайн анги: зураг илгээлт + багшийн баталгаа
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
      id: string;
      totalScore: number;
      maxScore: number;
      source: string;
      createdAt: string;
      test: { title: string; type: string };
    }[];
    payments?: {
      id: string;
      status: string;
      amount: number;
      createdAt: string;
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

const STAT_TILES: { key: string; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "PRESENT", label: "Ирсэн өдөр", icon: CircleCheck, tone: "bg-success/10 text-success" },
  { key: "LATE", label: "Хоцорсон", icon: Clock, tone: "bg-warning/10 text-warning" },
  { key: "ABSENT", label: "Тасалсан", icon: CircleX, tone: "bg-error/10 text-error" },
  { key: "PAID", label: "Баталгаажсан төлбөр", icon: Wallet, tone: "bg-accent-violet/10 text-accent-violet" },
];

function pct(total: number, max: number) {
  return max > 0 ? Math.round((total / max) * 100) : 0;
}

function ChildPanel({ link, onRefresh }: { link: ParentLink; onRefresh: () => void }) {
  const attendance = link.student.attendances ?? [];
  const results = link.student.testResults ?? [];
  const submissions = link.student.submissions ?? [];
  const homeworkMarks = link.student.dailyHomeworkMarks ?? [];
  const payments = link.student.payments ?? [];
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{ id: string; test: { title: string } } | null>(null);

  const attendanceSummary = attendance.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  const confirmedPayments = payments.filter((p) => p.status === "CONFIRMED");
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + p.amount, 0);

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
    <section className="chunky p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-teal/15 text-lg font-extrabold text-accent-teal"
        >
          {(link.student.firstName[0] ?? "").toUpperCase()}
          {(link.student.lastName[0] ?? "").toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold">
            {link.student.firstName} {link.student.lastName}
          </h2>
          <p className="mt-1 text-sm text-ink-dim">
            <Meta items={[
              link.student.studentProfile?.grade ? `${link.student.studentProfile.grade}-р анги` : "Анги тодорхойгүй",
              link.student.classroom ? link.student.classroom.name : "",
              link.student.studentProfile?.school ?? ""
            ]} />
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Холбогдсон
          </span>
        </div>
      </div>

      {/* «Хэдий хүртэл төлсөн» (G26) — баталгаажсан хүүхдэд л (сервер шалгана). */}
      <div className="mt-5">
        <PaidUntilCard studentId={link.student.id} compact />
      </div>

      {/* Өнгөт тоон хавтан (шинэ дизайн) — өнгө + дүрс + үг хамт. */}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_TILES.map((t) => {
          const value =
            t.key === "PAID" ? confirmedPayments.length : (attendanceSummary[t.key] ?? 0);
          return (
            <div key={t.key} className={`flex flex-col rounded-2xl p-4 ${t.tone}`}>
              <dt className="order-last text-xs text-ink-dim">{t.label}</dt>
              <dd className="text-2xl font-extrabold tabular-nums text-ink">
                <t.icon className="mb-1 h-5 w-5" aria-hidden />
                {value}
              </dd>
            </div>
          );
        })}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div>
          <h3 className="mb-3 font-bold text-brand-soft">Сүүлийн шалгалтууд</h3>
          {results.length === 0 && (
            <p className="text-sm text-ink-dim">Дүн алга байна</p>
          )}
          <div className="space-y-2">
            {results.map((r, i) => {
              const scorePct = pct(r.totalScore, r.maxScore);
              const isAcknowledged = acknowledgedIds.has(r.id);
              return (
                <div key={r.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{r.test.title}</span>
                        {isAcknowledged && (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <Check size={14} />
                            Танилцлаа
                          </span>
                        )}
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
                      <p className="mt-2 text-xs text-ink-dim">
                        {r.totalScore}/{r.maxScore} оноо
                      </p>
                    </div>
                    {!isAcknowledged && (
                      <button
                        onClick={() => {
                          setSelectedResult(r);
                          setDialogOpen(true);
                        }}
                        className="shrink-0 rounded-lg border border-brand-bright/50 px-2.5 py-1 text-xs font-semibold text-brand-soft transition hover:bg-brand-bright/10"
                      >
                        Танилцлаа
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-bold text-brand-soft">Сүүлийн даалгаврууд</h3>
          {submissions.length === 0 && homeworkMarks.length === 0 && (
            <p className="text-sm text-ink-dim">Даалгаврын төлөв алга байна</p>
          )}
          {/* Эзний шийдвэр (2026-09-26): танхимын хүүхдэд багшийн тэмдэглэгээ,
              онлайн хүүхдэд илгээлтийн төлөв. */}
          {homeworkMarks.length > 0 && (
            <ul className="space-y-2">
              {homeworkMarks.map((m) => {
                const opt = HOMEWORK_MARK_OPTIONS.find((o) => o.value === m.status);
                if (!opt) return null;
                const Icon = opt.icon;
                return (
                  <li
                    key={`${m.classroom.name}-${m.date}`}
                    className="rounded-xl border border-line px-4 py-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-ink-dim">
                        <Meta items={[m.date.slice(0, 10), m.classroom.name]} />
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${opt.selectedClass}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        {opt.label}
                      </span>
                    </div>
                    {m.comment && <p className="mt-1 text-xs text-ink-dim">{m.comment}</p>}
                  </li>
                );
              })}
            </ul>
          )}
          {homeworkMarks.length === 0 && submissions.length > 0 && (
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
                      <Meta items={[s.assignment.classroom.name, s.checkedAt ? s.checkedAt.slice(0, 10) : ""]} />
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 font-bold text-brand-soft">Төлбөрийн төлөв</h3>
          {payments.length === 0 && (
            <p className="text-sm text-ink-dim">Төлбөрийн мэдээлэл алга байна</p>
          )}
          <div className="space-y-2">
            {payments.slice(0, 5).map((p, i) => {
              const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
              return (
                <div
                  key={`${p.id}-${i}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-line px-3 py-2.5 text-sm"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.cls}`}>
                    <st.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold tabular-nums text-ink">{formatMnt(p.amount)}</span>
                    <span className="block text-xs text-ink-dim">
                      <Meta items={[st.text, p.createdAt.slice(0, 10)]} />
                    </span>
                  </span>
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
                <Meta items={[a.date.slice(0, 10), st.text]} />
              </span>
            );
          })}
        </div>
      </div>

      {selectedResult && (
        <AcknowledgeResultDialog
          testResultId={selectedResult.id}
          testTitle={selectedResult.test.title}
          isOpen={dialogOpen}
          onClose={() => {
            setDialogOpen(false);
            setSelectedResult(null);
          }}
          onSuccess={() => {
            if (selectedResult) {
              setAcknowledgedIds((prev) => new Set([...prev, selectedResult.id]));
            }
            onRefresh();
          }}
        />
      )}
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
    <div className="space-y-6">
      <div>
        <h1 className="sr-only">Хүүхдийн явц</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Баталгаажсан хүүхдийн ирц, даалгавар, шалгалтын дүн энд харагдана.
        </p>
      </div>

      {loadState === "loading" && (
        <section className="chunky p-6">
          <LoadingState rows={4} label="Хүүхдийн мэдээлэл" />
        </section>
      )}

      {loadState === "error" && (
        <ErrorState message={`Мэдээлэл ачааллахад алдаа гарлаа: ${loadError}`} onRetry={reload} />
      )}

      {loadState === "ready" && links.length === 0 && (
        <section className="rounded-2xl border-2 border-line bg-panel p-6">
          <h2 className="font-bold text-brand-soft">Холбосон хүүхэд алга байна</h2>
          <p className="mt-2 text-sm text-ink-dim">
            Доорх хэсэгт сурагчийн утасны дугаарыг оруулж хүсэлт илгээнэ үү.
            Сурагч эсвэл төвийн ажилтан баталгаажуулмагц хүүхдийн ирц,
            даалгавар, шалгалтын дүн энд харагдана.
          </p>
        </section>
      )}

      {loadState === "ready" && links.length > 0 && (
        <div className="space-y-5">
          {links.map((link) => (
            <ChildPanel key={link.id} link={link} onRefresh={reload} />
          ))}
        </div>
      )}

      {/* Хүүхэд холбох — доод талд (гол агуулга түрүүлнэ; хүүхэдгүй үед хоосон төлөв энд заана). */}
      <section className="rounded-3xl border border-brand-bright/30 bg-brand-bright/5 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 font-bold text-brand-soft">
          <Link2 className="h-5 w-5" aria-hidden />
          {links.length > 0 ? "Өөр хүүхэд холбох" : "Хүүхэд холбох"}
        </h2>
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
            className="min-h-11 rounded-xl bg-brand-bright px-5 py-3 text-sm font-bold text-on-brand disabled:cursor-not-allowed disabled:opacity-40"
          >
            {linkPending ? "Илгээж байна…" : "Хүсэлт илгээх"}
          </button>
        </div>
        {msg && <p className="mt-3 text-sm text-success">{msg}</p>}
      </section>
    </div>
  );
}
