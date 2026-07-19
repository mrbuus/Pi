"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import DashboardGreeting from "@/components/DashboardGreeting";
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

export default function AdminDashboard() {
  const month = new Date().toISOString().slice(0, 7);
  const [pending, setPending] = useState<Payment[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [passPick, setPassPick] = useState<Record<string, string>>({});
  const [newClass, setNewClass] = useState("");
  const [newPass, setNewPass] = useState({ name: "", days: 30, price: 0 });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [promotePhone, setPromotePhone] = useState("");
  const [msg, setMsg] = useState("");
  // Шинэ хэрэглэгч нэг дороос үүсгэх (эрхийг нь шууд сонгоно)
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    role: "STUDENT" as (typeof ROLES)[number],
  });

  const load = useCallback(() => {
    api<Payment[]>("/payments?status=PENDING").then(setPending);
    api<Pass[]>("/catalog/passes", { auth: false }).then(setPasses);
    api<MonthRow[]>(`/payments/months/${month}`).then(setMonthRows);
    api<UserRow[]>("/users").then(setUsers).catch(() => {});
    api<Teacher[]>("/users/teachers").then(setTeachers).catch(() => {});
  }, [month]);

  async function setUserRole(id: string, role: string) {
    try {
      await api(`/users/${id}/role`, {
        method: "PATCH",
        body: { role },
      });
      setMsg("✓ Үүрэг солигдлоо");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  async function setTeacherStatus(
    id: string,
    plus: boolean,
    canManageStudents: boolean,
  ) {
    await api(`/users/${id}/teacher-status`, {
      method: "PATCH",
      body: { plus, canManageStudents },
    });
    load();
  }

  async function createUser() {
    if (!newUser.firstName.trim() || !newUser.lastName.trim()) {
      setMsg("Нэр, овог заавал бөглөнө үү");
      return;
    }
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
      setMsg(
        res.tempPassword
          ? `✓ Хэрэглэгч үүслээ — түр нууц үг: ${res.tempPassword}`
          : "✓ Хэрэглэгч үүслээ — анхны нууц үг нь утасны дугаар",
      );
      setNewUser({ firstName: "", lastName: "", phone: "", role: "STUDENT" });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
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
      setMsg("✓ Багш боллоо");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }
  useEffect(load, [load]);

  async function confirm(id: string) {
    try {
      await api(`/payments/${id}/confirm`, {
        method: "POST",
        body: passPick[id] ? { passId: passPick[id] } : {},
      });
      setMsg("✓ Баталгаажлаа");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  async function createClassroom() {
    if (!newClass.trim()) return;
    await api("/classrooms", {
      method: "POST",
      body: { name: newClass, type: "IN_PERSON" },
    });
    setNewClass("");
    setMsg("✓ Анги үүслээ");
  }

  async function createPass() {
    if (!newPass.name.trim()) return;
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
    load();
    setMsg("✓ Эрх үүслээ");
  }

  return (
    <div className="space-y-8">
      <DashboardGreeting />
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-2xl font-extrabold">Удирдлага</h1>
        <Link
          href="/app/admin/content"
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
        >
          Контент удирдах (ном/бодлого)
        </Link>
        {msg && <span className="text-sm text-teal-300">{msg}</span>}
      </div>

      {/* Шинэ хэрэглэгч — эрхийг нь шууд сонгоно */}
      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-1 font-bold text-brand-soft">Шинэ хэрэглэгч нэмэх</h2>
        <p className="mb-4 text-xs text-ink-dim">
          Эрхийг (роль) нь энд шууд сонгоно — дараа нь дахин солих шаардлагагүй
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            value={newUser.firstName}
            onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
            placeholder="Нэр"
            className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
          <input
            value={newUser.lastName}
            onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
            placeholder="Овог"
            className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
          <input
            value={newUser.phone}
            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
            placeholder="Утас (сонголтоор)"
            inputMode="numeric"
            className="w-40 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value as (typeof ROLES)[number] })
            }
            className="rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm outline-none focus:border-brand-bright"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL[role]}
              </option>
            ))}
          </select>
          <button
            onClick={createUser}
            className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
          >
            Нэмэх
          </button>
        </div>
      </section>

      {/* Хэрэглэгчдийн үүрэг */}
      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-bold text-brand-soft">Хэрэглэгчдийн үүрэг</h2>
            <p className="text-xs text-ink-dim">
              {users.length} хэрэглэгч
            </p>
          </div>
        </div>
        <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-3 rounded-lg border border-white/8 px-4 py-3 text-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {u.firstName} {u.lastName}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-ink-dim">
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-ink-dim">
                  {[u.phone, u.email, u.username ? `@${u.username}` : ""]
                    .filter(Boolean)
                    .join(" · ") || "Холбоо барих мэдээлэлгүй"}
                </p>
                {(u.studentProfile?.grade || u.ownedClassrooms.length > 0) && (
                  <p className="mt-1 text-xs text-ink-dim">
                    {u.studentProfile?.grade
                      ? `${u.studentProfile.grade}-р анги`
                      : ""}
                    {u.studentProfile?.grade && u.ownedClassrooms.length > 0
                      ? " · "
                      : ""}
                    {u.ownedClassrooms.map((c) => c.name).join(", ")}
                  </p>
                )}
              </div>
              <select
                value={u.role}
                onChange={(e) => void setUserRole(u.id, e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm outline-none focus:border-brand-bright lg:w-48"
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
      </section>

      {/* Багш нарын эрх удирдах */}
      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Багш нарын эрх</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={promotePhone}
            onChange={(e) => setPromotePhone(e.target.value)}
            placeholder="Утсаар шинэ багш болгох"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
          <button
            onClick={promoteTeacher}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm transition hover:border-white/40"
          >
            Багш болгох
          </button>
        </div>
        <div className="space-y-2">
          {teachers.map((t) => {
            const isPlus = t.role === "TEACHER_PLUS";
            return (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/8 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">
                    {t.firstName} {t.lastName}
                  </span>
                  <span className="ml-2 text-ink-dim">{t.phone}</span>
                  {t.ownedClassrooms.length > 0 && (
                    <span className="ml-2 text-xs text-ink-dim">
                      · {t.ownedClassrooms.map((c) => c.name).join(", ")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      isPlus
                        ? "bg-brand-bright/15 text-brand-soft"
                        : "bg-white/5 text-ink-dim"
                    }`}
                  >
                    {isPlus ? "Багш+" : "Багш"}
                  </span>
                  {isPlus ? (
                    <button
                      onClick={() => setTeacherStatus(t.id, false, false)}
                      className="rounded-lg border border-white/15 px-3 py-1 text-xs transition hover:border-white/40"
                    >
                      Энгийн багш болгох
                    </button>
                  ) : (
                    <button
                      onClick={() => setTeacherStatus(t.id, true, true)}
                      className="rounded-lg bg-brand-bright/80 px-3 py-1 text-xs font-bold"
                    >
                      Багш+ болгох
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          Хүлээгдэж буй төлбөрүүд
        </h2>
        {pending.length === 0 && (
          <p className="text-sm text-ink-dim">Хүлээгдэж буй төлбөр алга</p>
        )}
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/8 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">
                  {p.user.firstName} {p.user.lastName}
                </span>
                <span className="text-ink-dim">{p.user.phone}</span>
                <span className="rounded-full bg-amber-400/15 px-3 py-0.5 text-xs text-amber-300">
                  {p.amount.toLocaleString()}₮ · {p.method}
                </span>
                {p.forMonth && <span className="text-ink-dim">{p.forMonth}</span>}
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-ink-dim">{p.description}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={passPick[p.id] ?? ""}
                  onChange={(e) =>
                    setPassPick((m) => ({ ...m, [p.id]: e.target.value }))
                  }
                  className="rounded-lg border border-white/10 bg-[#0b142e] px-3 py-1.5 text-sm"
                >
                  <option value="">Эрх олгохгүй</option>
                  {passes.map((ps) => (
                    <option key={ps.id} value={ps.id}>
                      {ps.name} ({ps.durationDays} хоног)
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => confirm(p.id)}
                  className="rounded-lg bg-teal-500/80 px-4 py-1.5 text-sm font-bold"
                >
                  Баталгаажуулах
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          {month} сарын төлөлт (танхимын сурагчид)
        </h2>
        <div className="space-y-1.5">
          {monthRows.map((r, i) => (
            <div
              key={i}
              className="flex justify-between rounded-lg border border-white/8 px-4 py-2 text-sm"
            >
              <span>
                {r.student.firstName} {r.student.lastName} ·{" "}
                <span className="text-ink-dim">{r.classroom.name}</span>
              </span>
              <span className={r.paid ? "text-teal-300" : "font-bold text-red-300"}>
                {r.paid ? "Төлсөн" : "Төлөөгүй"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шинэ анги</h2>
          <div className="flex gap-2">
            <input
              value={newClass}
              onChange={(e) => setNewClass(e.target.value)}
              placeholder="Ангийн нэр"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
            />
            <button
              onClick={createClassroom}
              className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
            >
              Үүсгэх
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шинэ эрх (pass)</h2>
          <div className="space-y-2">
            <input
              value={newPass.name}
              onChange={(e) => setNewPass({ ...newPass, name: e.target.value })}
              placeholder="Нэр (ж: Сарын онлайн эрх)"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
            />
            <div className="flex gap-2">
              <input
                type="number"
                value={newPass.days}
                onChange={(e) =>
                  setNewPass({ ...newPass, days: parseInt(e.target.value) || 30 })
                }
                placeholder="Хоног"
                className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              />
              <input
                type="number"
                value={newPass.price}
                onChange={(e) =>
                  setNewPass({ ...newPass, price: parseInt(e.target.value) || 0 })
                }
                placeholder="Үнэ ₮"
                className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              />
              <button
                onClick={createPass}
                className="flex-1 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
              >
                Үүсгэх
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
