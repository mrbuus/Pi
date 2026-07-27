"use client";

import { useId, useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import SubjectPicker, {
  SUBJECT_LABELS,
  useEnrollmentWindows,
  type Subject,
} from "./SubjectPicker";

// Төв одоогоор зөвхөн 9-12-р ангийн сурагч авдаг (баталгаажсан бизнесийн
// баримт) — сервер талд 1-12 хүлээж авдаг ч энд бодит хамрах хүрээгээрээ
// хязгаарлаж, үйлчлүүлдэггүй ангиудын мэдээлэл цуглуулахгүй.
const GRADE_OPTIONS = [9, 10, 11, 12];

interface LeadFormProps {
  id?: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

// 4 талбар яг л заасны дагуу: Нэр, Утас, Хичээл, Ангийн түвшин.
// Илүү талбар нэмбэл хөрвүүлэлт (conversion) буурна — энэ бол
// хамгийн өндөр ROI-той өөрчлөлт учир зориудаар хялбар байлгасан.
export default function LeadForm({
  id,
  title = "Мэдээлэл авах",
  subtitle = "4 талбар бөглөөд илгээхэд л хангалттай — манай ажилтан тантай удахгүй холбогдоно.",
  compact = false,
}: LeadFormProps) {
  const idPrefix = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>(["MATH"]);
  const [grade, setGrade] = useState(12);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  // Энэ маягтын зочны сурагчийн төрөл (танхим/онлайн) тодорхойгүй тул бүх
  // хичээлийг харуулна — CLASSROOM_ONLY-г зөвхөн шошгоор мэдээлнэ (5-р
  // талбар нэмэхгүй, хөрвүүлэлтэд муугаар нөлөөлнө).
  const windowsHook = useEnrollmentWindows();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const cleanedPhone = phone.replace(/\s+/g, "");

    if (trimmedName.length < 2) {
      setError("Нэрээ бүтнээр нь бичнэ үү");
      return;
    }
    if (!/^[0-9]{8}$/.test(cleanedPhone)) {
      setError("Утасны дугаар 8 оронтой байх ёстой (жишээ: 99112233)");
      return;
    }
    if (subjects.length === 0) {
      setError("Хамгийн багадаа нэг хичээл сонгоно уу");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      await api("/leads", {
        method: "POST",
        auth: false,
        body: { name: trimmedName, phone: cleanedPhone, subjects, grade },
      });
      setStatus("done");
      setName("");
      setPhone("");
    } catch (err) {
      setStatus("error");
      // Сонгосон хичээлийн аль нэг нь маягт бөглөж байх хооронд хаагдсан
      // байж болзошгүй (400) — ерөнхий "алдаа гарлаа" гэхээс илүү, шинэ
      // цонхны мэдээлэл татаж яг аль хичээл боломжгүй болсныг нэрлэнэ.
      const freshWindows = await windowsHook.refetch();
      const nowUnavailable = subjects.filter((s) => {
        const w = freshWindows.find((fw) => fw.subject === s);
        return !w || w.status !== "OPEN";
      });
      if (nowUnavailable.length > 0) {
        const names = nowUnavailable.map((s) => SUBJECT_LABELS[s]).join(", ");
        setSubjects((cur) => cur.filter((s) => !nowUnavailable.includes(s)));
        setError(
          `${names} хичээлийн элсэлт таны бөглөж байх хооронд хаагдсан байна. Бусад хичээлээ дахин шалгаад дахин илгээнэ үү.`,
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Илгээхэд алдаа гарлаа, дахин оролдоно уу",
        );
      }
    }
  }

  const cardClass = `reveal rounded-2xl border border-line bg-panel p-6 shadow-lg shadow-black/5 ${
    compact ? "" : "sm:p-7"
  }`;
  const inputClass =
    "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-base text-ink";
  const labelClass = "mb-1.5 block text-sm font-semibold text-ink";

  if (status === "done") {
    return (
      <div id={id} className={cardClass}>
        <p className="text-lg font-bold text-success">✓ Баярлалаа!</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          Таны мэдээллийг хүлээн авлаа. Манай ажилтан тантай удахгүй утсаар
          холбогдоно.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-4 text-sm font-semibold text-brand hover:underline"
        >
          Дахин мэдээлэл илгээх
        </button>
      </div>
    );
  }

  return (
    <form id={id} onSubmit={onSubmit} className={cardClass} noValidate>
      <p className="text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-dim">{subtitle}</p>

      <div className="mt-5 grid gap-4">
        <div>
          <label htmlFor={`${idPrefix}-name`} className={labelClass}>
            Нэр
          </label>
          <input
            id={`${idPrefix}-name`}
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Таны нэр"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={`${idPrefix}-phone`} className={labelClass}>
            Утасны дугаар
          </label>
          <input
            id={`${idPrefix}-phone`}
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9911 2233"
            className={inputClass}
          />
        </div>

        <SubjectPicker
          value={subjects}
          onChange={setSubjects}
          windows={windowsHook.windows}
          loading={windowsHook.loading}
        />

        <div>
          <label htmlFor={`${idPrefix}-grade`} className={labelClass}>
            Ангийн түвшин
          </label>
          <select
            id={`${idPrefix}-grade`}
            name="grade"
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className={inputClass}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}-р анги
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
        >
          <span aria-hidden>⚠</span>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="glow-pulse mt-5 w-full rounded-full bg-brand-bright px-6 py-3.5 font-bold text-on-brand transition hover:opacity-95 disabled:opacity-60"
      >
        {status === "loading" ? "Илгээж байна…" : "Мэдээлэл илгээх"}
      </button>
    </form>
  );
}
