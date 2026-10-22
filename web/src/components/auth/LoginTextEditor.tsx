"use client";

import { useEffect, useState } from "react";
import { Check, Megaphone } from "lucide-react";
import { Card, PageHeader } from "@/components/ui/Surface";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";

/** Сервертэй ижил (api/src/auth/dto/login-text.dto.ts) */
const MAX = 1000;

/* Админ: нэвтрэх хуудасны тайлбар/зарлал (PUT /auth/login-text). Хоосон
   хадгалвал нэвтрэх хуудсанд юу ч харагдахгүй. Урьдчилан харах нь нэвтрэх
   хуудастай ижил хэлбэртэй. */
export default function LoginTextEditor() {
  const [body, setBody] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api<{ body: string }>("/auth/login-text", { auth: false })
      .then((r) => {
        if (!active) return;
        setBody(r.body ?? "");
        setSaved(r.body ?? "");
        setLoadError(false);
      })
      .catch(() => active && setLoadError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [retry]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const r = await api<{ body: string }>("/auth/login-text", {
        method: "PUT",
        body: { body },
      });
      setBody(r.body);
      setSaved(r.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setSaving(false);
    }
  }

  const dirty = saved !== null && body !== saved;
  const over = body.length > MAX;
  const preview = body.trim();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Нэвтрэх хуудасны тайлбар"
        description="Нэвтрэх хуудсын дээд хэсэгт бүх хүнд харагдана. Энгийн текст, мөр шилжүүлж болно"
      />
      {loadError ? (
        <ErrorState
          message="Тайлбарыг ачаалж чадсангүй."
          onRetry={() => {
            setLoading(true);
            setRetry((n) => n + 1);
          }}
        />
      ) : (
        <Card>
          <label htmlFor="login-text" className="mb-1.5 block text-sm font-medium text-ink">
            Тайлбар, зарлал
          </label>
          {loading ? (
            <div className="space-y-2" aria-busy>
              <SkeletonLine width="100%" height={18} />
              <SkeletonLine width="80%" height={18} />
              <SkeletonLine width="60%" height={18} />
            </div>
          ) : (
            <textarea
              id="login-text"
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                if (error) setError("");
              }}
              rows={6}
              placeholder="ж: Шинэ улирлын бүртгэл 9-р сарын 1-нд эхэлнэ. Асуух зүйл байвал 7711-2233"
              aria-describedby="login-text-count"
              className={`w-full resize-y rounded-2xl border-2 bg-bg px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-ink-dim/70 focus:border-brand ${
                over ? "border-error" : "border-line"
              }`}
            />
          )}
          <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
            <span id="login-text-count" className={over ? "text-error" : "text-ink-dim"}>
              {body.length} / {MAX} тэмдэгт
            </span>
            {!dirty && saved !== null && !loading && (
              <span className="inline-flex items-center gap-1 text-success">
                <Check aria-hidden className="h-3.5 w-3.5" />
                Хадгалсан
              </span>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-error/40 bg-error/10 px-3 py-2 text-sm text-ink">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={save} disabled={saving || loading || over || !dirty} aria-busy={saving}>
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </Button>
            {dirty && (
              <Button variant="outline" onClick={() => setBody(saved ?? "")} disabled={saving}>
                Буцаах
              </Button>
            )}
          </div>

          <h2 className="mb-2 mt-6 text-sm font-semibold text-ink">Нэвтрэх хуудсанд ингэж харагдана</h2>
          {preview ? (
            <div className="flex gap-2.5 rounded-xl border border-brand/25 bg-brand/5 px-3.5 py-3 text-sm text-ink">
              <Megaphone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <p className="min-w-0 whitespace-pre-line break-words">{preview}</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line px-3.5 py-3 text-sm text-ink-dim">
              Хоосон — нэвтрэх хуудсанд тайлбар харагдахгүй
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
