"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { useState } from "react";
import RequireRole from "@/components/nav/RequireRole";
import { getPageTitle } from "@/components/nav/nav-data";
import { useSection } from "@/components/students/progress/useSection";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";

/* Хэрэглээний бүртгэлийн нэгтгэл (эзэн 2026-11-04) — эрх тус бүрээр хамгийн их
 * нээгддэг хуудас, дарагддаг товч, утас/компьютер, өдрийн цаг. Зөвхөн Админ. */

type RoleUsage = {
  role: string;
  users: number;
  events: number;
  devices: Record<string, number>;
  pages: { path: string; views: number; users: number }[];
  clicks: { path: string; target: string; clicks: number; users: number }[];
  hourly: number[];
};
type UsageSummary = { days: number; roles: RoleUsage[] };

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};
const RANGES = [
  { days: 1, label: "Өнөөдөр" },
  { days: 7, label: "7 хоног" },
  { days: 30, label: "30 хоног" },
];

// «/app/admin/students/:id» → «Сурагчид — дэлгэрэнгүй»: цэсэнд байгаа хамгийн ойрын эцэг хуудсаар
function pageName(role: string, path: string): string {
  const direct = getPageTitle(role, path);
  if (direct) return direct;
  const parts = path.split("/");
  for (let i = parts.length - 1; i > 2; i--) {
    const parent = getPageTitle(role, parts.slice(0, i).join("/"));
    if (parent) return `${parent} — дэлгэрэнгүй`;
  }
  return path;
}

function targetName(role: string, target: string): string {
  const [kind, ...rest] = target.split(":");
  const value = rest.join(":");
  if (kind === "link") return `Холбоос → ${pageName(role, value)}`;
  if (kind === "icon") return `«${value}» дүрстэй товч`;
  if (value.startsWith("tab:")) return `Доод цэс → ${value.slice(4)}`;
  return value;
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-line">
      <span className="block h-full rounded-full bg-brand-bright" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </span>
  );
}

function RoleCard({ data }: { data: RoleUsage }) {
  const totalDev = Object.values(data.devices).reduce((a, b) => a + b, 0) || 1;
  const maxPage = data.pages[0]?.views ?? 0;
  const maxClick = data.clicks[0]?.clicks ?? 0;
  const maxHour = Math.max(...data.hourly, 1);
  const devices = [
    { key: "mobile", label: "Утас", Icon: Smartphone },
    { key: "tablet", label: "Таблет", Icon: Tablet },
    { key: "desktop", label: "Компьютер", Icon: Monitor },
  ];
  return (
    <section className="chunky flex flex-col gap-4 p-4 md:p-6">
      <header>
        <h2 className="text-base font-bold text-ink">{ROLE_LABEL[data.role] ?? data.role}</h2>
        <Meta
          className="text-xs text-ink-dim"
          items={[`${data.users} хүн`, `${data.events} үйлдэл`]}
        />
      </header>

      <div className="flex flex-wrap gap-2">
        {devices.map(({ key, label, Icon }) => (
          <span key={key} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink">
            <Icon className="size-3.5 text-ink-dim" aria-hidden />
            {label} {Math.round(((data.devices[key] ?? 0) / totalDev) * 100)}%
          </span>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-soft">Их нээгддэг хуудас</h3>
          <ol className="flex flex-col gap-2">
            {data.pages.map((p) => (
              <li key={p.path} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-ink">{pageName(data.role, p.path)}</span>
                  <span className="shrink-0 tabular-nums text-xs text-ink-dim">{p.views} удаа, {p.users} хүн</span>
                </div>
                <Bar value={p.views} max={maxPage} />
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-soft">Их дарагддаг товч</h3>
          {data.clicks.length === 0 && <p className="text-sm text-ink-dim">Бүртгэл алга</p>}
          <ol className="flex flex-col gap-2">
            {data.clicks.map((c) => (
              <li key={`${c.path}|${c.target}`} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{targetName(data.role, c.target)}</span>
                    <span className="block truncate text-xs text-ink-dim">{pageName(data.role, c.path)} хуудсанд</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-xs text-ink-dim">{c.clicks} удаа, {c.users} хүн</span>
                </div>
                <Bar value={c.clicks} max={maxClick} />
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand-soft">Өдрийн аль цагт</h3>
        <div className="flex h-16 items-end gap-0.5" aria-label="Цаг тутмын үйлдлийн тоо">
          {data.hourly.map((v, h) => (
            <span
              key={h}
              title={`${h}:00 — ${v}`}
              className="flex-1 rounded-t bg-brand-bright/70"
              style={{ height: `${Math.max((v / maxHour) * 100, v ? 4 : 0)}%` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-ink-dim">
          <span>0</span><span>6</span><span>12</span><span>18</span><span>23</span>
        </div>
      </div>
    </section>
  );
}

export default function UsageDashboard() {
  const [days, setDays] = useState(7);
  const query = useSection<UsageSummary>(`/usage/summary?days=${days}`);

  return (
    <RequireRole allow={["ADMIN"]}>
      <div className="flex flex-col gap-5">
        <div className="chunky p-4 md:p-6">
          <h1 className="text-lg font-bold text-ink">Хэрэглээ</h1>
          <p className="mb-3 mt-0.5 text-sm text-ink-dim">
            Хэн аль хуудсыг нээж, аль товчийг дарж байна. Нэр, хариу, оноо бүртгэгдэхгүй
          </p>
          <div className="flex gap-2" role="group" aria-label="Хугацаа">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                aria-pressed={days === r.days}
                className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${
                  days === r.days ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        {query.status === "loading" && <LoadingState rows={4} />}
        {query.error && <ErrorState message={query.error} onRetry={query.reload} />}
        {query.data && query.data.roles.length === 0 && (
          <EmptyState title="Одоохондоо бүртгэл алга" hint="Хүмүүс аппаа ашиглахад энд гарч ирнэ" />
        )}
        {query.data?.roles.map((r) => <RoleCard key={r.role} data={r} />)}
      </div>
    </RequireRole>
  );
}
