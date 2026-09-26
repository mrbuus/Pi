'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Archive, ArrowLeft, ArrowRightLeft, Check, Pencil, Search, UserMinus, UserPlus, UsersRound, X } from 'lucide-react';
import { api, getRole } from '@/lib/api';
import RequireRole from '@/components/nav/RequireRole';
import { Meta } from '@/components/ui/Meta';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { Dialog } from './ClassroomsClient';

type ClassroomType = 'IN_PERSON' | 'ONLINE';
interface Teacher { id: string; firstName: string; lastName: string; }
interface Student { id: string; firstName: string; lastName: string; studentCode: string | null; joinedAt: string; }
interface Classroom { id: string; name: string; type: ClassroomType; grade: number | null; teacherId: string | null; teacher: Teacher | null; }
interface ClassroomDetail { classroom: Classroom; students: Student[]; permissions: { canManageStudents: boolean }; }
interface ClassroomListItem { id: string; name: string; type: ClassroomType; grade: number | null; archived?: boolean; }
interface SearchStudent { id: string; firstName: string; lastName: string; studentCode: string | null; username?: string | null; }
interface UnassignedStudent { id: string; firstName: string; lastName: string; waitingSince: string; studentProfile?: { grade?: number | null } | null; }
interface TeacherOption { id: string; firstName: string; lastName: string; role: string; }
type Intent = { kind: 'remove'; student: Student } | { kind: 'transfer'; student: Student } | { kind: 'archive' } | { kind: 'add' } | { kind: 'edit' };

function messageFor(error: unknown) { return error instanceof Error ? error.message : 'Үйлдэл амжилтгүй боллоо.'; }

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Огноо тодорхойгүй';
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}.${part('month')}.${part('day')}`;
}

function todayCodeUB() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ulaanbaatar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}${part('month')}${part('day')}`;
}

export default function ClassroomDetailClient({ classroomId }: { classroomId: string }) {
  const router = useRouter();
  const role = getRole();
  const isAdmin = role === 'ADMIN';
  const [detail, setDetail] = useState<ClassroomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<Intent | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const [form, setForm] = useState({ name: '', type: 'IN_PERSON' as ClassroomType, grade: '', teacherId: '' });
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teachersError, setTeachersError] = useState('');

  const [targetClasses, setTargetClasses] = useState<ClassroomListItem[]>([]);
  const [targetClassesLoading, setTargetClassesLoading] = useState(false);
  const [targetClassId, setTargetClassId] = useState('');
  const [transferError, setTransferError] = useState('');

  const [unassigned, setUnassigned] = useState<UnassignedStudent[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [unassignedError, setUnassignedError] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<SearchStudent[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState('');
  const [selectedToAdd, setSelectedToAdd] = useState<SearchStudent | null>(null);
  const searchSequence = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api<ClassroomDetail>(`/classrooms/${encodeURIComponent(classroomId)}`);
      setDetail(response);
      setForm({
        name: response.classroom.name,
        type: response.classroom.type,
        grade: response.classroom.grade == null ? '' : String(response.classroom.grade),
        teacherId: response.classroom.teacherId ?? '',
      });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeClassIds = useMemo(() => new Set(unassigned.map((student) => student.id)), [unassigned]);
  const visibleSearchResults = useMemo(() => studentResults.filter((student) => activeClassIds.has(student.id)), [studentResults, activeClassIds]);
  const addCandidates = useMemo(() => {
    if (studentQuery.trim().length >= 2) return visibleSearchResults;
    return unassigned.slice(0, 12).map((student) => ({ id: student.id, firstName: student.firstName, lastName: student.lastName, studentCode: null }));
  }, [studentQuery, visibleSearchResults, unassigned]);

  useEffect(() => {
    const query = studentQuery.trim();
    const requestId = ++searchSequence.current;
    if (query.length < 2) {
      const timer = window.setTimeout(() => {
        setStudentResults([]);
        setStudentSearchLoading(false);
        setStudentSearchError('');
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setStudentSearchLoading(true);
      setStudentSearchError('');
      try {
        const rows = await api<SearchStudent[]>(`/users/search?q=${encodeURIComponent(query)}`);
        if (active && requestId === searchSequence.current) setStudentResults(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (active && requestId === searchSequence.current) {
          setStudentSearchError(messageFor(err));
          setStudentResults([]);
        }
      } finally {
        if (active && requestId === searchSequence.current) setStudentSearchLoading(false);
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [studentQuery]);

  async function openEdit() {
    if (!isAdmin) return;
    setIntent(null);
    setTeachersError('');
    setTeachersLoading(true);
    try {
      const rows = await api<TeacherOption[]>('/users/teachers');
      setTeachers(rows.map(({ id, firstName, lastName, role: teacherRole }) => ({ id, firstName, lastName, role: teacherRole })));
      setActionError('');
      setIntent({ kind: 'edit' });
    } catch (err) {
      setTeachersError(messageFor(err));
    } finally {
      setTeachersLoading(false);
    }
  }

  async function openAdd() {
    setIntent({ kind: 'add' });
    setUnassigned([]);
    setStudentResults([]);
    setSelectedToAdd(null);
    setStudentQuery('');
    setUnassignedError('');
    setStudentSearchError('');
    setUnassignedLoading(true);
    try {
      const rows = await api<UnassignedStudent[]>('/classrooms/unassigned-students');
      setUnassigned(rows);
    } catch (err) {
      setUnassignedError(messageFor(err));
    } finally {
      setUnassignedLoading(false);
    }
  }

  async function openTransfer(student: Student) {
    setIntent({ kind: 'transfer', student });
    setTargetClassId('');
    setTransferError('');
    setTargetClassesLoading(true);
    try {
      const rows = await api<ClassroomListItem[]>('/classrooms');
      setTargetClasses(rows.filter((item) => item.id !== classroomId && item.archived !== true));
    } catch (err) {
      setTransferError(messageFor(err));
    } finally {
      setTargetClassesLoading(false);
    }
  }

  async function saveClassroom() {
    if (!detail || !isAdmin || busy) return;
    setBusy(true);
    setActionError('');
    try {
      await api(`/classrooms/${encodeURIComponent(classroomId)}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          type: form.type,
          grade: form.grade.trim() ? Number(form.grade) : null,
          teacherId: form.teacherId,
        },
      });
      setIntent(null);
      setNotice('Ангийн мэдээллийг хадгаллаа.');
      await load();
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmIntent() {
    if (!detail || !intent || busy) return;
    setBusy(true);
    setActionError('');
    try {
      if (intent.kind === 'remove') {
        await api(`/classrooms/${encodeURIComponent(classroomId)}/remove-student`, { method: 'POST', body: { studentId: intent.student.id } });
        setNotice(`${intent.student.lastName} ${intent.student.firstName} сурагчийг ангиас гаргалаа. Ирцийн түүх хадгалагдана.`);
      } else if (intent.kind === 'transfer') {
        if (!targetClassId) throw new Error('Шилжүүлэх ангийг сонгоно уу.');
        await api(`/classrooms/${encodeURIComponent(targetClassId)}/enroll`, { method: 'POST', body: { studentId: intent.student.id } });
        const target = targetClasses.find((item) => item.id === targetClassId);
        setNotice(`${intent.student.lastName} ${intent.student.firstName} сурагчийг ${target?.name ?? 'сонгосон анги'} руу шилжүүллээ. Өмнөх ангийн ирцийн түүх хадгалагдана.`);
      } else if (intent.kind === 'add') {
        if (!selectedToAdd) throw new Error('Ангид нэмэх сурагчийг сонгоно уу.');
        await api(`/classrooms/${encodeURIComponent(classroomId)}/enroll`, { method: 'POST', body: { studentId: selectedToAdd.id } });
        setNotice(`${selectedToAdd.lastName} ${selectedToAdd.firstName} сурагчийг ангид нэмлээ.`);
      } else if (intent.kind === 'archive') {
        if (archiveCode !== todayCodeUB()) throw new Error('Баталгаажуулах код таарахгүй байна.');
        await api(`/classrooms/${encodeURIComponent(classroomId)}?confirmCode=${encodeURIComponent(archiveCode)}`, { method: 'DELETE' });
        router.push('/app/admin/classrooms');
        router.refresh();
        return;
      }
      setIntent(null);
      setStudentQuery('');
      setSelectedToAdd(null);
      await load();
    } catch (err) {
      setActionError(messageFor(err));
    } finally {
      setBusy(false);
    }
  }

  const [archiveCode, setArchiveCode] = useState('');

  if (loading && !detail) return <RequireRole allow={['ADMIN', 'TEACHER_PLUS']}><div className="mx-auto w-full max-w-5xl"><LoadingState rows={6} label="Ангийн мэдээлэл ачаалж байна" /></div></RequireRole>;
  if (!detail) return <RequireRole allow={['ADMIN', 'TEACHER_PLUS']}><div className="mx-auto w-full max-w-5xl space-y-4"><Link href="/app/admin/classrooms" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><ArrowLeft size={17} aria-hidden /> Ангийн жагсаалт</Link><ErrorState message={error || 'Ангийн мэдээлэл олдсонгүй.'} onRetry={() => void load()} /></div></RequireRole>;

  const classroom = detail.classroom;
  const canManageStudents = detail.permissions?.canManageStudents ?? isAdmin;
  const studentFullName = (student: Pick<Student, 'firstName' | 'lastName'>) => `${student.lastName} ${student.firstName}`;

  return <RequireRole allow={['ADMIN', 'TEACHER_PLUS']}>
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <Link href="/app/admin/classrooms" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><ArrowLeft size={17} aria-hidden /> Ангийн жагсаалт руу</Link>
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {notice && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{notice}</p>}
      {actionError && !intent && <ErrorState message={actionError} onRetry={() => setActionError('')} />}
      {loading && <LoadingState rows={2} label="Ангийн мэдээллийг шинэчилж байна" />}

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand">АНГИЙН БҮРТГЭЛ</p>
          <h1 className="mt-1 break-words text-2xl font-extrabold text-ink">{classroom.name}</h1>
          <div className="mt-2 text-sm text-ink-dim"><Meta items={[
            classroom.type === 'ONLINE' ? 'Онлайн' : 'Танхим',
            classroom.grade ? `${classroom.grade}-р анги` : null,
            classroom.teacher ? `${classroom.teacher.lastName} ${classroom.teacher.firstName}` : 'Багш сонгоогүй',
            `${detail.students.length} сурагч`,
          ]} /></div>
        </div>
        {isAdmin && <button type="button" onClick={() => void openEdit()} disabled={teachersLoading || busy || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"><Pencil size={16} aria-hidden /> Ангийг засах</button>}
      </header>

      {isAdmin && teachersError && <ErrorState message={teachersError} onRetry={() => void openEdit()} />}
      {teachersLoading && <LoadingState rows={2} label="Багшийн жагсаалт ачаалж байна" />}
      {intent?.kind === 'edit' && <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5" aria-labelledby="class-edit-heading">
        <div className="flex items-start justify-between gap-3"><div><h2 id="class-edit-heading" className="text-lg font-bold text-ink">Ангийн мэдээлэл засах</h2><p className="mt-1 text-sm text-ink-dim">Нэр, төрөл, анги болон хариуцсан багшийг өөрчилнө.</p></div><button type="button" onClick={() => setIntent(null)} aria-label="Засвар хаах" className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-ink-dim hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"><X size={18} aria-hidden /></button></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Ангийн нэр" htmlFor="class-name"><input id="class-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={inputClass} /></Field>
          <Field label="Төрөл" htmlFor="class-type"><select id="class-type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ClassroomType })} className={inputClass}><option value="IN_PERSON">Танхим</option><option value="ONLINE">Онлайн</option></select></Field>
          <Field label="Анги" htmlFor="class-grade"><select id="class-grade" value={form.grade} onChange={(event) => setForm({ ...form, grade: event.target.value })} className={inputClass}><option value="">Анги сонгоогүй</option>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={String(index + 1)}>{index + 1}-р анги</option>)}</select></Field>
          <Field label="Багш" htmlFor="class-teacher"><select id="class-teacher" value={form.teacherId} onChange={(event) => setForm({ ...form, teacherId: event.target.value })} className={inputClass}><option value="">Багшгүй</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.lastName} {teacher.firstName}{teacher.role === 'TEACHER_PLUS' ? ' — Багш+' : ''}</option>)}</select></Field>
        </div>
        {actionError && <ErrorState message={actionError} onRetry={() => void saveClassroom()} />}
        <button type="button" onClick={() => void saveClassroom()} disabled={busy || !form.name.trim()} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"><Check size={16} aria-hidden /> {busy ? 'Хадгалж байна...' : 'Өөрчлөлтийг хадгалах'}</button>
      </section>}

      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-labelledby="class-students-heading">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="class-students-heading" className="text-lg font-bold text-ink">Сурагчид</h2><p className="mt-1 text-sm text-ink-dim">{detail.students.length} идэвхтэй сурагч</p></div>
          {canManageStudents && <button type="button" onClick={() => void openAdd()} disabled={busy || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"><UserPlus size={16} aria-hidden /> Сурагч нэмэх</button>}
        </div>
        {!canManageStudents && <p className="mt-3 rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info">Сурагч нэмэх, хасах, шилжүүлэх эрхийг админаар нээлгэнэ үү.</p>}
        {detail.students.length === 0 ? <EmptyState icon={UsersRound} title="Идэвхтэй сурагч алга" hint={canManageStudents ? 'Сурагчийг хайж энэ ангид нэмнэ үү.' : 'Энэ ангид одоогоор сурагч бүртгэгдээгүй байна.'} /> : <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
          {detail.students.map((student) => <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4">
            <div className="min-w-0 w-full sm:flex-1"><p className="break-words font-semibold text-ink">{studentFullName(student)}</p><p className="mt-0.5 text-sm text-ink-dim"><Meta items={[student.studentCode || 'Кодгүй', `${dateLabel(student.joinedAt)}-нд элссэн`]} /></p></div>
            {canManageStudents && <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button type="button" onClick={() => void openTransfer(student)} disabled={busy || loading} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 sm:flex-none"><ArrowRightLeft size={15} aria-hidden /> Шилжүүлэх</button>
              <button type="button" onClick={() => { setActionError(''); setIntent({ kind: 'remove', student }); }} disabled={busy || loading} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-semibold text-error hover:bg-error/20 focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50 sm:flex-none"><UserMinus size={15} aria-hidden /> Хасах</button>
            </div>}
          </li>)}
        </ul>}
      </section>

      {isAdmin && <section className="rounded-2xl border border-error/30 bg-error/10 p-4 sm:p-5">
        <div className="flex items-start gap-3"><Archive size={20} className="mt-0.5 shrink-0 text-error" aria-hidden /><div className="min-w-0 flex-1"><h2 className="font-bold text-error">Аюултай бүс</h2><p className="mt-1 text-sm text-ink">Ангийг идэвхтэй жагсаалтаас архивлана. Сурагчдын бүртгэл, ирцийн түүх үлдэнэ. Энэ үйлдлийг буцаах боломжгүй.</p><button type="button" onClick={() => { setArchiveCode(''); setActionError(''); setIntent({ kind: 'archive' }); }} disabled={busy || loading} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-error/40 px-4 py-2 text-sm font-semibold text-error hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error disabled:opacity-50"><Archive size={16} aria-hidden /> Ангийг архивлах</button></div></div>
      </section>}

      {intent?.kind === 'remove' && <Dialog title={`${studentFullName(intent.student)} сурагчийг хасах уу?`} onClose={() => !busy && setIntent(null)} busy={busy} confirmLabel="Ангийн бүртгэлээс хасах" onConfirm={confirmIntent} danger>
        <p className="text-sm text-ink-dim">Сурагч энэ ангиас гарна. Ирцийн түүх хадгалагдах бөгөөд сурагчийг өөр ангид оруулбал шинэ элсэлтийн бүртгэл үүснэ.</p>
        {actionError && <ErrorState message={actionError} onRetry={() => void confirmIntent()} />}
      </Dialog>}

      {intent?.kind === 'transfer' && <Dialog title={`${studentFullName(intent.student)} сурагчийг шилжүүлэх`} onClose={() => !busy && setIntent(null)} busy={busy} confirmLabel="Сонгосон ангид шилжүүлэх" confirmDisabled={!targetClassId || targetClassesLoading} onConfirm={confirmIntent}>
        <p className="text-sm text-ink-dim">Шинэ ангид элсүүлэхэд өмнөх ангийн идэвхтэй бүртгэл автоматаар хаагдана. Ирцийн түүх хадгалагдана.</p>
        {targetClassesLoading && <LoadingState rows={2} label="Ангийн жагсаалт ачаалж байна" />}
        {transferError && <ErrorState message={transferError} onRetry={() => void openTransfer(intent.student)} />}
        {!targetClassesLoading && !transferError && targetClasses.length === 0 && <EmptyState title="Шилжүүлэх өөр анги алга" hint="Эхлээд идэвхтэй анги бүртгэнэ үү." />}
        {!targetClassesLoading && targetClasses.length > 0 && <Field label="Шилжүүлэх анги" htmlFor="target-class"><select id="target-class" value={targetClassId} onChange={(event) => setTargetClassId(event.target.value)} className={inputClass}><option value="">Анги сонгох</option>{targetClasses.map((item) => <option key={item.id} value={item.id}>{item.name}{item.grade ? ` — ${item.grade}-р анги` : ''}</option>)}</select></Field>}
        {actionError && <ErrorState message={actionError} onRetry={() => void confirmIntent()} />}
      </Dialog>}

      {intent?.kind === 'add' && <Dialog title="Ангид сурагч нэмэх" onClose={() => !busy && setIntent(null)} busy={busy} confirmLabel="Сурагчийг ангид нэмэх" confirmDisabled={!selectedToAdd || unassignedLoading} onConfirm={confirmIntent}>
        <p className="text-sm text-ink-dim">Өөр идэвхтэй ангид бүртгэлгүй сурагчдыг сонгоно.</p>
        <label htmlFor="student-search" className="block text-sm font-semibold text-ink">Нэр эсвэл сурагчийн кодоор хайх</label>
        <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden /><input id="student-search" type="search" role="combobox" aria-autocomplete="list" aria-expanded={addCandidates.length > 0} aria-controls="student-search-results" value={studentQuery} onChange={(event) => { setStudentQuery(event.target.value); setStudentResults([]); setSelectedToAdd(null); }} placeholder="Хоёр ба түүнээс олон тэмдэгт" className="min-h-11 w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-ink focus-visible:outline-2 focus-visible:outline-brand" /></div>
        {unassignedLoading && <LoadingState rows={3} label="Ангид бүртгэлгүй сурагчид ачаалж байна" />}
        {unassignedError && <ErrorState message={unassignedError} onRetry={() => void openAdd()} />}
        {studentSearchLoading && <LoadingState rows={2} label="Сурагч хайж байна" />}
        {studentSearchError && <ErrorState message={studentSearchError} onRetry={() => setStudentQuery((value) => `${value} `)} />}
        {!unassignedLoading && !unassignedError && !studentSearchLoading && !studentSearchError && addCandidates.length === 0 && <p className="rounded-xl border border-line bg-panel p-3 text-sm text-ink-dim">{studentQuery.trim().length >= 2 ? 'Ийм нэртэй, ангид бүртгэлгүй сурагч олдсонгүй.' : 'Ангид бүртгэлгүй сурагч олдсонгүй.'}</p>}
        {addCandidates.length > 0 && <ul id="student-search-results" role="listbox" aria-label="Ангид бүртгэлгүй сурагчид" className="max-h-56 overflow-y-auto rounded-xl border border-line">{addCandidates.map((student) => <li key={student.id}><button type="button" role="option" aria-selected={selectedToAdd?.id === student.id} onClick={() => setSelectedToAdd(student)} className={`flex min-h-12 w-full items-center justify-between gap-2 border-b border-line px-3 py-2 text-left last:border-0 focus-visible:outline-2 focus-visible:outline-brand ${selectedToAdd?.id === student.id ? 'bg-brand-soft text-brand' : 'hover:bg-panel'}`}><span className="font-semibold">{student.lastName} {student.firstName}</span><span className="text-sm text-ink-dim">{student.studentCode || 'Кодгүй'}</span></button></li>)}</ul>}
        {selectedToAdd && <p className="rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">{selectedToAdd.lastName} {selectedToAdd.firstName} сурагчийг «{classroom.name}» ангид нэмнэ.</p>}
        {actionError && <ErrorState message={actionError} onRetry={() => void confirmIntent()} />}
      </Dialog>}

      {intent?.kind === 'archive' && <Dialog title={`«${classroom.name}» ангийг архивлах уу?`} onClose={() => !busy && setIntent(null)} busy={busy} confirmLabel="Архивлах" confirmDisabled={archiveCode !== todayCodeUB()} onConfirm={confirmIntent} danger>
        <p className="text-sm text-ink-dim">Ангийг идэвхтэй ангийн жагсаалтаас хасна. Сурагчдын бүртгэл, ирц болон түүх хадгалагдана. Буцаах боломжгүй. Баталгаажуулахын тулд өнөөдрийн Улаанбаатарын огноог ЖЖЖЖССӨӨ хэлбэрээр бичнэ.</p>
        <label htmlFor="archive-code" className="block text-sm font-semibold text-ink">Баталгаажуулах код</label>
        <input id="archive-code" inputMode="numeric" autoComplete="off" value={archiveCode} onChange={(event) => setArchiveCode(event.target.value)} className={inputClass} placeholder="ЖЖЖЖССӨӨ" />
        {archiveCode && archiveCode !== todayCodeUB() && <p role="alert" className="rounded-lg bg-error/10 p-3 text-sm font-semibold text-error">Баталгаажуулах код таарахгүй байна.</p>}
        {actionError && <ErrorState message={actionError} onRetry={() => void confirmIntent()} />}
      </Dialog>}
    </div>
  </RequireRole>;
}

const inputClass = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-brand';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">{label}</label>{children}</div>;
}
