'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Info, Search, UserRound, X } from 'lucide-react';
import { api } from '@/lib/api';
import { ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { formatMoney } from './format';
import { REFUND_WARNING_TEXT, type RefundPreview } from './types';

interface StudentSearchResult {
  id: string;
  studentCode: string | null;
  firstName: string;
  lastName: string;
  username: string | null;
}

interface StudentDetail {
  id: string;
  role: string;
  currentClassroom: { id: string; name: string; grade: number | null } | null;
}

interface RefundCalculatorProps {
  onCalculate: (data: RefundPreview) => void;
  onSubmit: (studentId: string, classroomId: string, leftOn: string) => Promise<void>;
  loading?: boolean;
}

function todayInUlaanbaatar(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ulaanbaatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export default function RefundCalculator({ onCalculate, onSubmit, loading = false }: RefundCalculatorProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [classroom, setClassroom] = useState<StudentDetail['currentClassroom']>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState('');
  const [leftOn, setLeftOn] = useState(todayInUlaanbaatar);
  const [preview, setPreview] = useState<RefundPreview | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const requestSequence = useRef(0);
  const searchId = useRef(0);
  const previewSequence = useRef(0);
  const previewKey = useRef<string | null>(null);

  function clearPreview() {
    previewSequence.current += 1;
    previewKey.current = null;
    setPreview(null);
    setCalculating(false);
  }

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      const resetTimer = window.setTimeout(() => {
        setSearchResults([]);
        setSearching(false);
        setSearchError('');
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    const requestId = ++searchId.current;
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const results = await api<StudentSearchResult[]>(`/users/search?q=${encodeURIComponent(term)}`);
        if (active && requestId === searchId.current) setSearchResults(Array.isArray(results) ? results : []);
      } catch {
        if (active && requestId === searchId.current) {
          setSearchError('Сурагч хайж чадсангүй. Дахин оролдоно уу.');
          setSearchResults([]);
        }
      } finally {
        if (active && requestId === searchId.current) setSearching(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  async function chooseStudent(student: StudentSearchResult) {
    const requestId = ++requestSequence.current;
    setSelectedStudent(student);
    setQuery('');
    setSearchResults([]);
    clearPreview();
    setError('');
    setClassroom(null);
    setStudentError('');
    setStudentLoading(true);
    try {
      const detail = await api<StudentDetail>(`/users/${encodeURIComponent(student.id)}`);
      if (requestId !== requestSequence.current) return;
      if (detail.role !== 'STUDENT') {
        setStudentError('Сурагчийн бүртгэл сонгоно уу.');
      } else if (!detail.currentClassroom) {
        setStudentError('Энэ сурагчийн идэвхтэй анги олдсонгүй. Ангиа шалгана уу.');
      } else {
        setClassroom(detail.currentClassroom);
      }
    } catch {
      if (requestId === requestSequence.current) setStudentError('Сурагчийн мэдээлэл авч чадсангүй. Дахин оролдоно уу.');
    } finally {
      if (requestId === requestSequence.current) setStudentLoading(false);
    }
  }

  function clearStudent() {
    requestSequence.current += 1;
    setSelectedStudent(null);
    setClassroom(null);
    clearPreview();
    setStudentLoading(false);
    setStudentError('');
    setError('');
  }

  async function handleCalculate(event?: FormEvent) {
    event?.preventDefault();
    if (!selectedStudent || !classroom || !leftOn) return;
    const requestId = ++previewSequence.current;
    const key = JSON.stringify([selectedStudent.id, classroom.id, leftOn]);
    previewKey.current = null;
    setCalculating(true);
    setError('');
    setPreview(null);
    try {
      const params = new URLSearchParams({
        studentId: selectedStudent.id,
        classroomId: classroom.id,
        leftOn,
      });
      const data = await api<RefundPreview>(`/tuition/refund/preview?${params.toString()}`);
      if (requestId !== previewSequence.current) return;
      previewKey.current = key;
      setPreview(data);
      onCalculate(data);
    } catch {
      if (requestId === previewSequence.current) setError('Буцаалтын тооцоо хийж чадсангүй. Дахин оролдоно уу.');
    } finally {
      if (requestId === previewSequence.current) setCalculating(false);
    }
  }

  async function handleSubmit() {
    if (!preview || !selectedStudent || !classroom || loading ||
        previewKey.current !== JSON.stringify([selectedStudent.id, classroom.id, leftOn])) return;
    setError('');
    try {
      await onSubmit(selectedStudent.id, classroom.id, leftOn);
    } catch {
      setError('Буцаалт үүсгэж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу.');
    }
  }

  const canCalculate = Boolean(selectedStudent && classroom && leftOn) && !studentLoading && !calculating && !loading;

  return (
    <form onSubmit={handleCalculate} className="space-y-6">
      <section className="rounded-2xl border border-line bg-panel p-4 sm:p-5">
        <h2 className="text-base font-bold text-ink">1. Сурагч, гарах өдрөө сонгох</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="refund-student-search" className="mb-1 block text-sm font-semibold text-ink">Сурагч хайх</label>
            {selectedStudent ? <div className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
              <UserRound className="h-5 w-5 shrink-0 text-brand" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink">{selectedStudent.lastName} {selectedStudent.firstName}</span>
                <span className="block text-sm text-ink-dim">{selectedStudent.studentCode || selectedStudent.username || 'Сурагч'}</span>
              </span>
              <button type="button" onClick={clearStudent} disabled={loading} aria-label="Сурагчийн сонголтыг арилгах" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-bg focus-visible:outline-2 focus-visible:outline-brand"><X className="h-5 w-5" aria-hidden /></button>
            </div> : <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
                <input id="refund-student-search" type="search" role="combobox" aria-autocomplete="list" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Нэр эсвэл сурагчийн кодоор хайх" className="min-h-11 w-full rounded-xl border border-line bg-surface py-2 pl-10 pr-3 text-ink focus-visible:outline-2 focus-visible:outline-brand" aria-describedby="refund-search-help" aria-expanded={searchResults.length > 0} aria-controls="refund-student-results" />
              </div>
              <p id="refund-search-help" className="mt-1 text-xs text-ink-dim">Хайлт хоёр ба түүнээс олон тэмдэгт оруулсны дараа эхэлнэ.</p>
              {searching && <div className="mt-2"><LoadingState rows={1} label="Сурагч хайж байна" /></div>}
              {searchError && <ErrorState message={searchError} onRetry={() => setQuery((value) => `${value} `)} />}
              {!searching && !searchError && query.trim().length >= 2 && searchResults.length === 0 && <p className="mt-2 rounded-lg border border-line bg-surface p-3 text-sm text-ink-dim">Ийм сурагч олдсонгүй. Нэр эсвэл кодоо шалгаад дахин хайна уу.</p>}
              {searchResults.length > 0 && <div id="refund-student-results" role="listbox" aria-label="Сурагчийн хайлтын үр дүн" className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface shadow-sm">
                {searchResults.map((student) => <button key={student.id} type="button" role="option" aria-selected="false" onClick={() => void chooseStudent(student)} className="flex min-h-12 w-full flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 text-left last:border-b-0 hover:bg-panel focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-brand">
                  <span className="font-semibold text-ink">{student.lastName} {student.firstName}</span>
                  <span className="text-sm text-ink-dim">{student.studentCode || student.username || 'Кодгүй'}</span>
                </button>)}
              </div>}
            </div>}
          </div>

          {studentLoading && <LoadingState rows={1} label="Сурагчийн анги ачаалж байна" />}
          {studentError && <ErrorState message={studentError} onRetry={() => selectedStudent && void chooseStudent(selectedStudent)} />}
          {classroom && selectedStudent && <div>
            <label htmlFor="refund-classroom" className="mb-1 block text-sm font-semibold text-ink">Идэвхтэй анги</label>
            <select id="refund-classroom" value={classroom.id} disabled className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 text-ink disabled:opacity-100">
              <option value={classroom.id}>{classroom.name}{classroom.grade ? ` — ${classroom.grade}-р анги` : ''}</option>
            </select>
          </div>}

          <div>
            <label htmlFor="refund-left-on" className="mb-1 block text-sm font-semibold text-ink">Ангиас гарсан огноо</label>
            <input id="refund-left-on" type="date" required value={leftOn} onChange={(event) => { setLeftOn(event.target.value); clearPreview(); setError(''); }} disabled={calculating || loading} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-brand" />
          </div>
        </div>
        <button type="submit" disabled={!canCalculate} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          {calculating ? 'Тооцож байна...' : 'Тооцоог харах'}
        </button>
      </section>

      {error && <ErrorState message={error} onRetry={preview ? () => void handleCalculate() : undefined} />}

      {preview && <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5" aria-labelledby="refund-preview-heading">
        <div>
          <h2 id="refund-preview-heading" className="text-base font-bold text-ink">2. Тооцооны тойм</h2>
          <p className="mt-1 text-sm text-ink-dim">{preview.student.lastName} {preview.student.firstName} <span className="mx-1 text-ink-dim" aria-hidden>—</span> {preview.classroom.name} <span className="mx-1 text-ink-dim" aria-hidden>—</span> Гарах өдөр: {preview.leftOn}</p>
        </div>
        {preview.calculation.warnings.length > 0 && <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <ul className="list-disc space-y-1 pl-4">{preview.calculation.warnings.map((warning) => <li key={warning}>{REFUND_WARNING_TEXT[warning]}</li>)}</ul>
        </div>}
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Summary label="Нийт хичээлийн өдөр" value={`${preview.calculation.totalLessonDays} өдөр`} />
          <Summary label="Суусан өдөр" value={`${preview.calculation.attendedLessonDays} өдөр`} />
          <Summary label="Нэг өдрийн үнэ" value={formatMoney(preview.calculation.dailyRate)} />
          <Summary label="Төлөх ёстой" value={formatMoney(preview.calculation.owed)} />
          <Summary label="Төлсөн" value={formatMoney(preview.calculation.totalPaid)} />
          <Summary label="Буцаах дүн" value={formatMoney(preview.calculation.refundAmount)} emphasis={preview.calculation.refundAmount > 0 ? 'success' : undefined} />
          {preview.calculation.shortfall > 0 && <Summary label="Дутуу төлбөр" value={formatMoney(preview.calculation.shortfall)} emphasis="error" />}
        </dl>
        <div className="rounded-xl border border-line bg-panel p-3">
          <h3 className="mb-2 text-sm font-semibold text-ink">Тооцооны тайлбар</h3>
          <ol className="space-y-1 text-sm text-ink-dim">{preview.explanation.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}</ol>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Буцаалт эхлээд ноорог байдлаар хадгалагдана. Зөвшөөрөгдөж, олгосны дараа төлөв шинэчлэгдэнэ.</p>
        </div>
        <button type="button" onClick={() => void handleSubmit()} disabled={loading || calculating || studentLoading} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 font-semibold text-on-brand hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50 sm:w-auto">
          <CheckCircle2 className="h-5 w-5" aria-hidden />{loading ? 'Хадгалж байна...' : 'Буцаалтын ноорог хадгалах'}
        </button>
      </section>}
    </form>
  );
}

function Summary({ label, value, emphasis }: { label: string; value: string; emphasis?: 'success' | 'error' }) {
  const emphasisClass = emphasis === 'success' ? 'text-success' : emphasis === 'error' ? 'text-error' : 'text-ink';
  return <div className="min-w-0 rounded-xl border border-line bg-panel p-3">
    <dt className="text-xs text-ink-dim">{label}</dt>
    <dd className={`mt-1 break-words text-base font-bold tabular-nums sm:text-lg ${emphasisClass}`}>{value}</dd>
  </div>;
}
