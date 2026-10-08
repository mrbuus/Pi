"use client";
import { useEffect, useState } from "react";
import { Check, Link2, ClipboardCheck } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import { AcknowledgeResultDialog } from "@/components/parent/AcknowledgeResultDialog";
import ChildHistory from "@/components/parent/ChildHistory";
import PaidUntilCard from "@/components/payments/PaidUntilCard";
import { formatMnt } from "@/lib/orgInfo";
import { STATUS_LABEL } from "@/components/payments/paymentHelpers";
import { Meta } from "@/components/ui/Meta";
type Result = {
  id: string;
  totalScore: number;
  maxScore: number;
  source: string;
  createdAt: string;
  test: { title: string; type: string };
  acknowledgements?: { verifiedAt: string }[];
};
type ParentLink = {
  id: string;
  verified: boolean;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    studentProfile?: {
      grade?: number;
      school?: string | null;
      type?: string;
    } | null;
    classroom?: { name: string } | null;
    testResults?: Result[];
    payments?: {
      id: string;
      status: string;
      amount: number;
      createdAt: string;
    }[];
    attendances?: {
      date: string;
      status: string;
      classroom: { name: string };
    }[];
    dailyHomeworkMarks?: {
      date: string;
      status: string;
      classroom: { name: string };
    }[];
    submissions?: {
      id: string;
      state: string;
      assignment: { title: string };
    }[];
  };
};
const ATT: Record<string, string> = {
  PRESENT: "Ирсэн",
  LATE: "Хоцорсон",
  ABSENT: "Тасалсан",
  EXCUSED: "Чөлөөтэй",
};
const HOMEWORK: Record<string, string> = {
  DONE: "Хийсэн",
  PARTIAL: "Дутуу",
  NOT_DONE: "Хийгээгүй",
  SUBMITTED: "Шалгуулахаар илгээсэн",
  RETURNED: "Дахин илгээх",
  DONE_ONLINE: "Шалгасан",
  DONE_IN_CLASS: "Ангид шалгасан",
};
function ChildPanel({
  link,
  onRefresh,
}: {
  link: ParentLink;
  onRefresh: () => void;
}) {
  const child = link.student;
  const [selected, setSelected] = useState<Result | null>(null);
  if (!link.verified)
    return (
      <Card>
        <CardContent className="pt-5 space-y-2">
          <h2 className="font-semibold">
            {child.firstName} {child.lastName}
          </h2>
          <p className="text-sm text-ink-dim">
            Холболтын баталгаажуулалт хүлээж байна. Баталгаажсаны дараа хүүхдийн
            бүртгэл харагдана.
          </p>
        </CardContent>
      </Card>
    );
  const results = child.testResults ?? [],
    attendance = child.attendances ?? [],
    marks = child.dailyHomeworkMarks ?? [],
    submissions = child.submissions ?? [],
    payments = child.payments ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="cyrillic-heading">
          {child.firstName} {child.lastName}
        </CardTitle>
        <div className="text-sm text-ink-dim">
          <Meta
            items={[
              child.studentProfile?.grade
                ? `${child.studentProfile.grade}-р анги`
                : null,
              child.classroom?.name,
              child.studentProfile?.school,
            ]}
          />
        </div>
        <p className="flex items-center gap-2 text-sm text-success">
          <Check size={16} /> Холболт баталгаажсан
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-ink-dim">
          Өөрийн тэмдэглэгээ, багшийн үнэлгээ, засварыг тусад нь хараарай. Нэг
          удаагийн алдаа нь хүүхдийн чадварын дүгнэлт биш.
        </p>
        {results[0] && (
          <div className="rounded-lg bg-panel p-3 space-y-2">
            <h3 className="font-semibold">Хамгийн сүүлийн дүн</h3>
            <p className="text-sm">
              {results[0].test.title} — {results[0].totalScore}/
              {results[0].maxScore} оноо
            </p>
            <p className="text-xs text-ink-dim">
              {results[0].source === "CHAPTER_EXAM"
                ? "Багшийн үнэлгээ"
                : results[0].source === "EVENING_SELF_REPORT"
                  ? "Сурагчийн өөрийн тэмдэглэгээ"
                  : "Шалгалтын дүн"}{" "}
              — {results[0].createdAt.slice(0, 10)}
            </p>
          </div>
        )}
        <ChildHistory studentId={child.id} />
        <details className="rounded-xl border border-line p-4">
          <summary className="min-h-11 cursor-pointer font-semibold flex items-center gap-2">
            <ClipboardCheck size={18} /> Сүүлийн шалгалтын дүнтэй танилцах
          </summary>
          <div className="space-y-3 mt-3">
            {!results.length && (
              <p className="text-sm text-ink-dim">Дүн хараахан бүртгээгүй.</p>
            )}
            {results.map((result) => (
              <article
                key={result.id}
                className="border-t border-line pt-3 space-y-2"
              >
                <h4 className="text-sm font-semibold">{result.test.title}</h4>
                <p className="text-sm">
                  {result.totalScore}/{result.maxScore} оноо —{" "}
                  {result.createdAt.slice(0, 10)}
                </p>
                {result.acknowledgements?.length ? (
                  <p className="text-sm text-success">
                    Танилцсан —{" "}
                    {result.acknowledgements[0].verifiedAt.slice(0, 10)}
                  </p>
                ) : child.studentProfile?.type === "CLASSROOM" ? (
                  <Button variant="outline" onClick={() => setSelected(result)}>
                    Дүнтэй танилцлаа
                  </Button>
                ) : (
                  <p className="text-xs text-ink-dim">
                    Онлайн дүнгийн мэдээлэл
                  </p>
                )}
              </article>
            ))}
          </div>
        </details>
        <details className="rounded-xl border border-line p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Сүүлийн ирц, даалгавар
          </summary>
          <div className="space-y-2 mt-3 text-sm">
            <p className="text-ink-dim">
              Энд сүүлийн бүртгэлүүд байна. Жилийн бүтэн түүхийг дээрээс нээнэ.
            </p>
            {attendance.map((row, i) => (
              <p key={`${row.date}-${i}`}>
                {row.date.slice(0, 10)} — {row.classroom.name} —{" "}
                {ATT[row.status] ?? "Тэмдэглэсэн"}
              </p>
            ))}
            {marks.map((row, i) => (
              <p key={`${row.date}-${i}`}>
                {row.date.slice(0, 10)} — {row.classroom.name} —{" "}
                {HOMEWORK[row.status] ?? "Тэмдэглэсэн"}
              </p>
            ))}
            {submissions.map((row) => (
              <p key={row.id}>
                {row.assignment.title} — {HOMEWORK[row.state] ?? "Тэмдэглэсэн"}
              </p>
            ))}
            {!attendance.length && !marks.length && !submissions.length && (
              <p>Сүүлийн бүртгэл байхгүй байна.</p>
            )}
          </div>
        </details>
        <details className="rounded-xl border border-line p-4">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Энэ хүүхдийн төлбөр
          </summary>
          <div className="mt-3 space-y-3">
            <PaidUntilCard studentId={child.id} compact />
            {payments.map((payment) => (
              <p key={payment.id} className="text-sm">
                {formatMnt(payment.amount)} —{" "}
                {STATUS_LABEL[payment.status]?.text ?? "Тэмдэглэсэн"} —{" "}
                {payment.createdAt.slice(0, 10)}
              </p>
            ))}
            {!payments.length && (
              <p className="text-sm text-ink-dim">
                Төлбөрийн бүртгэл хараахан байхгүй.
              </p>
            )}
          </div>
        </details>
        {selected && (
          <AcknowledgeResultDialog
            key={selected.id}
            testResultId={selected.id}
            testTitle={selected.test.title}
            isOpen={true}
            onClose={() => setSelected(null)}
            onSuccess={() => {
              setSelected(null);
              onRefresh();
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
export default function ParentPage() {
  const [links, setLinks] = useState<ParentLink[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [phone, setPhone] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function load() {
    api<ParentLink[]>("/parent/children")
      .then(setLinks)
      .catch(() =>
        setError(
          "Хүүхдийн мэдээлэл нээгдсэнгүй. Холболтоо шалгаад дахин оролдоно уу.",
        ),
      )
      .finally(() => setLoading(false));
  }
  useEffect(load, []);
  function reload() {
    setLoading(true);
    setError("");
    load();
  }
  async function requestLink() {
    setBusy(true);
    setMessage("");
    try {
      await api("/parent/links", {
        method: "POST",
        body: { studentPhone: phone.replace(/\D/g, "") },
      });
      setPhone("");
      setMessage(
        "Холболтын хүсэлт илгээгдлээ. Баталгаажуулсны дараа хүүхдийн мэдээлэл харагдана.",
      );
      reload();
    } catch {
      setMessage(
        "Хүсэлт илгээгдсэнгүй. Утасны дугаарыг шалгаад дахин оролдоно уу.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4 pb-24 text-ink">
      <header>
        <h1 className="cyrillic-heading text-2xl font-semibold">
          Хүүхдийн сурах явц
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Баталгаажсан холболтын хүрээнд бодит ирц, даалгавар, дүн, жилийн
          түүхийг үзнэ.
        </p>
      </header>
      {loading ? (
        <LoadingState rows={4} label="Хүүхдийн мэдээлэл" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : links.length ? (
        links.map((link) => (
          <ChildPanel key={link.id} link={link} onRefresh={reload} />
        ))
      ) : (
        <Card>
          <CardContent className="pt-5">
            <p>
              Холбосон хүүхэд хараахан байхгүй. Доорх утасны дугаараар хүсэлт
              илгээж болно.
            </p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 size={18} />{" "}
            {links.length ? "Өөр хүүхэд холбох" : "Хүүхэд холбох"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void requestLink();
            }}
          >
            <label className="block">
              Сурагчийн утасны дугаар
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
                maxLength={15}
                className="mt-2 min-h-12 w-full rounded-lg border border-line bg-surface px-3"
                autoComplete="tel"
              />
            </label>
            <Button
              type="submit"
              disabled={busy || phone.replace(/\D/g, "").length !== 8}
              className="w-full"
            >
              {busy ? "Илгээж байна…" : "Хүсэлт илгээх"}
            </Button>
          </form>
          {message && (
            <p className="mt-3 text-sm" role="status">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
