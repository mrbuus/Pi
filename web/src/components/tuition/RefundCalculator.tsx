'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface Calculation {
  totalLessonDays: number;
  attendedLessonDays: number;
  dailyRate: number;
  owed: number;
  totalPaid: number;
  refundAmount: number;
  shortfall: number;
  warnings: string[];
}

interface PreviewData {
  student: { id: string; firstName: string; lastName: string };
  classroom: { id: string; name: string };
  joinedOn: string;
  leftOn: string;
  calculation: Calculation;
  explanation: string[];
}

interface RefundCalculatorProps {
  onCalculate: (data: PreviewData) => void;
  onSubmit: (studentId: string, classroomId: string, leftOn: string) => Promise<void>;
  loading?: boolean;
}

export default function RefundCalculator({
  onCalculate,
  onSubmit,
  loading = false,
}: RefundCalculatorProps) {
  const [studentId, setStudentId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [leftOn, setLeftOn] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    try {
      const res = await fetch(
        `/api/tuition/refund/preview?studentId=${studentId}&classroomId=${classroomId}&leftOn=${leftOn}`
      );
      if (!res.ok) {
        throw new Error('Тооцоо хийхэд алдаа гарлаа');
      }
      const data = await res.json();
      setPreview(data);
      onCalculate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа');
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async () => {
    if (!preview) return;
    try {
      await onSubmit(studentId, classroomId, leftOn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа');
    }
  };

  const format = (n: number) =>
    `${n.toLocaleString('en-US').replace(/,/g, ' ')}₮`;

  return (
    <div className="space-y-6">
      {/* Оруулалт */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Сурагч ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded bg-bg"
            disabled={calculating}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Анги ID
          </label>
          <input
            type="text"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded bg-bg"
            disabled={calculating}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">
            Гарсан огноо
          </label>
          <input
            type="date"
            value={leftOn}
            onChange={(e) => setLeftOn(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded bg-bg"
            disabled={calculating}
          />
        </div>
      </div>

      <button
        onClick={handleCalculate}
        disabled={!studentId || !classroomId || !leftOn || calculating}
        className="px-4 py-2 bg-brand text-on-brand rounded font-medium disabled:opacity-50"
      >
        {calculating ? 'Тооцоо хийж байна...' : 'Тооцоо хий'}
      </button>

      {error && (
        <div className="flex items-start gap-3 p-3 bg-error/10 border border-error rounded text-error">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {preview && (
        <div className="space-y-6">
          {/* Гарчиг */}
          <div className="border-b border-line pb-4">
            <h3 className="font-semibold text-ink mb-2">
              {preview.student.firstName} {preview.student.lastName}
            </h3>
            <p className="text-sm text-ink-dim">Анги: {preview.classroom.name}</p>
          </div>

          {/* Анхааруулга */}
          {preview.calculation.warnings.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning rounded">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-warning" />
              <div className="text-sm text-warning space-y-1">
                {preview.calculation.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            </div>
          )}

          {/* Тооцоо */}
          <div className="space-y-2 text-sm">
            {preview.explanation.map((line, i) => (
              <div key={i} className="text-ink">
                {line}
              </div>
            ))}
          </div>

          {/* Үр дүн */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="p-3 bg-panel rounded">
              <div className="text-xs text-ink-dim mb-1">Төлөх ёстой</div>
              <div className="text-lg font-semibold text-ink">
                {format(preview.calculation.owed)}
              </div>
            </div>
            <div className="p-3 bg-panel rounded">
              <div className="text-xs text-ink-dim mb-1">Төлсөн</div>
              <div className="text-lg font-semibold text-ink">
                {format(preview.calculation.totalPaid)}
              </div>
            </div>
            {preview.calculation.refundAmount > 0 && (
              <div className="p-3 bg-success/10 border border-success rounded">
                <div className="text-xs text-success mb-1">Буцаах дүн</div>
                <div className="text-lg font-semibold text-success">
                  {format(preview.calculation.refundAmount)}
                </div>
              </div>
            )}
            {preview.calculation.shortfall > 0 && (
              <div className="p-3 bg-error/10 border border-error rounded">
                <div className="text-xs text-error mb-1">Дутуу төлбөр</div>
                <div className="text-lg font-semibold text-error">
                  {format(preview.calculation.shortfall)}
                </div>
              </div>
            )}
          </div>

          {/* Батлалт */}
          <div className="p-4 bg-info/10 border border-info rounded">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-info" />
              <div className="text-sm text-info">
                Буцаалтыг үүсгэхэд энэ тооцоо хадгалагдаж, дараа нь админ баталгаажуулах ёстой.
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full px-4 py-2 bg-success text-on-brand rounded font-medium hover:bg-success/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            {loading ? 'Үүсгэж байна...' : 'Буцаалтыг үүсгэнэ'}
          </button>
        </div>
      )}
    </div>
  );
}
