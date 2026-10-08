"use client";

import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card, PageHeader } from "@/components/ui/Surface";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";

type Preferences = { emailWeekly: boolean; emailReminders: boolean };
export default function NotificationSettingsPage() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    api<Preferences>("/notifications/settings").then(setPreferences).catch(() => setError("Мэдэгдлийн тохиргоог ачаалж чадсангүй.")).finally(() => setLoading(false));
  }, []);
  async function save() {
    if (!preferences) return;
    setSaving(true); setError(""); setMessage("");
    try { setPreferences(await api<Preferences>("/notifications/settings", { method: "PATCH", body: { emailWeekly: preferences.emailWeekly, emailReminders: preferences.emailReminders } })); setMessage("Тохиргоо хадгалагдлаа."); }
    catch { setError("Тохиргоог хадгалж чадсангүй. Дахин оролдоно уу."); }
    finally { setSaving(false); }
  }
  if (loading) return <LoadingState rows={3} label="Тохиргоо ачаалж байна" />;
  if (!preferences) return <div className="space-y-4"><PageHeader title="Мэдэгдлийн тохиргоо" /><ErrorState message={error || "Тохиргоо олдсонгүй."} /></div>;
  return <div className="space-y-5"><PageHeader title="Мэдэгдлийн тохиргоо" description="Мэдээллийн төвийн мэдэгдэл үргэлж ирнэ. Энд зөвхөн имэйл сонголтоо өөрчилнө." />
    <Card className="space-y-4">
      <label className="flex min-h-14 items-center justify-between gap-4"><span><strong className="block">Долоо хоногийн тайлан</strong><span className="text-sm text-ink-dim">Хүүхдийн долоо хоногийн явцыг имэйлээр авах.</span></span><input aria-label="Долоо хоногийн тайлангийн имэйл" type="checkbox" className="size-5 accent-brand" checked={preferences.emailWeekly} onChange={(event) => setPreferences({ ...preferences, emailWeekly: event.target.checked })} /></label>
      <label className="flex min-h-14 items-center justify-between gap-4 border-t border-line pt-4"><span><strong className="block">Сануулгын имэйл</strong><span className="text-sm text-ink-dim">Төлбөр, даалгавар, давталтын сануулга.</span></span><input aria-label="Сануулгын имэйл" type="checkbox" className="size-5 accent-brand" checked={preferences.emailReminders} onChange={(event) => setPreferences({ ...preferences, emailReminders: event.target.checked })} /></label>
      {error && <ErrorState message={error} />}{message && <p role="status" className="text-sm font-semibold text-success">{message}</p>}
      <Button onClick={() => void save()} disabled={saving}><BellRing aria-hidden />{saving ? "Хадгалж байна" : "Хадгалах"}</Button>
    </Card></div>;
}
