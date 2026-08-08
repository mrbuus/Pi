'use client';

import { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { api, uploadFile } from '@/lib/api';
import { ImportConfig, ImportResult } from './types';
import { SectionHeader } from '@/components/ui/Surface';

interface ImportUploaderProps {
  onSuccess?: (result: ImportResult) => void;
  onError?: (error: string) => void;
}

export function ImportUploader({ onSuccess, onError }: ImportUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ImportConfig>({
    dateCol: 0,
    amountCol: 1,
    descCol: 2,
    journalCol: 3,
    accountCol: 4,
    skipHeader: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      const isValid =
        selected.name.endsWith('.xlsx') ||
        selected.name.endsWith('.csv');
      if (isValid) {
        setFile(selected);
        setError(null);
      } else {
        setError('Зөвхөн .xlsx эсвэл .csv файл дэмжэгдэнэ');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Файлыг сонгоно уу');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('config', JSON.stringify(config));

      const response = await api<ImportResult>('/reconcile/import', {
        method: 'POST',
        body: formData,
      });

      setResult(response);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onSuccess?.(response);
    } catch (err: any) {
      const message =
        err?.message ||
        'Файл импортлоход алдаа гарлаа. Дахин оролдоно уу';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <SectionHeader title="Банкны хуулгыг импортлоо" />

      {/* Баганын зураглал */}
      <div className="bg-panel p-4 rounded-lg border border-line">
        <h3 className="text-sm font-semibold text-ink mb-3">Баганын зураглал</h3>
        <div className="grid grid-cols-1 gap-2">
          <div>
            <label className="block text-xs text-ink-dim mb-1">Огноо (баганын #)</label>
            <input
              type="number"
              value={config.dateCol}
              onChange={(e) =>
                setConfig({
                  ...config,
                  dateCol: parseInt(e.target.value) || 0,
                })
              }
              className="w-full px-2 py-1 border border-line rounded text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-dim mb-1">
              Дүн (баганын #)
            </label>
            <input
              type="number"
              value={config.amountCol}
              onChange={(e) =>
                setConfig({
                  ...config,
                  amountCol: parseInt(e.target.value) || 1,
                })
              }
              className="w-full px-2 py-1 border border-line rounded text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-dim mb-1">
              Тайлбар (баганын #)
            </label>
            <input
              type="number"
              value={config.descCol}
              onChange={(e) =>
                setConfig({
                  ...config,
                  descCol: parseInt(e.target.value) || 2,
                })
              }
              className="w-full px-2 py-1 border border-line rounded text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs text-ink-dim mb-1">
              Журнал / санхүүгийн код (баганын #)
            </label>
            <input
              type="number"
              value={config.journalCol}
              onChange={(e) =>
                setConfig({
                  ...config,
                  journalCol: parseInt(e.target.value) || 3,
                })
              }
              className="w-full px-2 py-1 border border-line rounded text-sm"
              disabled={loading}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.skipHeader ?? true}
              onChange={(e) =>
                setConfig({ ...config, skipHeader: e.target.checked })
              }
              disabled={loading}
            />
            <span className="text-ink">Эхний мөр толгой</span>
          </label>
        </div>
      </div>

      {/* Файл сонгох */}
      <div className="border-2 border-dashed border-line rounded-lg p-6 text-center bg-surface hover:bg-panel transition">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.csv"
          onChange={handleFileSelect}
          disabled={loading}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-brand text-on-brand font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          {file ? file.name : 'Файл сонгоо'}
        </button>
        <p className="text-xs text-ink-dim mt-2">
          .xlsx эсвэл .csv файлыг сонгоо (5МБ хүртэл)
        </p>
      </div>

      {/* Алдаа */}
      {error && (
        <div className="bg-error/10 border border-error text-error p-3 rounded-lg flex gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Импортын үр дүн */}
      {result && (
        <div className="bg-success/10 border border-success text-success p-4 rounded-lg space-y-2">
          <div className="flex gap-2 items-start">
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Импорт амжилттай</p>
              <ul className="text-xs mt-1 space-y-0.5">
                <li>
                  нийт {result.totalRows} мөр · импортлосон {result.imported}
                </li>
                <li>
                  давхардсан {result.skipped} · автоматаар холбогдсон{' '}
                  {result.matched}
                </li>
                {result.errors.length > 0 && (
                  <li className="text-warning mt-1">
                    {result.errors.length} мөрөнд алдаа байна
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Импортлоо товч */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full px-4 py-2 bg-brand text-on-brand font-medium rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Импортлож байна…' : 'Импортлоо'}
      </button>
    </div>
  );
}
