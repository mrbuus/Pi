"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  audience: string;
  classroomTargets?: { classroom: { id: string; name: string } }[];
  createdAt: string;
}

interface Classroom {
  id: string;
  name: string;
  type: string;
  grade?: number | null;
  _count: { enrollments: number };
}

const AUDIENCES = [
  { value: "ALL_STUDENTS", label: "Бүх сурагч" },
  { value: "ALL_CLASSROOM", label: "Танхимын бүх анги" },
  { value: "ALL_ONLINE", label: "Онлайн сурагчид" },
  { value: "SELECTED_CLASSROOMS", label: "Сонгосон ангиуд" },
];

function audienceLabel(a: Announcement) {
  if (a.audience === "ALL_STUDENTS") return "Бүх сурагч";
  if (a.audience === "ALL_ONLINE") return "Онлайн";
  if (a.audience === "SELECTED_CLASSROOMS") {
    const names = a.classroomTargets?.map((t) => t.classroom.name) ?? [];
    return names.length ? names.join(", ") : "Сонгосон анги";
  }
  if (a.audience === "ONE_CLASSROOM") return "Нэг анги";
  return "Танхим";
}

// Багш/админ төвийн самбарт зар тавих + удирдах
export default function AnnouncementCompose() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("ALL_CLASSROOM");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [list, setList] = useState<Announcement[]>([]);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<Announcement[]>("/announcements/manage").then(setList).catch(() => {});
  }, []);
  useEffect(() => {
    load();
    api<Classroom[]>("/classrooms").then(setClassrooms).catch(() => {});
  }, [load]);

  function toggleClassroom(id: string) {
    setSelectedClassrooms((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
  }

  async function post() {
    if (!title.trim() || !body.trim()) return;
    if (audience === "SELECTED_CLASSROOMS" && selectedClassrooms.length === 0) {
      setMsg("Анги сонгоно уу");
      return;
    }
    setMsg("");
    try {
      await api("/announcements", {
        method: "POST",
        body: {
          title,
          body,
          audience,
          pinned,
          ...(audience === "SELECTED_CLASSROOMS"
            ? { classroomIds: selectedClassrooms }
            : {}),
        },
      });
      setTitle("");
      setBody("");
      setAudience("ALL_CLASSROOM");
      setSelectedClassrooms([]);
      setPinned(false);
      setMsg("✓ Зар тавигдлаа");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  async function remove(id: string) {
    await api(`/announcements/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Төвийн самбар — зар тавих</h2>
      <p className="mb-4 text-sm text-ink-dim">
        Бүх сурагч, онлайн сурагчид эсвэл сонгосон ангиудад тусад нь зарлана.
      </p>
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Гарчиг"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Зарын агуулга…"
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
        />
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm outline-none focus:border-brand-bright"
        >
          {AUDIENCES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        {audience === "SELECTED_CLASSROOMS" && (
          <div className="grid gap-2 sm:grid-cols-2">
            {classrooms.map((c) => {
              const selected = selectedClassrooms.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleClassroom(c.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    selected
                      ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                      : "border-white/8 text-ink-dim hover:border-white/25"
                  }`}
                >
                  <span className="block font-semibold">{c.name}</span>
                  <span>
                    {c.type === "ONLINE" ? "Онлайн" : "Танхим"}
                    {c.grade ? ` · ${c.grade}-р анги` : ""} ·{" "}
                    {c._count.enrollments} сурагч
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-ink-dim">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            📌 Дээр бэхлэх
          </label>
          <div className="flex items-center gap-3">
            {msg && <span className="text-xs text-teal-300">{msg}</span>}
            <button
              onClick={post}
              className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
            >
              Зарлах
            </button>
          </div>
        </div>
      </div>

      {list.length > 0 && (
        <div className="mt-4 space-y-1.5 border-t border-white/8 pt-4">
          {list.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 rounded-lg border border-white/8 px-3 py-2 text-sm"
            >
              {a.pinned && <span>📌</span>}
              <span className="font-medium">{a.title}</span>
              <span className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-[11px] text-ink-dim">
                {audienceLabel(a)}
              </span>
              <span className="truncate text-ink-dim">— {a.body}</span>
              <button
                onClick={() => remove(a.id)}
                className="ml-auto shrink-0 text-xs text-red-300 hover:underline"
              >
                Устгах
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
