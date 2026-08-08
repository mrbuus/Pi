"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TriangleAlert, Check, X } from "lucide-react";
import DashboardGreeting from "@/components/DashboardGreeting";
import RequireRole from "@/components/nav/RequireRole";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";

interface Payment {
  id: string;
  amount: number;
  method: string;
  description?: string;
  forMonth?: string;
  createdAt: string;
  user: { firstName: string; lastName: string; phone: string };
}
interface Pass {
  id: string;
  name: string;
  durationDays: number;
  price?: number;
}
interface MonthRow {
  student: { firstName: string; lastName: string; phone: string };
  classroom: { name: string };
  paid: boolean;
}
interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  teacherProfile: { canManageStudents: boolean } | null;
  ownedClassrooms: { id: string; name: string }[];
}
interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  username: string | null;
  role: string;
  studentProfile: { type: string; grade: number | null; school: string | null } | null;
  teacherProfile: { canManageStudents: boolean } | null;
  ownedClassrooms: { id: string; name: string }[];
}

const ROLES = [
  "ADMIN",
  "TEACHER_PLUS",
  "TEACHER",
  "STUDENT",
  "PARENT",
  "BUYER",
] as const;

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};

type Msg = { kind: "success" | "error"; text: string } | null;

/** API алдааг хэрэглэгчид харуулах эвтэй мессеж болгоно. */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * Ачаалж буй / алдаатай / хоосон гурван төлөвийг нэг дороос харуулна —
 * "хоосон" ба "ачааллаж чадаагүй" хоёрыг хэрэглэгч ялгаж харна.
 */
function SectionStatus({
  loading,
  error,
  onRetry,
  empty,
  emptyText,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: boolean;
  emptyText: string;
}) {
  if (loading) {
    return <LoadingState rows={3} label={emptyText} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (empty) {
    return <EmptyState title={emptyText} />;
  }
  return null;
}

export default function AdminDashboardClient() {
  const month = new Date().toISOString().slice(0, 7);

  const [pending, setPending] = useState<Payment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [passes, setPasses] = useState<Pass[]>([]);
  const [passesError, setPassesError] = useState<string | null>(null);

  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [monthRowsLoading, setMonthRowsLoading] = useState(true);
  const [monthRowsError, setMonthRowsError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [teachersError, setTeachersError] = useState<string | null>(null);

  const [passPick, setPassPick] = useState<Record<string, string>>({});
  const [newClass, setNewClass] = useState("");
  const [creatingClassroom, setCreatingClassroom] = useState(false);
  const [newPass, setNewPass] = useState({ name: "", days: 30, price: 0 });
  const [creatingPass, setCreatingPass] = useState(false);
  const [promotePhone, setPromotePhone] = useState("");
  const [msg, setMsg] = useState<Msg>(null);

  // Шинэ хэрэглэгч нэг дороос үүсгэх (эрхийг нь шууд сонгоно)
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "STUDENT" as (typeof ROLES)[number],
  });
  const [creatingUser, setCreatingUser] = useState(false);
  // Түр нууц үг — ЗӨВХӨН НЭГ УДАА харуулах зарчим: анхандаа далдлагдсан,
  // "Харах" дарж л харагдана, "Хаах" дарвал state-ээс бүр мөсөн арилна.
  const [tempReveal, setTempReveal] = useState<{
    password: string;
    visible: boolean;
  } | null>(null);

  const load = useCallback(() => {
    setPendingLoading(true);
    setPendingError(null);
    api<Payment[]>("/payments?status=PENDING")
      .then(setPending)
      .catch((e) => setPendingError(errMsg(e)))
      .finally(() => setPendingLoading(false));

    setPassesError(null);
    api<Pass[]>("/catalog/passes", { auth: false })
      .then(setPasses)
      .catch((e) => setPassesError(errMsg(e)));

    setMonthRowsLoading(true);
    setMonthRowsError(null);
    api<MonthRow[]>(`/payments/months/${month}`)
      .then(setMonthRows)
      .catch((e) => setMonthRowsError(errMsg(e)))
      .finally(() => setMonthRowsLoading(false));

    setUsersLoading(true);
    setUsersError(null);
    api<UserRow[]>("/users")
      .then(setUsers)
      .catch((e) => setUsersError(errMsg(e)))
      .finally(() => setUsersLoading(false));

    setTeachersLoading(true);
    setTeachersError(null);
    api<Teacher[]>("/users/teachers")
      .then(setTeachers)
      .catch((e) => setTeachersError(errMsg(e)))
      .finally(() => setTeachersLoading(false));
  }, [month]);
  useEffect(load, [load]);

  async function setUserRole(id: string, role: string) {
    try {
      await api(`/users/${id}/role`, { method: "PATCH", body: { role } });
      setMsg({ kind: "success", text: "Үүрэг солигдлоо" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  async function setTeacherStatus(
    id: string,
    plus: boolean,
    canManageStudents: boolean,
  ) {
    try {
      await api(`/users/${id}/teacher-status`, {
        method: "PATCH",
        body: { plus, canManageStudents },
      });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  async function createUser() {
    if (!newUser.firstName.trim() || !newUser.lastName.trim()) {
      setMsg({ kind: "error", text: "Нэр, овог заавал бөглөнө үү" });
      return;
    }
    setCreatingUser(true);
    try {
      const res = await api<{ user: { id: string }; tempPassword?: string }>(
        "/users",
        {
          method: "POST",
          body: {
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            phone: newUser.phone || undefined,
          },
        },
      );
      if (res.tempPassword) {
        setTempReveal({ password: res.tempPassword, visible: false });
        setMsg({ kind: "success", text: "Хэрэглэгч үүслээ" });
      } else {
        setMsg({
          kind: "success",
          text: "Хэрэглэгч үүслээ — анхны нууц үг нь утасны дугаар",
        });
      }
      setNewUser({ firstName: "", lastName: "", phone: "", role: "STUDENT" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setCreatingUser(false);
    }
  }

  async function copyTempPassword() {
    if (!tempReveal) return;
    try {
      await navigator.clipboard.writeText(tempReveal.password);
      setMsg({ kind: "success", text: "Нууц үг санах ойд хуулагдлаа" });
    } catch {
      setMsg({ kind: "error", text: "Хуулж чадсангүй — гараар хуулна уу" });
    }
  }

  async function promoteTeacher() {
    if (!promotePhone.trim()) return;
    try {
      await api("/users/promote-teacher", {
        method: "POST",
        body: { phone: promotePhone },
      });
      setPromotePhone("");
      setMsg({ kind: "success", text: "Багш боллоо" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  async function confirm(id: string) {
    try {
      await api(`/payments/${id}/confirm`, {
        method: "POST",
        body: passPick[id] ? { passId: passPick[id] } : {},
      });
      setMsg({ kind: "success", text: "Баталгаажлаа" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  async function createClassroom() {
    if (!newClass.trim()) return;
    setCreatingClassroom(true);
    try {
      await api("/classrooms", {
        method: "POST",
        body: { name: newClass, type: "IN_PERSON" },
      });
      setNewClass("");
      setMsg({ kind: "success", text: "Анги үүслээ" });
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setCreatingClassroom(false);
    }
  }

  async function createPass() {
    if (!newPass.name.trim()) return;
    setCreatingPass(true);
    try {
      await api("/passes", {
        method: "POST",
        body: {
          name: newPass.name,
          durationDays: newPass.days,
          price: newPass.price || undefined,
          scope: { all: true },
        },
      });
      setNewPass({ name: "", days: 30, price: 0 });
      setMsg({ kind: "success", text: "Эрх үүслээ" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setCreatingPass(false);
    }
  }

  const inputCls =
    "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
  const selectCls =
    "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
  const primaryBtn =
    "rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50";
  const outlineBtn =
    "rounded-lg border border-line px-4 py-2 text-sm transition hover:border-brand disabled:opacity-50";

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
    <div className="space-y-8">
      <DashboardGreeting />
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-extrabold">Удирдлага</h1>
        <Link
          href="/app/admin/content"
          className={primaryBtn}
        >
          Контент удирдах (ном/бодлого)
        </Link>
        {msg && (
          <span
            role="status"
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${
              msg.kind === "error"
                ? "bg-error/10 text-error"
                : "bg-success/10 text-success"
            }`}
          >
            {msg.kind === "error" ? <TriangleAlert className="h-4 w-4" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} {msg.text}
          </span>
        )}
      </div>

      {/* Шинэ хэрэглэгч — эрхийг нь шууд сонгоно */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-1 font-bold text-brand-soft">Шинэ хэрэглэгч нэмэх</h2>
        <p className="mb-4 text-xs text-ink-dim">
          Эрхийг (роль) нь энд шууд сонгоно — дараа нь дахин солих шаардлагагүй
        </p>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="new-user-firstname">
            Нэр
          </label>
          <input
            id="new-user-firstname"
            value={newUser.firstName}
            onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            placeholder="Нэр"
            className={`min-w-[140px] flex-1 ${inputCls}`}
          />
          <label className="sr-only" htmlFor="new-user-lastname">
            Овог
          </label>
          <input
            id="new-user-lastname"
            value={newUser.lastName}
            onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            placeholder="Овог"
            className={`min-w-[140px] flex-1 ${inputCls}`}
          />
          <label className="sr-only" htmlFor="new-user-phone">
            Утас
          </label>
          <input
            id="new-user-phone"
            value={newUser.phone}
            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
            placeholder="Утас (сонголтоор)"
            inputMode="numeric"
            className={`w-40 ${inputCls}`}
          />
          <label className="sr-only" htmlFor="new-user-role">
            Эрх
          </label>
          <select
            id="new-user-role"
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value as (typeof ROLES)[number] })
            }
            className={selectCls}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          <button onClick={createUser} disabled={creatingUser} className={primaryBtn}>
            {creatingUser ? "Нэмэж байна…" : "Нэмэх"}
          </button>
        </div>

        {/* Түр нууц үг — reveal-once: анхандаа далдлагдсан, дахин ачаалахад алга болно */}
        {tempReveal && (
          <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <p className="mb-2 inline-flex items-center gap-1.5 font-semibold text-warning">
              <TriangleAlert className="h-4 w-4" aria-hidden /> Энэ түр нууц үгийг ЗӨВХӨН ОДОО, НЭГ Л УДАА харуулж байна — хаавал
              дахин сэргээх боломжгүй тул шууд хуулж, хэрэглэгчид дамжуулна уу.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg border border-line bg-bg px-3 py-1.5 font-mono tracking-widest">
                {tempReveal.visible
                  ? tempReveal.password
                  : "•".repeat(tempReveal.password.length)}
              </code>
              <button
                onClick={() =>
                  setTempReveal((t) => (t ? { ...t, visible: !t.visible } : t))
                }
                className={outlineBtn}
              >
                {tempReveal.visible ? "Нуух" : "Харах"}
              </button>
              <button onClick={copyTempPassword} className={outlineBtn}>
                Хуулах
              </button>
              <button
                onClick={() => setTempReveal(null)}
                className="rounded-lg border border-error/40 px-4 py-2 text-sm text-error transition hover:bg-error/10"
              >
                Хаах
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Хэрэглэгчдийн үүрэг */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-soft">Хэрэглэгчдийн үүрэг</h2>
            <p className="text-xs text-ink-dim">{users.length} хэрэглэгч</p>
          </div>
        </div>
        <SectionStatus
          loading={usersLoading}
          error={usersError}
          onRetry={load}
          empty={!usersLoading && !usersError && users.length === 0}
          emptyText="Хэрэглэгч алга байна"
        />
        {!usersLoading && !usersError && users.length > 0 && (
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 rounded-lg border border-line px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {u.firstName} {u.lastName}
                    </span>
                    <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-ink-dim">
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-ink-dim">
                    {[u.phone, u.email, u.username ? `@${u.username}` : ""]
                      .filter(Boolean).length > 0 ? (
                      <Meta items={[u.phone, u.email, u.username ? `@${u.username}` : ""].filter(Boolean)} />
                    ) : (
                      "Холбоо барих мэдээлэлгүй"
                    )}
                  </p>
                  {(u.studentProfile?.grade || u.ownedClassrooms.length > 0) && (
                    <p className="mt-1 text-xs text-ink-dim">
                      <Meta items={[
                        u.studentProfile?.grade ? `${u.studentProfile.grade}-р анги` : "",
                        u.ownedClassrooms.map((c) => c.name).join(", ")
                      ]} />
                    </p>
                  )}
                </div>
                <label className="sr-only" htmlFor={`role-${u.id}`}>
                  {u.firstName} {u.lastName}-ийн эрх
                </label>
                <select
                  id={`role-${u.id}`}
                  value={u.role}
                  onChange={(e) => void setUserRole(u.id, e.target.value)}
                  className={`w-full ${selectCls} lg:w-48`}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Багш нарын эрх удирдах */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Багш нарын эрх</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="promote-phone">
            Утсаар шинэ багш болгох
          </label>
          <input
            id="promote-phone"
            value={promotePhone}
            onChange={(e) => setPromotePhone(e.target.value)}
            placeholder="Утсаар шинэ багш болгох"
            className={`flex-1 ${inputCls}`}
          />
          <button onClick={promoteTeacher} className={outlineBtn}>
            Багш болгох
          </button>
        </div>
        <SectionStatus
          loading={teachersLoading}
          error={teachersError}
          onRetry={load}
          empty={!teachersLoading && !teachersError && teachers.length === 0}
          emptyText="Багш алга байна"
        />
        {!teachersLoading && !teachersError && teachers.length > 0 && (
          <div className="space-y-2">
            {teachers.map((t) => {
              const isPlus = t.role === "TEACHER_PLUS";
              return (
                <div
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {t.firstName} {t.lastName}
                    </span>
                    <span className="ml-2 text-ink-dim">{t.phone}</span>
                    {t.ownedClassrooms.length > 0 && (
                      <span className="ml-2 text-xs text-ink-dim">
                        <Meta items={[t.ownedClassrooms.map((c) => c.name).join(", ")]} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs ${
                        isPlus
                          ? "bg-brand-bright/15 text-brand-soft"
                          : "bg-bg text-ink-dim"
                      }`}
                    >
                      {isPlus ? "Багш+" : "Багш"}
                    </span>
                    {isPlus ? (
                      <button
                        onClick={() => setTeacherStatus(t.id, false, false)}
                        className={outlineBtn}
                      >
                        Энгийн багш болгох
                      </button>
                    ) : (
                      <button
                        onClick={() => setTeacherStatus(t.id, true, true)}
                        className={primaryBtn}
                      >
                        Багш+ болгох
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          Хүлээгдэж буй төлбөрүүд
        </h2>
        <SectionStatus
          loading={pendingLoading}
          error={pendingError}
          onRetry={load}
          empty={!pendingLoading && !pendingError && pending.length === 0}
          emptyText="Хүлээгдэж буй төлбөр алга"
        />
        {!pendingLoading && !pendingError && pending.length > 0 && (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="font-semibold">
                    {p.user.firstName} {p.user.lastName}
                  </span>
                  <span className="text-ink-dim">{p.user.phone}</span>
                  <span className="rounded-full bg-warning/15 px-3 py-0.5 text-xs text-warning">
                    <Meta items={[`${p.amount.toLocaleString()}₮`, p.method]} />
                  </span>
                  {p.forMonth && <span className="text-ink-dim">{p.forMonth}</span>}
                </div>
                {p.description && (
                  <p className="mt-1 text-sm text-ink-dim">{p.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="sr-only" htmlFor={`pass-${p.id}`}>
                    Олгох эрх
                  </label>
                  <select
                    id={`pass-${p.id}`}
                    value={passPick[p.id] ?? ""}
                    onChange={(e) =>
                      setPassPick((m) => ({ ...m, [p.id]: e.target.value }))
                    }
                    className={selectCls}
                  >
                    <option value="">Эрх олгохгүй</option>
                    {passes.map((ps) => (
                      <option key={ps.id} value={ps.id}>
                        {ps.name} ({ps.durationDays} хоног)
                      </option>
                    ))}
                  </select>
                  <button onClick={() => confirm(p.id)} className={primaryBtn}>
                    Баталгаажуулах
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {passesError && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-error">
            <TriangleAlert className="h-4 w-4" aria-hidden /> Эрхийн жагсаалт ачаалагдсангүй: {passesError}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          {month} сарын төлөлт (танхимын сурагчид)
        </h2>
        <SectionStatus
          loading={monthRowsLoading}
          error={monthRowsError}
          onRetry={load}
          empty={!monthRowsLoading && !monthRowsError && monthRows.length === 0}
          emptyText="Энэ сард танхимын сурагч алга байна"
        />
        {!monthRowsLoading && !monthRowsError && monthRows.length > 0 && (
          <div className="space-y-1.5">
            {monthRows.map((r, i) => (
              <div
                key={i}
                className="flex justify-between rounded-lg border border-line px-4 py-2 text-sm"
              >
                <span>
                  <Meta items={[`${r.student.firstName} ${r.student.lastName}`, r.classroom.name]} />
                </span>
                <span
                  className={`${
                    r.paid
                      ? "text-success"
                      : "font-bold text-error"
                  } inline-flex items-center gap-1.5`}
                >
                  {r.paid ? <><Check className="h-4 w-4" aria-hidden /> Төлсөн</> : <><X className="h-4 w-4" aria-hidden /> Төлөөгүй</>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шинэ анги</h2>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="new-classroom-name">
              Ангийн нэр
            </label>
            <input
              id="new-classroom-name"
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder="Ангийн нэр"
              className={`flex-1 ${inputCls}`}
            />
            <button
              onClick={createClassroom}
              disabled={creatingClassroom}
              className={primaryBtn}
            >
              {creatingClassroom ? "Үүсгэж байна…" : "Үүсгэх"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шинэ эрх (pass)</h2>
          <div className="space-y-2">
            <label className="sr-only" htmlFor="new-pass-name">
              Нэр
            </label>
            <input
              id="new-pass-name"
              value={newPass.name}
              onChange={(e) => setNewPass({ ...newPass, name: e.target.value })}
              placeholder="Нэр (ж: Сарын онлайн эрх)"
              className={`w-full ${inputCls}`}
            />
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="new-pass-days">
                Хоног
              </label>
              <input
                id="new-pass-days"
                type="number"
                value={newPass.days}
                onChange={(e) =>
                  setNewPass({ ...newPass, days: parseInt(e.target.value) || 30 })
                }
                placeholder="Хоног"
                className={`w-24 ${inputCls}`}
              />
              <label className="sr-only" htmlFor="new-pass-price">
                Үнэ
              </label>
              <input
                id="new-pass-price"
                type="number"
                value={newPass.price}
                onChange={(e) =>
                  setNewPass({ ...newPass, price: parseInt(e.target.value) || 0 })
                }
                placeholder="Үнэ ₮"
                className={`w-32 ${inputCls}`}
              />
              <button
                onClick={createPass}
                disabled={creatingPass}
                className={`flex-1 ${primaryBtn}`}
              >
                {creatingPass ? "Үүсгэж байна…" : "Үүсгэх"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
    </RequireRole>
  );
}
