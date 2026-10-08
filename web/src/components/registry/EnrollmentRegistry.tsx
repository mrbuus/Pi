"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRightLeft,
  Clock3,
  GraduationCap,
  History,
  Search,
  UsersRound,
} from "lucide-react";
import RequireRole from "@/components/nav/RequireRole";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Card, PageHeader, SectionHeader } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";

interface Classroom {
  id: string;
  name: string;
  grade?: number | null;
  type: string;
  _count?: { enrollments: number };
}

interface StudentProfile {
  grade?: number | null;
  branch?: string | null;
  school?: string | null;
}

interface RegistryStudent {
  id: string;
  firstName: string;
  lastName: string;
  studentCode?: string | null;
  studentProfile?: StudentProfile | null;
}

interface RegistryEntry {
  id: string;
  joinedAt: string;
  leftAt?: string | null;
  movedById?: string | null;
  student: RegistryStudent;
  classroom: Pick<Classroom, "id" | "name" | "grade" | "type">;
}

interface UnassignedStudent extends RegistryStudent {
  waitingSince?: string;
}

interface RosterRow {
  student: RegistryStudent;
  classroom: Pick<Classroom, "id" | "name" | "grade" | "type"> | null;
  joinedAt?: string;
  source: "enrollment" | "unassigned";
}

const ALL = "ALL";
const UNASSIGNED = "UNASSIGNED";

function fullName(student: RegistryStudent) {
  return `${student.lastName} ${student.firstName}`.trim();
}

function displayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Мэдээлэл авч чадсангүй";
}

function compareClassroom(a: Classroom, b: Classroom) {
  return (a.grade ?? 99) - (b.grade ?? 99) || a.name.localeCompare(b.name, "mn");
}

export default function EnrollmentRegistry() {
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [entries, setEntries] = useState<RegistryEntry[] | null>(null);
  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClassroom, setSelectedClassroom] = useState(ALL);
  const [search, setSearch] = useState("");
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);
  const [transferRow, setTransferRow] = useState<RosterRow | null>(null);
  const [targetClassroomId, setTargetClassroomId] = useState("");
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rooms, registry, waiting] = await Promise.all([
        api<Classroom[]>("/classrooms"),
        api<RegistryEntry[]>("/classrooms/registry"),
        api<UnassignedStudent[]>("/classrooms/unassigned-students"),
      ]);
      const sortedRooms = [...rooms].sort(compareClassroom);
      setClassrooms(sortedRooms);
      setEntries(registry);
      setUnassigned(waiting);
      setSelectedClassroom((previous) =>
        previous === ALL && sortedRooms.length > 0 ? sortedRooms[0].id : previous,
      );
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // React-ийн эхний paint-ыг гаргасны дараа ачаална. Ингэснээр skeleton
    // шууд харагдаж, effect дотор синхрон state update хийхгүй.
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeEntries = useMemo(
    () => (entries ?? []).filter((entry) => !entry.leftAt),
    [entries],
  );

  const histories = useMemo(() => {
    const map = new Map<string, RegistryEntry[]>();
    for (const entry of entries ?? []) {
      const rows = map.get(entry.student.id) ?? [];
      rows.push(entry);
      map.set(entry.student.id, rows);
    }
    for (const rows of map.values()) {
      rows.sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
    }
    return map;
  }, [entries]);

  const activeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of activeEntries) {
      counts.set(entry.classroom.id, (counts.get(entry.classroom.id) ?? 0) + 1);
    }
    return counts;
  }, [activeEntries]);

  const selectedRoom = classrooms?.find((room) => room.id === selectedClassroom) ?? null;
  const selectedTitle =
    selectedClassroom === ALL
      ? "Бүх идэвхтэй бүртгэл"
      : selectedClassroom === UNASSIGNED
        ? "Ангид хуваарилагдаагүй"
        : selectedRoom?.name ?? "Анги сонгоно уу";

  const visibleRows = useMemo(() => {
    const activeRows: RosterRow[] = activeEntries.map((entry) => ({
      student: entry.student,
      classroom: entry.classroom,
      joinedAt: entry.joinedAt,
      source: "enrollment",
    }));
    const waitingRows: RosterRow[] = unassigned.map((student) => ({
      student,
      classroom: null,
      joinedAt: student.waitingSince,
      source: "unassigned",
    }));
    const source =
      selectedClassroom === ALL
        ? [...activeRows, ...waitingRows]
        : selectedClassroom === UNASSIGNED
          ? waitingRows
          : activeRows.filter((row) => row.classroom?.id === selectedClassroom);
    const term = search.trim().toLocaleLowerCase("mn");
    return source
      .filter((row) => {
        if (!term) return true;
        return [
          row.student.studentCode,
          row.student.firstName,
          row.student.lastName,
          row.student.studentProfile?.school,
          row.classroom?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("mn")
          .includes(term);
      })
      .sort((a, b) => fullName(a.student).localeCompare(fullName(b.student), "mn"));
  }, [activeEntries, search, selectedClassroom, unassigned]);

  const historyRows = historyStudentId ? histories.get(historyStudentId) ?? [] : [];
  function openTransfer(row: RosterRow) {
    setTransferRow(row);
    setTargetClassroomId("");
    setMessage(null);
  }

  async function moveStudent() {
    if (!transferRow || !targetClassroomId) return;
    setMoving(true);
    setMessage(null);
    try {
      await api(`/classrooms/${targetClassroomId}/enroll`, {
        method: "POST",
        body: { studentId: transferRow.student.id },
      });
      const destination = classrooms?.find((room) => room.id === targetClassroomId);
      setMessage({
        kind: "success",
        text: `${fullName(transferRow.student)} ${destination?.name ?? "сонгосон анги"} руу шилжлээ`,
      });
      setTransferRow(null);
      await load();
    } catch (moveError) {
      setMessage({ kind: "error", text: errorMessage(moveError) });
    } finally {
      setMoving(false);
    }
  }

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>
      <div className="space-y-5">
        <PageHeader
          title="Бүртгэл"
          description="Ангиа сонгоод бүрэлдэхүүнийг нь шууд харна. Сурагчийг зөөхөд өмнөх ангийн бичилт түүхэнд хадгалагдана."
        />

        {loading && <LoadingState rows={5} label="Бүртгэл ачаалж байна" />}
        {error && <ErrorState message={error} onRetry={() => void load()} />}

        {!loading && !error && classrooms && entries && (
          <>
            <section className="grid gap-3 sm:grid-cols-3" aria-label="Бүртгэлийн товч">
              <Stat icon={GraduationCap} label="Идэвхтэй анги" value={String(classrooms.length)} />
              <Stat icon={UsersRound} label="Идэвхтэй бүртгэл" value={String(activeEntries.length)} />
              <Stat icon={Clock3} label="Ангигүй сурагч" value={String(unassigned.length)} />
            </section>

            {message && (
              <div
                role="status"
                className={`rounded-xl border px-4 py-3 text-sm ${
                  message.kind === "success"
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-error/30 bg-error/10 text-error"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[17rem_minmax(0,1fr)]">
              <Card padding="tight" className="h-fit xl:sticky xl:top-5">
                <SectionHeader icon={GraduationCap} title="Ангиуд" />
                <div className="max-h-[62vh] space-y-1 overflow-y-auto pr-1">
                  <RegistryFilterButton
                    active={selectedClassroom === ALL}
                    label="Бүх анги"
                    count={activeEntries.length + unassigned.length}
                    onClick={() => setSelectedClassroom(ALL)}
                  />
                  <RegistryFilterButton
                    active={selectedClassroom === UNASSIGNED}
                    label="Хуваарилагдаагүй"
                    count={unassigned.length}
                    onClick={() => setSelectedClassroom(UNASSIGNED)}
                  />
                  <div className="my-3 border-t border-line" />
                  {classrooms.map((room) => (
                    <RegistryFilterButton
                      key={room.id}
                      active={selectedClassroom === room.id}
                      label={room.name}
                      count={activeCounts.get(room.id) ?? 0}
                      color={getClassroomColor(room.id)}
                      onClick={() => setSelectedClassroom(room.id)}
                    />
                  ))}
                </div>
              </Card>

              <Card padding="none" className="min-w-0 overflow-hidden">
                <div className="border-b border-line p-5 md:p-6">
                  <SectionHeader
                    icon={UsersRound}
                    title={selectedTitle}
                    hint={<span className="text-sm font-normal text-ink-dim">{visibleRows.length} сурагч</span>}
                  />
                  <label className="relative block max-w-md">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
                      aria-hidden
                    />
                    <span className="sr-only">Нэр, код, сургууль эсвэл ангиар хайх</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Нэр, код, сургууль эсвэл ангиар хайх"
                      className="w-full rounded-lg border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink"
                    />
                  </label>
                </div>

                {visibleRows.length === 0 ? (
                  <div className="p-5 md:p-6">
                    <EmptyState
                      icon={UsersRound}
                      title="Энд сурагч алга байна"
                      hint={search ? "Хайлтын үгээ өөрчилж үзнэ үү." : "Өөр анги сонгох эсвэл ангигүй сурагчдыг шалгана уу."}
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="bg-panel text-xs text-ink-dim">
                        <tr className="border-b border-line">
                          <th scope="col" className="px-5 py-3 font-semibold">Сурагч</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Анги</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Элссэн</th>
                          <th scope="col" className="px-4 py-3 font-semibold">Түүх</th>
                          <th scope="col" className="px-5 py-3 text-right font-semibold">Үйлдэл</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((row) => {
                          const isTransferOpen = transferRow?.student.id === row.student.id;
                          const isHistoryOpen = historyStudentId === row.student.id;
                          return (
                            <RosterRows
                              key={row.student.id}
                              row={row}
                              classrooms={classrooms}
                              historyCount={histories.get(row.student.id)?.length ?? 0}
                              historyOpen={isHistoryOpen}
                              historyRows={isHistoryOpen ? historyRows : []}
                              transferOpen={isTransferOpen}
                              targetClassroomId={targetClassroomId}
                              moving={moving}
                              onHistory={() =>
                                setHistoryStudentId((current) => (current === row.student.id ? null : row.student.id))
                              }
                              onTransfer={() => openTransfer(row)}
                              onCancelTransfer={() => setTransferRow(null)}
                              onTargetChange={setTargetClassroomId}
                              onMove={() => void moveStudent()}
                            />
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </RequireRole>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card padding="tight" className="flex items-center gap-3">
      <div className="rounded-lg bg-brand/10 p-2 text-brand-soft">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-ink">{value}</p>
        <p className="text-xs text-ink-dim">{label}</p>
      </div>
    </Card>
  );
}

function RegistryFilterButton({
  active,
  label,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      style={color ? ({ "--cls": color } as CSSProperties) : undefined}
      className={`flex w-full items-center justify-between gap-3 rounded-r-lg px-3 py-2 text-left text-sm transition ${
        color ? "class-row class-row-interactive" : "row-interactive"
      } ${active ? "bg-brand/10 text-ink" : "text-ink-dim"}`}
    >
      <span className="min-w-0 truncate font-medium">{label}</span>
      <span className="shrink-0 text-xs tabular-nums text-ink-dim">{count}</span>
    </button>
  );
}

function RosterRows({
  row,
  classrooms,
  historyCount,
  historyOpen,
  historyRows,
  transferOpen,
  targetClassroomId,
  moving,
  onHistory,
  onTransfer,
  onCancelTransfer,
  onTargetChange,
  onMove,
}: {
  row: RosterRow;
  classrooms: Classroom[];
  historyCount: number;
  historyOpen: boolean;
  historyRows: RegistryEntry[];
  transferOpen: boolean;
  targetClassroomId: string;
  moving: boolean;
  onHistory: () => void;
  onTransfer: () => void;
  onCancelTransfer: () => void;
  onTargetChange: (value: string) => void;
  onMove: () => void;
}) {
  const currentClassroomId = row.classroom?.id;
  const possibleClassrooms = classrooms.filter((room) => room.id !== currentClassroomId);
  return (
    <>
      <tr className="border-b border-line last:border-0">
        <td className="px-5 py-3">
          <p className="font-semibold text-ink">{fullName(row.student)}</p>
          <Meta
            className="mt-0.5 text-xs text-ink-dim"
            items={[
              row.student.studentCode ?? null,
              row.student.studentProfile?.school ?? null,
              row.student.studentProfile?.grade ? `${row.student.studentProfile.grade}-р анги` : null,
            ]}
          />
        </td>
        <td className="px-4 py-3 text-ink-dim">{row.classroom?.name ?? "Хуваарилагдаагүй"}</td>
        <td className="px-4 py-3 text-ink-dim">{displayDate(row.joinedAt)}</td>
        <td className="px-4 py-3">
          {historyCount > 1 ? (
            <button type="button" onClick={onHistory} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:text-brand-soft">
              <History className="h-4 w-4" aria-hidden />
              {historyCount} удаа
            </button>
          ) : (
            <span className="text-ink-dim">—</span>
          )}
        </td>
        <td className="px-5 py-3 text-right">
          <button
            type="button"
            onClick={onTransfer}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition hover:border-brand"
          >
            <ArrowRightLeft className="h-4 w-4" aria-hidden />
            {row.classroom ? "Шилжүүлэх" : "Анги заах"}
          </button>
        </td>
      </tr>

      {historyOpen && (
        <tr className="border-b border-line bg-bg/60">
          <td colSpan={5} className="px-5 py-4">
            <p className="mb-3 font-semibold text-ink">{fullName(row.student)} — ангийн түүх</p>
            <ol className="space-y-3 border-l-2 border-line pl-4">
              {historyRows.map((entry) => (
                <li key={entry.id} className="relative text-sm">
                  <span className="absolute -left-[1.34rem] top-1.5 h-2 w-2 rounded-full bg-brand-bright" aria-hidden />
                  <p className="font-semibold text-ink">{entry.classroom.name}</p>
                  <p className="text-ink-dim">
                    <Meta items={[`Орсон: ${displayDate(entry.joinedAt)}`, entry.leftAt ? `Гарсан: ${displayDate(entry.leftAt)}` : "Одоо энэ ангид байна"]} />
                  </p>
                </li>
              ))}
            </ol>
          </td>
        </tr>
      )}

      {transferOpen && (
        <tr className="border-b border-line bg-brand/5">
          <td colSpan={5} className="px-5 py-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[14rem] flex-1">
                <label htmlFor={`move-${row.student.id}`} className="block text-xs font-semibold text-ink-dim">
                  Очих анги
                </label>
                <select
                  id={`move-${row.student.id}`}
                  value={targetClassroomId}
                  onChange={(event) => onTargetChange(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                  disabled={moving}
                >
                  <option value="">Анги сонгоно уу</option>
                  {possibleClassrooms.map((room) => (
                    <option key={room.id} value={room.id}>{room.name}</option>
                  ))}
                </select>
              </div>
              <p className="max-w-md text-xs text-ink-dim">
                Өмнөх ангийн бүртгэл хаагдаж, шилжилт энэ сурагчийн түүхэнд үлдэнэ.
              </p>
              <button
                type="button"
                onClick={onCancelTransfer}
                disabled={moving}
                className="min-h-10 rounded-lg border border-line px-4 text-sm font-semibold text-ink-dim transition hover:text-ink disabled:opacity-50"
              >
                Цуцлах
              </button>
              <button
                type="button"
                onClick={onMove}
                disabled={moving || !targetClassroomId}
                className="min-h-10 rounded-lg bg-brand-bright px-4 text-sm font-semibold text-on-brand transition hover:opacity-90 disabled:opacity-50"
              >
                {moving ? "Шилжүүлж байна…" : "Шилжүүлэх"}
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
