"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Bug, MessageSquare, Lightbulb, ImagePlus, X } from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/kit/button";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import AttachmentPreview from "@/components/homework/AttachmentPreview";
import { formatMnDate } from "@/lib/dateMn";
interface Ticket {
  id: string;
  kind: string;
  subject: string;
  body: string;
  state: string;
  response: string | null;
  contextPath: string | null;
  attachmentKeys: string[];
  createdAt: string;
  updatedAt: string;
  author?: { firstName: string; lastName: string; role: string };
}
const KIND = {
  BUG: { label: "Алдаа мэдээлэх", icon: Bug },
  SUGGESTION: { label: "Санал өгөх", icon: Lightbulb },
  QUESTION: { label: "Асуулт асуух", icon: MessageSquare },
};
const STATE: Record<string, string> = {
  OPEN: "Шинэ",
  IN_REVIEW: "Шалгаж байна",
  RESOLVED: "Шийдвэрлэсэн",
};
export default function FeedbackWorkspace() {
  const { user } = useAuth();
  const admin = user?.role === "ADMIN";
  const [all, setAll] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const detailId = useRef<string | null>(null);
  const detailPanel = useRef<HTMLElement | null>(null);
  const loadSequence = useRef(0);
  const [detailError, setDetailError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [kind, setKind] = useState<keyof typeof KIND>("BUG");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [contextPath, setContextPath] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [success, setSuccess] = useState("");
  const uploaded = useRef(new Map<File, string>());
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const sendLock = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [response, setResponse] = useState("");
  const [state, setState] = useState("OPEN");
  const [saving, setSaving] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const load = useCallback(
    (cursor?: string) => {
      const sequence = ++loadSequence.current;
      return api<Ticket[]>(
        `${all && admin ? "/feedback/admin" : "/feedback"}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      )
        .then((rows) => {
          if (sequence !== loadSequence.current) return;
          setLoadError("");
          setHasMore(rows.length > 50);
          setTickets((old) =>
            cursor ? [...old, ...rows.slice(0, 50)] : rows.slice(0, 50),
          );
        })
        .catch(() => {
          if (sequence === loadSequence.current)
            setLoadError(
              "Хүсэлтүүдийг ачаалж чадсангүй. Холболтоо шалгаад дахин оролдоорой.",
            );
        })
        .finally(() => {
          if (sequence === loadSequence.current) setLoading(false);
        });
    },
    [all, admin],
  );
  useEffect(() => {
    void load();
    return () => {
      loadSequence.current += 1;
    };
  }, [load]);
  function reload(cursor?: string) {
    setLoading(true);
    setLoadError("");
    void load(cursor);
  }
  useEffect(() => {
    if (selected) {
      detailPanel.current?.focus({ preventScroll: true });
      detailPanel.current?.scrollIntoView({ block: "start" });
    }
  }, [selected]);
  async function detail(id: string) {
    detailId.current = id;
    setDetailLoading(true);
    setDetailError("");
    setReviewError("");
    try {
      const ticket = await api<Ticket>(`/feedback/${id}`);
      if (detailId.current !== id) return;
      setSelected(ticket);
      setResponse(ticket.response ?? "");
      setState(ticket.state);
    } catch {
      if (detailId.current === id)
        setDetailError(
          "Хүсэлтийн мэдээллийг нээж чадсангүй. Дахин оролдоорой.",
        );
    } finally {
      if (detailId.current === id) setDetailLoading(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setSendError("");
    setSuccess("");
    try {
      if (subject.trim().length < 3 || body.trim().length < 10)
        throw new Error(
          "Гарчиг 3-аас, дэлгэрэнгүй 10-аас багагүй тэмдэгттэй байна.",
        );
      const attachmentKeys: string[] = [];
      for (const file of files) {
        if (
          !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
            file.type,
          )
        )
          throw new Error("Зөвхөн JPG, PNG, GIF, WEBP зураг хавсаргана.");
        if (file.size > 25 * 1024 * 1024)
          throw new Error("Нэг зураг 25 МБ-аас ихгүй байна.");
        let key = uploaded.current.get(file);
        if (!key) {
          key = (await uploadFile(file)).key;
          uploaded.current.set(file, key);
        }
        attachmentKeys.push(key);
      }
      const payload = {
        kind,
        subject: subject.trim(),
        body: body.trim(),
        contextPath: contextPath.trim() || undefined,
        attachmentKeys,
      };
      const fingerprint = JSON.stringify(payload);
      if (!request.current || request.current.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() };
      const saved = await api<Ticket>("/feedback", {
        method: "POST",
        body: { ...payload, clientRequestId: request.current.id },
      });
      setSubject("");
      setBody("");
      setContextPath("");
      setFiles([]);
      uploaded.current.clear();
      request.current = null;
      setSuccess("Хүсэлт хадгалагдлаа. Хариуг доорх түүхээс харна.");
      setSelected(saved);
      setResponse(saved.response ?? "");
      setState(saved.state);
      reload();
    } catch (error) {
      setSendError(
        error instanceof Error &&
          /Зөвхөн|25 МБ|Гарчиг 3-аас/.test(error.message)
          ? error.message
          : "Хүсэлт илгээгдсэн нь баталгаажсангүй. Бичсэн мэдээлэл, сонгосон зураг хэвээр байгаа тул дахин оролдоорой.",
      );
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }
  async function triage() {
    if (!selected || saving) return;
    setSaving(true);
    setReviewError("");
    try {
      const saved = await api<Ticket>(`/feedback/${selected.id}`, {
        method: "PATCH",
        body: { state, response },
      });
      setSelected(saved);
      setTickets((old) => old.map((t) => (t.id === saved.id ? saved : t)));
    } catch {
      setReviewError(
        "Хариуг хадгалж чадсангүй. Бичсэн хариу хэвээр байгаа тул дахин оролдоорой.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="cyrillic-heading text-2xl font-bold">
          Санал, асуулт, алдаа
        </h1>
        <p className="mt-2 text-sm text-ink-dim">
          Хүсэлтээ илгээж, хариу болон шийдвэрлэсэн байдлыг эндээс харна.
        </p>
      </div>
      <form
        onSubmit={send}
        className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6"
      >
        <h2 className="font-bold">Шинэ хүсэлт</h2>
        <fieldset disabled={sending} className="space-y-4">
          <legend className="sr-only">Хүсэлтийн мэдээлэл</legend>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Хүсэлтийн төрөл"
          >
            {Object.entries(KIND).map(([key, item]) => (
              <Button
                key={key}
                type="button"
                variant={kind === key ? "secondary" : "outline"}
                aria-pressed={kind === key}
                onClick={() => setKind(key as keyof typeof KIND)}
                className="px-3"
              >
                <item.icon aria-hidden />
                {item.label}
              </Button>
            ))}
          </div>
          <label className="block text-sm font-semibold">
            Гарчиг
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              minLength={3}
              maxLength={120}
              className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-3 text-base"
            />
          </label>
          <label className="block text-sm font-semibold">
            Дэлгэрэнгүй
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={10}
              maxLength={10000}
              rows={4}
              placeholder="Юу хийхэд ямар асуудал гарсан, эсвэл ямар саналтай байгаагаа бичээрэй."
              className="mt-1 w-full rounded-lg border border-line bg-panel p-3 text-base"
            />
          </label>
          <details className="rounded-xl border border-line">
            <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold">
              Хуудас, зураг хавсаргах (заавал биш)
            </summary>
            <div className="space-y-3 border-t border-line p-3">
              <label className="block text-sm">
                Асуудал гарсан хуудасны зам
                <input
                  value={contextPath}
                  onChange={(e) => setContextPath(e.target.value)}
                  maxLength={200}
                  pattern="/(?:[A-Za-z0-9_-]+/?)*"
                  placeholder="/app/learn"
                  className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel px-3 text-base"
                />
              </label>
              <p className="text-xs text-ink-dim">
                Нууц үг, нэвтрэх код, банкны мэдээлэл болон бусдын хувийн
                мэдээлэлтэй зураг бүү хавсаргаарай.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInput.current?.click()}
                disabled={files.length >= 3}
              >
                <ImagePlus aria-hidden />
                Зураг нэмэх
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  const added = Array.from(e.target.files ?? []);
                  if (files.length + added.length > 3)
                    setSendError("Хамгийн ихдээ 3 зураг хавсаргана.");
                  else setFiles((old) => [...old, ...added]);
                  e.target.value = "";
                }}
              />
              {!!files.length && (
                <ul className="space-y-2">
                  {files.map((file, i) => (
                    <li
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 break-all">
                        {file.name}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`${file.name}-ийг хасах`}
                        onClick={() =>
                          setFiles((old) =>
                            old.filter((_, index) => index !== i),
                          )
                        }
                      >
                        <X aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        </fieldset>
        {sendError && (
          <p
            role="alert"
            className="rounded-lg bg-error/10 p-3 text-sm text-error"
          >
            {sendError}
          </p>
        )}
        {success && (
          <p role="status" className="text-sm text-success">
            {success}
          </p>
        )}
        <Button type="submit" disabled={sending}>
          {sending ? "Илгээж байна…" : "Хүсэлт илгээх"}
        </Button>
      </form>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">Хүсэлтийн түүх</h2>
          {admin && (
            <Button
              variant="outline"
              disabled={sending || saving}
              onClick={() => {
                detailId.current = null;
                setDetailLoading(false);
                setDetailError("");
                setLoading(true);
                setLoadError("");
                setAll((value) => !value);
                setSelected(null);
              }}
            >
              {all ? "Зөвхөн миний хүсэлт" : "Бүх хүсэлтийг харах"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => reload()} disabled={loading}>
            Шинэчлэх
          </Button>
        </div>
        {loading && <LoadingState rows={3} label="Хүсэлтүүд" />}
        {loadError && (
          <ErrorState message={loadError} onRetry={() => reload()} />
        )}
        {!loading && !loadError && !tickets.length && (
          <EmptyState
            title="Хүсэлт хараахан алга"
            hint="Дээрх маягтаар эхний санал, асуулт эсвэл алдааны мэдээллээ илгээнэ."
          />
        )}
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <button
                type="button"
                disabled={sending || saving}
                onClick={() => void detail(ticket.id)}
                className="min-h-11 w-full rounded-xl border border-line bg-surface p-4 text-left"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="break-words font-semibold">
                    {ticket.subject}
                  </span>
                  <span className="text-xs text-brand">
                    {STATE[ticket.state] ?? "Төлөв тодорхойгүй"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-dim">
                  {formatMnDate(ticket.createdAt, {
                    timeZone: "Asia/Ulaanbaatar",
                  })}
                  {all &&
                    ticket.author &&
                    ` — ${ticket.author.firstName} ${ticket.author.lastName}`}
                </p>
                {ticket.response && (
                  <p className="mt-2 text-xs text-success">Хариу ирсэн</p>
                )}
              </button>
            </li>
          ))}
        </ul>
        {hasMore && (
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => reload(tickets[tickets.length - 1]?.id)}
          >
            Өмнөх хүсэлтүүд
          </Button>
        )}
      </section>
      {detailLoading && <LoadingState rows={3} label="Хүсэлтийн дэлгэрэнгүй" />}
      {detailError && (
        <ErrorState
          message={detailError}
          onRetry={() => detailId.current && void detail(detailId.current)}
        />
      )}
      {selected && !detailLoading && (
        <section
          ref={detailPanel}
          tabIndex={-1}
          className="scroll-mt-24 space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6"
          aria-label="Хүсэлтийн дэлгэрэнгүй"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="break-words text-lg font-bold">
              {selected.subject}
            </h2>
            <Button
              size="icon"
              variant="ghost"
              aria-label="Дэлгэрэнгүйг хаах"
              onClick={() => setSelected(null)}
            >
              <X aria-hidden />
            </Button>
          </div>
          <p className="text-sm text-brand">{STATE[selected.state]}</p>
          <p className="whitespace-pre-wrap break-words text-sm">
            {selected.body}
          </p>
          {selected.contextPath && (
            <p className="text-xs text-ink-dim">
              Хуудас: {selected.contextPath}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {selected.attachmentKeys.map((key, i) => (
              <AttachmentPreview
                key={key}
                fileKey={key}
                label={`Хүсэлтийн хавсралт ${i + 1}`}
              />
            ))}
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <h3 className="font-semibold">Ажилтны хариу</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-dim">
              {selected.response || "Хариу хараахан ирээгүй байна."}
            </p>
          </div>
          {admin && (
            <div className="space-y-3 border-t border-line pt-4">
              <h3 className="font-semibold">Хүсэлт шийдвэрлэх</h3>
              <label className="block text-sm">
                Төлөв
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={saving}
                  className="ml-2 min-h-11 rounded-lg border border-line bg-panel px-3"
                >
                  {Object.entries(STATE).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Хэрэглэгчид харагдах хариу
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  disabled={saving}
                  maxLength={10000}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-line bg-panel p-3 text-base"
                />
              </label>
              {reviewError && (
                <p role="alert" className="text-sm text-error">
                  {reviewError}
                </p>
              )}
              <Button onClick={() => void triage()} disabled={saving}>
                {saving ? "Хадгалж байна…" : "Хариу, төлөв хадгалах"}
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
