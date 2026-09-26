"use client";

import { BookOpen, ClipboardCheck, CreditCard, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, fileUrl, getRole, uploadFile } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";

/* ============================================================================
 * Хэрэглэгчийн мэндчилгээ — бүх дотоод хуудсанд ижил хэлбэрээр ашиглана
 * (сурагч/багш/админ/худалдан авагч/эцэг эх). Нэвтэрсэн хүний нэр + профайл
 * зургаа энд харна, зурган дээр дарж шинэ зураг оруулж болно.
 *
 * ЭЦЭГ ЭХ бол доор нь баталгаажсан хүүхдийнхээ нэрийг тод харуулна.
 * ========================================================================== */

interface Me {
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
}
interface ChildLink {
  verified: boolean;
  student: { firstName: string; lastName: string };
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};

const QUICK_ACTIONS = [
  { href: "/app/tests", label: "Шалгалт", hint: "Тест өгөх", icon: ClipboardCheck, tone: "bg-brand-bright/15 text-brand-soft" },
  { href: "/app/student#homework", label: "Даалгавар", hint: "Гэрийн даалгавар", icon: NotebookPen, tone: "bg-accent-violet/15 text-accent-violet" },
  { href: "/app/learn", label: "Хичээл", hint: "Онол, видео", icon: BookOpen, tone: "bg-accent-teal/15 text-accent-teal" },
  { href: "/app/student/payments", label: "Төлбөр", hint: "Миний төлбөр", icon: CreditCard, tone: "bg-accent-gold/15 text-accent-gold" },
] as const;

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default function DashboardGreeting() {
  const [me, setMe] = useState<Me | null>(null);
  const [children, setChildren] = useState<ChildLink[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<Me>("/auth/me").then(setMe).catch(() => {});
  }, []);

  useEffect(() => {
    if (me?.role === "PARENT") {
      api<ChildLink[]>("/parent/children").then(setChildren).catch(() => {});
    }
  }, [me?.role]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // ижил файлыг дахин сонгоход ч onChange дуудагдана
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { key } = await uploadFile(file);
      await api("/auth/me/avatar", { method: "POST", body: { key } });
      setMe((m) => (m ? { ...m, avatarUrl: key } : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Зураг оруулахад алдаа гарлаа");
    } finally {
      setUploading(false);
    }
  }

  if (!me) return null;

  const verifiedChildren = children.filter((c) => c.verified);
  const role = typeof window !== "undefined" ? getRole() : null;
  const isStudent = role === "STUDENT";

  return (
    <div className="mb-6 space-y-4">
      {/* Нэвтэрсэн хүний профайл */}
      <div className="flex flex-wrap items-center gap-4">
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        title="Профайл зураг солих"
        className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-line bg-brand-bright/15 text-lg font-extrabold text-brand-soft transition hover:border-brand-bright/50 disabled:opacity-60"
      >
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl(me.avatarUrl)}
            alt="Профайл зураг"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {initials(me.firstName, me.lastName)}
          </span>
        )}
        {/* Профайл зурган дээрх bg-black/60 scrim — зурган overlay тул text-white
            зөв, theme-хамааралтай text-on-* токен энд хэрэггүй. */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
          {uploading ? "…" : "Солих"}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickAvatar}
      />

      <div className="min-w-0">
        <p className="text-lg font-extrabold">
          Сайн байна уу, {me.firstName}!
        </p>
        <p className="text-sm text-ink-dim">
          <Meta
            items={[
              ROLE_LABEL[me.role] ?? me.role,
              verifiedChildren.length > 0 ? (
                <span className="font-semibold text-brand-soft">
                  {verifiedChildren
                    .map((c) => `${c.student.firstName} ${c.student.lastName}`)
                    .join(", ")}
                </span>
              ) : null,
            ]}
          />
        </p>
      </div>
      </div>

      {error && (
        <p className="w-full rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
          {error}
        </p>
      )}

      {/* Сурагчийн түргэн үйлдэл — өнгөт хавтан (шинэ дизайн, 2026-09-26).
          Утсан дээр 2x2, компьютер дээр 4 багана. */}
      {isStudent && (
        <nav aria-label="Түргэн үйлдэл" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {QUICK_ACTIONS.map(({ href, label, hint, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-24 flex-col justify-between rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-brand-bright/40 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-bold text-ink">{label}</span>
                <span className="block text-xs text-ink-dim">{hint}</span>
              </span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
