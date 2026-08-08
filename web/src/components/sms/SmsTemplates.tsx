"use client";

import { useEffect, useState } from "react";
import { Trash2, Edit2, Plus } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/Button";
import InfoHint from "@/components/ui/InfoHint";

interface SmsTemplate {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  variables: string[];
}

export function SmsTemplates() {
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState(false);
  const [formData, setFormData] = useState({ name: "", text: "" });

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api<SmsTemplate[]>("/sms/templates");
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async () => {
    if (!formData.name || !formData.text) {
      alert("Нэр болон текст оруулна уу");
      return;
    }

    try {
      // ⚠️ Талбарын нэр СЕРВЭРТЭЙ таарах ЁСТОЙ: схемд `body` (`text` БИШ).
      // Мөн шинэчлэх нь PATCH (PUT БИШ) — controller-той таарууллаа.
      await api(
        editingId ? `/sms/templates/${editingId}` : "/sms/templates",
        {
          method: editingId ? "PATCH" : "POST",
          body: editingId
            ? { name: formData.name, body: formData.text }
            : { name: formData.name, body: formData.text, kind: "MANUAL" },
        },
      );

      setFormData({ name: "", text: "" });
      setEditingId(null);
      setNewTemplate(false);
      await fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Алдаа");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Энэ загварыг үнэхээр устгах уу?")) return;

    try {
      await api(`/sms/templates/${id}`, { method: "DELETE" });
      await fetchTemplates();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Алдаа");
    }
  };

  if (loading) return <LoadingState rows={4} label="Загварыг ачаалж байна" />;
  if (error) return <ErrorState message={error} onRetry={fetchTemplates} />;

  return (
    <div className="space-y-4">
      {/* Шинэ загвар үүсгэх форм */}
      {newTemplate || editingId ? (
        <Card>
          <SectionHeader
            title={editingId ? "Загварыг засах" : "Шинэ загвар"}
          />
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-ink">Загварын нэр</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Жишээ: Нэвтрэхийн хүсэлт"
                className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink">
                Мессежийн текст
                <InfoHint className="ml-1">
                  {"{"}name{"}"}, {"{"}phone{"}"}, {"{"}code{"}"} гэх мэт орлуулагчийг ашиглана уу.
                </InfoHint>
              </label>
              <textarea
                value={formData.text}
                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="Сайн байна уу {{name}}, таны нэвтрэхийн код: {{code}}"
                className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                rows={5}
              />
              <p className="mt-1 text-xs text-ink-dim">
                Урт: {formData.text.length} тэмдэгт
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={handleSave}>
                {editingId ? "Засах" : "Үүсгэх"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNewTemplate(false);
                  setEditingId(null);
                  setFormData({ name: "", text: "" });
                }}
              >
                Болих
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink">Загвар сан</h3>
            <Button
              variant="default"
              size="sm"
              onClick={() => setNewTemplate(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Үүсгэх
            </Button>
          </div>
        </Card>
      )}

      {/* Загварын жагсаалт */}
      {templates.length === 0 && !newTemplate && !editingId ? (
        <EmptyState
          title="Загвар байхгүй"
          hint="SMS явуулах загвар үүсгээрэй."
          action={
            <Button
              variant="default"
              size="sm"
              onClick={() => setNewTemplate(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Үүсгэх
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <Card key={template.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-bold text-ink">{template.name}</h4>
                  <p className="mt-1 text-sm text-ink-dim">{template.text}</p>
                  {template.variables.length > 0 && (
                    <p className="mt-2 text-xs text-brand-soft">
                      Орлуулагч: {template.variables.join(", ")}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-dim">
                    Үүсгэгдсэн: {new Date(template.createdAt).toLocaleString("mn-MN")}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setEditingId(template.id);
                      setFormData({ name: template.name, text: template.text });
                    }}
                  >
                    <Edit2 className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
