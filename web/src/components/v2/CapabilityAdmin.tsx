"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Check, Lock, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { Meta } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Card } from "@/components/ui/Surface";
import { byFirstName, rosterNames } from "@/lib/personName";

/* ============================================================================
 * «Эрхийн матриц» (эзэн 2026-10-22) — ЗӨВХӨН ADMIN.
 *
 * Мөр = идэвхтэй ажилтан (Админ, Багш+, Багш), нэрээр эрэмбэлсэн.
 * Багана = түвшин + нарийн эрх бүр. Админ:
 *   - Багш ↔ Багш+ түвшинг баталгаажуулах цонхоор, аудитад бичигдэж солино
 *     (PATCH /users/:id/staff-role; Админ болон өөрийгөө солихгүй);
 *   - Багш+-д цаг, цалингийн эрхийг олгож / цуцална (POST, DELETE /staff-capabilities).
 * Хуваарь ба төлбөр нь Багш+-д үүргээр байнга нээлттэй тул түгжээтэй.
 * ========================================================================== */

type StaffRole = "ADMIN" | "TEACHER_PLUS" | "TEACHER";
type CapabilityId = "schedule.manage" | "finance.manage" | "time.review" | "payroll.view";

interface StaffUser {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: StaffRole;
}
interface Grant {
  id: string;
  userId: string;
  capability: string;
  scopeKey: string;
  reason: string;
  expiresAt: string | null;
  revokedAt: string | null;
}
interface MatrixData {
  asOf: string;
  actorId: string;
  grants: Grant[];
  staff: StaffUser[];
  teacherPlusImplicit?: string[];
}

const ROLE_MN: Record<StaffRole, string> = { ADMIN: "Админ", TEACHER_PLUS: "Багш+", TEACHER: "Багш" };

const CAPS: { id: CapabilityId; label: string; full: string; hint: string }[] = [
  {
    id: "schedule.manage",
    label: "Хуваарь",
    full: "Хуваарь удирдах",
    hint: "Ангийн хуваарь, танхим, багшийн ажлын өдрийг засна",
  },
  {
    id: "finance.manage",
    label: "Төлбөр",
    full: "Төлбөр, банкны тулгалт удирдах",
    hint: "Төлбөр батлах, засах, буцаах, банкны тулгалт хийнэ",
  },
  {
    id: "time.review",
    label: "Цагийн мэдээлэл",
    full: "Ажилласан цагийн нэгдсэн мэдээлэл",
    hint: "Бүх багшийн төлөвлөсөн цагийн нэгдсэн тооцоог харна",
  },
  {
    id: "payroll.view",
    label: "Цалин үзэх",
    full: "Цалингийн мэдээлэл үзэх",
    hint: "Цалингийн мэдээллийг харна (төлөвлөсөн цагаас тооцсон, цалин бодолтын систем биш)",
  },
];

const FALLBACK_IMPLICIT = ["finance.manage", "schedule.manage"];

type Dialog =
  | { kind: "role"; user: StaffUser; to: "TEACHER" | "TEACHER_PLUS" }
  | { kind: "grant"; user: StaffUser; cap: (typeof CAPS)[number] }
  | { kind: "revoke"; user: StaffUser; cap: (typeof CAPS)[number]; grant: Grant };

function errText(e: unknown) {
  return e instanceof Error ? e.message : "Алдаа гарлаа. Дахин оролдоно уу";
}

/** «2026-10-30» (Улаанбаатар) */
function dayUB(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(new Date(iso));
}

export default function CapabilityAdmin() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api<MatrixData>("/staff-capabilities"));
      setError("");
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    let active = true;
    void api<MatrixData>("/staff-capabilities")
      .then((next) => {
        if (active) setData(next);
      })
      .catch((e) => {
        if (active) setError(errText(e));
      });
    return () => {
      active = false;
    };
  }, []);

  const rows = useMemo(() => [...(data?.staff ?? [])].sort(byFirstName), [data]);
  const names = useMemo(() => rosterNames(rows), [rows]);
  const implicit = useMemo(() => new Set(data?.teacherPlusImplicit ?? FALLBACK_IMPLICIT), [data]);

  function activeGrant(userId: string, cap: CapabilityId): Grant | undefined {
    if (!data) return undefined;
    const now = Date.parse(data.asOf);
    return data.grants.find(
      (g) =>
        g.userId === userId &&
        g.capability === cap &&
        !g.scopeKey &&
        !g.revokedAt &&
        (!g.expiresAt || Date.parse(g.expiresAt) > now),
    );
  }

  if (error && !data) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState rows={6} label="Эрхийн матриц ачаалж байна" />;

  const plusCount = rows.filter((u) => u.role === "TEACHER_PLUS").length;
  const teacherCount = rows.filter((u) => u.role === "TEACHER").length;
  const nameOf = (u: StaffUser) => names.get(u.id) ?? u.firstName;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="space-y-2">
        <Link href="/app/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">
          Удирдлага руу буцах
        </Link>
        <h1 className="cyrillic-heading text-2xl font-extrabold text-ink">Эрхийн матриц</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-ink-dim">
          Ажилтан бүрийн түвшин ба нарийн эрх. Зөвхөн админ харж, өөрчилнө
        </p>
        <p className="text-sm text-ink-dim">
          <Meta items={[`${rows.length} ажилтан`, `${plusCount} Багш+`, `${teacherCount} Багш`]} />
        </p>
      </header>

      <Card padding="none" className="overflow-hidden">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Ажилтны эрхийн хүснэгт, хэвтээ гүйлгэнэ"
          tabIndex={0}
        >
          <table className="w-full min-w-[800px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-dim">
                <th
                  scope="col"
                  className="sticky left-0 z-20 w-[200px] min-w-[200px] border-b border-r border-line bg-bg px-4 py-3 font-semibold"
                >
                  Ажилтан
                </th>
                <th scope="col" className="border-b border-line bg-bg px-3 py-3 font-semibold">
                  Түвшин
                </th>
                {CAPS.map((c) => (
                  <th
                    key={c.id}
                    scope="col"
                    title={c.full}
                    className="border-b border-line bg-bg px-3 py-3 text-center font-semibold"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const isSelf = u.id === data.actorId;
                const roleLocked = u.role === "ADMIN" || isSelf;
                return (
                  <tr key={u.id}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 w-[200px] min-w-[200px] border-b border-r border-line bg-surface px-4 py-3 text-left font-normal"
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 truncate font-semibold text-ink">{nameOf(u)}</span>
                        {isSelf && <Badge tone="neutral">Та</Badge>}
                      </span>
                      <span className="block truncate text-xs tabular-nums text-ink-dim">{u.phone ?? "Утасгүй"}</span>
                    </th>
                    <td className="border-b border-line px-3 py-2">
                      {roleLocked ? (
                        <Badge tone="brand" title="Админ болон өөрийн түвшинг энд өөрчлөхгүй">
                          <Lock aria-hidden />
                          {ROLE_MN[u.role]}
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setDialog({ kind: "role", user: u, to: u.role === "TEACHER_PLUS" ? "TEACHER" : "TEACHER_PLUS" })
                          }
                          aria-label={`${nameOf(u)}: ${ROLE_MN[u.role]}. Түвшин солих`}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink outline-none transition hover:border-brand focus-visible:ring-2 focus-visible:ring-brand-bright/60"
                        >
                          {ROLE_MN[u.role]}
                          <ArrowLeftRight className="size-4 text-ink-dim" aria-hidden />
                        </button>
                      )}
                    </td>
                    {CAPS.map((cap) => (
                      <td key={cap.id} className="border-b border-line px-3 py-2 text-center">
                        <CapabilityCell
                          label={`${nameOf(u)}: ${cap.full}`}
                          fixed={u.role === "ADMIN" || (u.role === "TEACHER_PLUS" && implicit.has(cap.id))}
                          grant={u.role === "TEACHER_PLUS" ? activeGrant(u.id, cap.id) : undefined}
                          grantable={u.role === "TEACHER_PLUS" && !implicit.has(cap.id)}
                          onGrant={() => setDialog({ kind: "grant", user: u, cap })}
                          onRevoke={(grant) => setDialog({ kind: "revoke", user: u, cap, grant })}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="p-5 text-sm text-ink-dim">Идэвхтэй ажилтан алга</p>}
      </Card>

      <Legend />

      <ActionDrawer
        dialog={dialog}
        nameOf={nameOf}
        onClose={() => setDialog(null)}
        onDone={(message) => {
          setDialog(null);
          toast.success(message);
          void load();
        }}
      />
    </div>
  );
}

function CapabilityCell({
  label,
  fixed,
  grant,
  grantable,
  onGrant,
  onRevoke,
}: {
  label: string;
  /** Үүргээр байнга эзэмшинэ — түгжээтэй */
  fixed: boolean;
  grant?: Grant;
  grantable: boolean;
  onGrant: () => void;
  onRevoke: (grant: Grant) => void;
}) {
  if (fixed)
    return (
      <span
        role="img"
        aria-label={`${label}: үүргээр байнга эзэмшинэ, түгжээтэй`}
        title="Үүргээр байнга эзэмшинэ"
        className="inline-flex size-11 items-center justify-center gap-0.5 rounded-xl bg-ink/5 text-ink-dim"
      >
        <Check className="size-4" aria-hidden />
        <Lock className="size-3" aria-hidden />
      </span>
    );
  if (!grantable)
    return (
      <span
        role="img"
        aria-label={`${label}: Багш+ болсны дараа олгоно`}
        title="Багш+ болсны дараа олгоно"
        className="inline-flex size-11 items-center justify-center text-ink-dim"
      >
        <Minus className="size-4" aria-hidden />
      </span>
    );
  if (grant)
    return (
      <span className="inline-flex flex-col items-center gap-0.5">
        <button
          type="button"
          role="switch"
          aria-checked="true"
          aria-label={`${label}: олгосон. Цуцлах`}
          onClick={() => onRevoke(grant)}
          className="inline-flex size-11 items-center justify-center rounded-xl bg-brand-bright text-on-brand outline-none transition hover:brightness-105 focus-visible:ring-2 focus-visible:ring-brand-bright/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <Check className="size-4" aria-hidden />
        </button>
        {grant.expiresAt && <span className="text-xs tabular-nums text-ink-dim">{dayUB(grant.expiresAt)} хүртэл</span>}
      </span>
    );
  return (
    <button
      type="button"
      role="switch"
      aria-checked="false"
      aria-label={`${label}: олгоогүй. Олгох`}
      onClick={onGrant}
      className="inline-flex size-11 items-center justify-center rounded-xl border border-dashed border-line text-ink-dim outline-none transition hover:border-brand hover:text-brand focus-visible:ring-2 focus-visible:ring-brand-bright/60"
    >
      <Plus className="size-4" aria-hidden />
    </button>
  );
}

function Legend() {
  return (
    <section aria-labelledby="matrix-legend" className="chunky space-y-3 p-4 sm:p-5">
      <h2 id="matrix-legend" className="text-sm font-bold text-ink">
        Тайлбар
      </h2>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {CAPS.map((c) => (
          <div key={c.id}>
            <dt className="font-semibold text-ink">{c.full}</dt>
            <dd className="text-ink-dim">{c.hint}</dd>
          </div>
        ))}
      </dl>
      <ul className="space-y-1.5 border-t border-line pt-3 text-sm text-ink-dim">
        <li className="flex items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md bg-ink/5 px-1.5 py-0.5">
            <Check className="size-3.5" aria-hidden />
            <Lock className="size-3" aria-hidden />
          </span>
          Түгжээтэй: Админ, Багш+-д үүргээр байнга нээлттэй, өөрчилдөггүй
        </li>
        <li className="flex items-center gap-2">
          <Plus className="size-4 shrink-0" aria-hidden />
          Олгоогүй: дарж Багш+-д олгоно. Олгосон бол дарж цуцална
        </li>
        <li className="flex items-center gap-2">
          <Minus className="size-4 shrink-0" aria-hidden />
          Багшид нарийн эрх олгогдохгүй, Багш+ болгосны дараа олгоно
        </li>
        <li>
          Сургалтаас хасах (сурагч архивлах) нь бүх Багш+-д нээлттэй, тусгай эрх шаардахгүй
        </li>
      </ul>
    </section>
  );
}

function ActionDrawer({
  dialog,
  nameOf,
  onClose,
  onDone,
}: {
  dialog: Dialog | null;
  nameOf: (u: StaffUser) => string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  return (
    <Drawer open={dialog !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto w-full max-w-md" aria-describedby={undefined}>
        {dialog && (
          <ActionBody
            key={`${dialog.kind}:${dialog.user.id}:${dialog.kind === "role" ? dialog.to : dialog.cap.id}`}
            dialog={dialog}
            nameOf={nameOf}
            onClose={onClose}
            onDone={onDone}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

const field =
  "mt-2 w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-base font-normal text-ink outline-none focus-visible:border-brand";

function ActionBody({
  dialog,
  nameOf,
  onClose,
  onDone,
}: {
  dialog: Dialog;
  nameOf: (u: StaffUser) => string;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tomorrow] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const name = nameOf(dialog.user);
  const reasonRequired = dialog.kind !== "role";
  const reasonOk = !reasonRequired || reason.trim().length >= 3;
  const promote = dialog.kind === "role" && dialog.to === "TEACHER_PLUS";
  const danger = dialog.kind === "revoke" || (dialog.kind === "role" && !promote);

  const title =
    dialog.kind === "role"
      ? promote
        ? `${name}-ийг Багш+ болгох уу`
        : `${name}-ийг Багш болгох уу`
      : dialog.kind === "grant"
        ? `${name}: ${dialog.cap.full}`
        : `${name}: эрхийг цуцлах уу`;

  const confirmLabel =
    dialog.kind === "role" ? (promote ? "Багш+ болгох" : "Багш болгох") : dialog.kind === "grant" ? "Эрх олгох" : "Эрх цуцлах";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !reasonOk) return;
    setBusy(true);
    setError("");
    try {
      if (dialog.kind === "role") {
        await api(`/users/${encodeURIComponent(dialog.user.id)}/staff-role`, {
          method: "PATCH",
          body: { role: dialog.to, ...(reason.trim() ? { reason: reason.trim() } : {}) },
        });
        onDone(`${name} одоо ${dialog.to === "TEACHER_PLUS" ? "Багш+" : "Багш"} боллоо. Аудитад хадгалагдлаа`);
      } else if (dialog.kind === "grant") {
        await api("/staff-capabilities", {
          method: "POST",
          body: {
            userId: dialog.user.id,
            capability: dialog.cap.id,
            scopeKey: "",
            reason: reason.trim(),
            ...(expires ? { expiresAt: `${expires}T23:59:00+08:00` } : {}),
          },
        });
        onDone("Эрх олголоо. Аудитад хадгалагдлаа");
      } else {
        await api(`/staff-capabilities/${encodeURIComponent(dialog.grant.id)}`, {
          method: "DELETE",
          body: { reason: reason.trim() },
        });
        onDone("Эрх цуцлагдлаа. Түүх хадгалагдсан");
      }
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-col gap-4 overflow-y-auto px-5 pb-5 pt-3">
      <div>
        <DrawerTitle className="text-lg font-bold text-ink">{title}</DrawerTitle>
        <p className="mt-1 text-sm leading-relaxed text-ink-dim">
          {dialog.kind === "role" &&
            (promote
              ? "Багш+ болгоход төлбөр, хуваарь засах эрх үүргээр нээгдэнэ. Цаг, цалингийн эрхийг матрицаас тусад нь олгоно"
              : "Багш болгоход Багш+-ийн нэмэлт эрх хаагдаж, олгосон нарийн эрх бүгд цуцлагдана")}
          {dialog.kind === "grant" && dialog.cap.hint}
          {dialog.kind === "revoke" && `${dialog.cap.full} эрх хаагдана. Өмнөх түүх хадгалагдана`}
        </p>
      </div>

      {dialog.kind === "role" && (
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Badge tone="neutral">{ROLE_MN[dialog.user.role]}</Badge>
          <ArrowLeftRight className="size-4 text-ink-dim" aria-hidden />
          <Badge tone="brand">{ROLE_MN[dialog.to]}</Badge>
        </div>
      )}

      <label className="block text-sm font-semibold text-ink">
        {reasonRequired ? "Шалтгаан" : "Шалтгаан (заавал биш)"}
        <textarea
          rows={2}
          maxLength={500}
          required={reasonRequired}
          minLength={reasonRequired ? 3 : undefined}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={field}
        />
      </label>

      {dialog.kind === "grant" && (
        <label className="block text-sm font-semibold text-ink">
          Дуусах огноо (заавал биш)
          <input type="date" min={tomorrow} value={expires} onChange={(e) => setExpires(e.target.value)} className={field} />
          <span className="mt-1 block text-xs font-normal text-ink-dim">
            Хоосон бол цуцлах хүртэл хүчинтэй. Тодорхой хугацаа өгөхийг зөвлөж байна
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Болих
        </Button>
        <Button type="submit" variant={danger ? "danger" : "default"} disabled={busy || !reasonOk}>
          {busy ? "Хадгалж байна…" : confirmLabel}
        </Button>
      </div>
    </form>
  );
}
