"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, getRole } from "@/lib/api";

type SmsKind = "PASSWORD_RESET" | "ANNOUNCEMENT" | "PAYMENT_REMINDER" | "ATTENDANCE" | "EXAM" | "MANUAL" | "OTHER";
interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  kind: SmsKind;
  createdAt: string;
}

const KIND_LABEL: Record<SmsKind, string> = {
  PASSWORD_RESET: "Нууц үг сэргээх",
  ANNOUNCEMENT: "Мэдэгдэл",
  PAYMENT_REMINDER: "Төлбөрийн сануулга",
  ATTENDANCE: "Ирц",
  EXAM: "Шалгалт",
  MANUAL: "Гараар илгээх",
  OTHER: "Бусад",
};

export function SmsTemplates() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", body: "", kind: "MANUAL" as SmsKind });
  const canManage = getRole() === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTemplates(await api<SmsTemplate[]>("/sms/templates"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Загвар ачаалж чадсангүй.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api<SmsTemplate[]>("/sms/templates")
      .then((rows) => { if (active) setTemplates(rows); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Загвар ачаалж чадсангүй."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({ name: "", body: "", kind: "MANUAL" });
    setFormError(null);
    setFormOpen(true);
  }

  function startEdit(item: SmsTemplate) {
    if (item.kind === "PASSWORD_RESET") return;
    setEditingId(item.id);
    setForm({ name: item.name, body: item.body, kind: item.kind });
    setFormError(null);
    setFormOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const body = form.body.trim();
    if (!name || !body) {
      setFormError("Загварын нэр болон мессежийн агуулгыг бөглөнө үү.");
      return;
    }
    if (/нууц\s*үг.{0,24}(код|code)\s*[:=]\s*\d{4,}/i.test(body)) {
      setFormError("Нууц үг сэргээх бодит кодыг загварт хадгалах боломжгүй.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api(editingId ? `/sms/templates/${editingId}` : "/sms/templates", {
        method: editingId ? "PATCH" : "POST",
        body: editingId ? { name, body } : { name, body, kind: form.kind },
      });
      setFormOpen(false);
      setEditingId(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Загварыг хадгалж чадсангүй.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: SmsTemplate) {
    if (!window.confirm(`«${item.name}» загварыг устгах уу?`)) return;
    setError(null);
    try {
      await api(`/sms/templates/${item.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Загварыг устгаж чадсангүй.");
    }
  }

  if (loading) return <LoadingState rows={4} label="SMS загварыг ачаалж байна" />;
  if (error && templates.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4">
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionHeader title="Мессежийн загвар" />
            <p className="text-sm text-ink-dim">Загварыг илгээх хэсэгт сонгож, агуулгыг нь ашиглана.</p>
          </div>
          {canManage && !formOpen && <Button type="button" onClick={startCreate}><Plus className="h-4 w-4" aria-hidden />Загвар нэмэх</Button>}
        </div>
        {!canManage && <p className="mt-3 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink-dim">Загвар харах эрхтэй. Өөрчлөлтийг администратор хийнэ.</p>}
      </Card>

      {formOpen && canManage && (
        <Card>
          <SectionHeader title={editingId ? "Загвар засах" : "Шинэ загвар"} />
          <form className="space-y-4" onSubmit={save}>
            <div>
              <label htmlFor="sms-template-name" className="block text-sm font-semibold text-ink">Загварын нэр</label>
              <input id="sms-template-name" required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
            </div>
            {!editingId && (
              <div>
                <label htmlFor="sms-template-kind" className="block text-sm font-semibold text-ink">Загварын төрөл</label>
                <select id="sms-template-kind" value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as SmsKind })} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm">
                  {(["MANUAL", "ANNOUNCEMENT", "PAYMENT_REMINDER", "ATTENDANCE", "EXAM", "OTHER"] as SmsKind[]).map((kind) => <option key={kind} value={kind}>{KIND_LABEL[kind]}</option>)}
                </select>
                <p className="mt-1 text-xs text-ink-dim">Нууц үг сэргээх код агуулсан загвар энд үүсгэхгүй.</p>
              </div>
            )}
            <div>
              <label htmlFor="sms-template-body" className="block text-sm font-semibold text-ink">Мессежийн агуулга</label>
              <textarea id="sms-template-body" required maxLength={1000} rows={5} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand" />
              <p className="mt-1 text-xs text-ink-dim">{form.body.length} тэмдэгт. Загварын текст яг хэвээрээ хадгалагдана.</p>
            </div>
            {formError && <p role="alert" className="text-sm text-error">{formError}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" loading={saving}>{saving ? "Хадгалж байна" : editingId ? "Өөрчлөлт хадгалах" : "Загвар үүсгэх"}</Button>
              <Button type="button" variant="secondary" disabled={saving} onClick={() => { setFormOpen(false); setEditingId(null); setFormError(null); }}>Болих</Button>
            </div>
          </form>
        </Card>
      )}

      {templates.length === 0 ? (
        <EmptyState title="Загвар алга" hint={canManage ? "Шинэ загвар нэмээд илгээх хэсэгт ашиглаарай." : "Администратор загвар нэмсний дараа энд харагдана."} />
      ) : (
        <div className="space-y-3">
          {templates.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{item.name}</h3>
                    <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-dim">{KIND_LABEL[item.kind] ?? item.kind}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink">{item.body}</p>
                  <p className="mt-2 text-xs text-ink-dim">{item.body.length} тэмдэгт</p>
                </div>
                {canManage && item.kind !== "PASSWORD_RESET" && (
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" aria-label={`${item.name} загварыг засах`} onClick={() => startEdit(item)}><Edit2 className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Засах</span></Button>
                    <Button type="button" variant="secondary" aria-label={`${item.name} загварыг устгах`} onClick={() => void remove(item)}><Trash2 className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Устгах</span></Button>
                  </div>
                )}
                {item.kind === "PASSWORD_RESET" && <span className="text-xs text-ink-dim">Сэргээх кодын загварыг энд өөрчлөх боломжгүй.</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
