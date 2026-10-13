"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock,
  ImagePlus,
  Loader2,
  PenLine,
  Send,
  X,
} from "lucide-react";
import LogoMark from "@/components/LogoMark";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { Badge } from "@/components/ui/kit/badge";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, ApiError } from "@/lib/api";
import {
  CHOICE_KEYS,
  isAnswered,
  shrinkImage,
  type Answers,
  type Photos,
  type PlacementProblem,
  type PlacementTestPublic,
} from "./types";

// Түвшин тогтоох шалгалт (нийтэд нээлттэй). Нэвтрэлтгүй — зочны эрх нь
// start-аас авсан нууц түлхүүр, хөтөчид хадгална (хуудас хаагдвал үргэлжилнэ).

const STORE = "placement-attempt-v1";
interface Saved { id: string; secret: string; deadline: number }
const load = (): Saved | null => {
  try { return JSON.parse(localStorage.getItem(STORE) ?? "null"); } catch { return null; }
};
const save = (s: Saved | null) => {
  try { if (s) localStorage.setItem(STORE, JSON.stringify(s)); else localStorage.removeItem(STORE); } catch { /* хувийн цонх */ }
};
const msg = (e: unknown) => (e instanceof Error ? e.message : "Алдаа гарлаа");
const mmss = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

type Phase = "loading" | "intro" | "test" | "done" | "error";

const HOW = [
  { icon: PenLine, t: "Цаасан дээр бод", d: "Бодлого бүрийн бодолтыг дэвтэр эсвэл цаасан дээр бүтэн бич" },
  { icon: Camera, t: "Зургийг нь ав", d: "Утасныхаа камераар бодолтоо тод, бүтнээр нь зураг ав" },
  { icon: ImagePlus, t: "Бодлогын доор оруул", d: "Тухайн бодлогын доорх «Бодолтын зураг» товчийг дарж зургаа сонго" },
];

export default function PlacementClient() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [test, setTest] = useState<PlacementTestPublic | null>(null);
  const [attempt, setAttempt] = useState<Saved | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [photos, setPhotos] = useState<Photos>({});
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(() => Date.now());
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [doneInfo, setDoneInfo] = useState<{ auto: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const dirty = useRef(false);

  // Эхлэх: хадгалсан шалгалт байвал үргэлжлүүлнэ
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = load();
        if (saved) {
          try {
            const r = await api<{ test: PlacementTestPublic; answers: Answers; photos: Photos; submittedAt: string | null; deadlineAt: string }>(
              `/placement/${encodeURIComponent(saved.id)}/resume`, { method: "POST", body: { secret: saved.secret }, auth: false });
            if (!alive) return;
            setTest(r.test);
            if (r.submittedAt) { save(null); setDoneInfo({ auto: false }); setPhase("done"); return; }
            const deadline = Math.min(saved.deadline, new Date(r.deadlineAt).getTime());
            setAttempt({ ...saved, deadline });
            setAnswers(r.answers ?? {});
            setPhotos(r.photos ?? {});
            setPhase("test");
            return;
          } catch (e) {
            if (e instanceof ApiError && [403, 404, 410].includes(e.status)) save(null);
            else throw e;
          }
        }
        const t = await api<PlacementTestPublic>("/placement/test", { auth: false });
        if (!alive) return;
        setTest(t);
        setPhase("intro");
      } catch {
        if (alive) setPhase("error");
      }
    })();
    return () => { alive = false; };
  }, [retry]);


  // Хариуг автоматаар хадгална
  useEffect(() => {
    if (phase !== "test" || !attempt || !dirty.current) return;
    const id = setTimeout(() => {
      dirty.current = false;
      api(`/placement/${encodeURIComponent(attempt.id)}/answers`, { method: "PUT", body: { secret: attempt.secret, answers }, auth: false })
        .catch(() => { dirty.current = true; });
    }, 700);
    return () => clearTimeout(id);
  }, [answers, attempt, phase]);

  const setAnswer = (n: number, v: string | Record<string, string>) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [String(n)]: v }));
  };

  const submit = useCallback(async (auto: boolean) => {
    if (!attempt || sending) return;
    setSending(true);
    try {
      await api(`/placement/${encodeURIComponent(attempt.id)}/submit`, { method: "POST", body: { secret: attempt.secret, answers, auto }, auth: false });
      save(null);
      setDoneInfo({ auto });
      setPhase("done");
      window.scrollTo({ top: 0 });
    } catch (e) {
      if (e instanceof ApiError && e.status === 410) { save(null); setDoneInfo({ auto: true }); setPhase("done"); }
      else toast.error(msg(e));
    } finally {
      setSending(false);
      setConfirm(false);
    }
  }, [attempt, answers, sending]);

  const left = attempt ? attempt.deadline - now : 0;
  // Цаг; хугацаа дуусахад автоматаар илгээнэ
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; });
  useEffect(() => {
    if (phase !== "test" || !attempt) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t >= attempt.deadline) void submitRef.current(true);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, attempt]);

  const addPhoto = async (p: PlacementProblem, files: FileList | null) => {
    if (!attempt || !files?.length) return;
    const n = String(p.n);
    setUploading((u) => ({ ...u, [n]: true }));
    try {
      for (const file of Array.from(files).slice(0, 3)) {
        const blob = await shrinkImage(file);
        const form = new FormData();
        form.append("secret", attempt.secret);
        form.append("problem", n);
        form.append("file", blob, blob === file ? file.name : "bodolt.jpg");
        const r = await api<{ key: string; photos: Photos }>(`/placement/${encodeURIComponent(attempt.id)}/photos`, { method: "POST", body: form, auth: false });
        setPhotos(r.photos);
        setPreviews((pv) => ({ ...pv, [r.key]: URL.createObjectURL(blob) }));
      }
    } catch (e) {
      toast.error(msg(e));
    } finally {
      setUploading((u) => ({ ...u, [n]: false }));
    }
  };

  const removePhoto = async (key: string) => {
    if (!attempt) return;
    try {
      const r = await api<{ photos: Photos }>(`/placement/${encodeURIComponent(attempt.id)}/photos/${encodeURIComponent(key)}`, { method: "DELETE", body: { secret: attempt.secret }, auth: false });
      setPhotos(r.photos);
    } catch (e) {
      toast.error(msg(e));
    }
  };

  const stats = useMemo(() => {
    const ps = test?.problems ?? [];
    return {
      total: ps.length,
      answered: ps.filter((p) => isAnswered(p, answers)).length,
      withPhoto: ps.filter((p) => (photos[String(p.n)] ?? []).length > 0).length,
      noPhoto: ps.filter((p) => !(photos[String(p.n)] ?? []).length).map((p) => p.n),
    };
  }, [test, answers, photos]);

  if (phase === "loading") return <Shell><LoadingState rows={6} /></Shell>;
  if (phase === "error" || !test)
    return <Shell><ErrorState message="Шалгалтыг ачаалж чадсангүй, интернэтээ шалгаад дахин оролдоно уу" onRetry={() => { setPhase("loading"); setRetry((r) => r + 1); }} /></Shell>;

  if (phase === "done")
    return (
      <Shell>
        <div className="chunky space-y-4 p-6 text-center sm:p-10">
          <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden />
          <h1 className="cyrillic-heading text-2xl font-extrabold">Шалгалт илгээгдлээ</h1>
          <p className="mx-auto max-w-md text-ink-dim">
            {doneInfo?.auto ? "Хугацаа дууссан тул шалгалт автоматаар илгээгдсэн" : "Баярлалаа, хичээнгүйлэн бодсонд"}
            <br />Багш бодолтыг чинь үзээд түвшинг тогтоож, бүртгүүлсэн утсаар чинь холбогдоно
          </p>
          <Button asChild variant="outline"><Link href="/">Нүүр хуудас руу буцах</Link></Button>
        </div>
      </Shell>
    );

  if (phase === "intro") return <Intro test={test} onStarted={(s, t) => { save(s); setAttempt(s); setTest(t); setAnswers({}); setPhotos({}); setNow(Date.now()); setPhase("test"); window.scrollTo({ top: 0 }); }} />;

  const low = left < 5 * 60_000;
  return (
    <div className="min-h-screen bg-bg pb-28 text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${low ? "bg-error/12 text-error" : "bg-brand-bright/12 text-brand-soft"}`} aria-live={low ? "polite" : "off"}>
            <Clock className="h-4 w-4" aria-hidden />{mmss(left)}
          </span>
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 text-xs">
            <Badge tone="brand">Хариу {stats.answered}/{stats.total}</Badge>
            <Badge tone={stats.withPhoto === stats.total ? "success" : "warning"}>Зураг {stats.withPhoto}/{stats.total}</Badge>
          </div>
          <Button size="sm" onClick={() => setConfirm(true)} disabled={sending}><Send aria-hidden />Илгээх</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 pt-5">
        <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/8 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          <p>Бодлого бүрийн бодолтыг цаасан дээр бодоод зургийг нь тухайн бодлогын доор оруул<br />Бодолтын зураггүй бодлогыг чадаагүй гэж үзнэ</p>
        </div>
        {test.problems.map((p) => (
          <ProblemCard key={p.n} p={p} answer={answers[String(p.n)]} onAnswer={(v) => setAnswer(p.n, v)}
            photos={photos[String(p.n)] ?? []} previews={previews} uploading={!!uploading[String(p.n)]}
            onAdd={(f) => addPhoto(p, f)} onRemove={removePhoto} />
        ))}
        <Button className="w-full" size="lg" onClick={() => setConfirm(true)} disabled={sending}><Send aria-hidden />Шалгалтаа илгээх</Button>
      </main>

      {confirm && (
        <ConfirmDialog missing={stats.noPhoto} unanswered={stats.total - stats.answered} sending={sending}
          onCancel={() => setConfirm(false)} onConfirm={() => submit(false)} />
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:py-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2" aria-label="Нүүр хуудас">
          <LogoMark size={36} /><span className="text-sm font-bold">Шинэ Ирээдүйн Эзэд</span>
        </Link>
        {children}
      </main>
    </div>
  );
}

function Intro({ test, onStarted }: { test: PlacementTestPublic; onStarted: (s: Saved, t: PlacementTestPublic) => void }) {
  const [f, setF] = useState({ name: "", phone: "", grade: "", school: "", parentPhone: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const rules = test.instructions.split("\n").map((s) => s.trim()).filter(Boolean);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (f.name.trim().length < 2) return setErr("Нэрээ бүтэн бичнэ үү");
    if (!/^[0-9]{8}$/.test(f.phone.replace(/\s+/g, ""))) return setErr("Утасны дугаар 8 оронтой байх ёстой");
    if (!f.grade) return setErr("Ангиа сонгоно уу");
    setBusy(true);
    try {
      const r = await api<{ id: string; secret: string; deadlineAt: string; test: PlacementTestPublic }>("/placement/start", {
        method: "POST", auth: false,
        body: { name: f.name, phone: f.phone, grade: Number(f.grade), school: f.school || undefined, parentPhone: f.parentPhone || undefined },
      });
      onStarted({ id: r.id, secret: r.secret, deadline: Date.now() + r.test.minutes * 60_000 }, r.test);
    } catch (e2) {
      setErr(msg(e2));
    } finally {
      setBusy(false);
    }
  };

  const input = "min-h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60";
  return (
    <Shell>
      <section className="space-y-2">
        <h1 className="cyrillic-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Түвшин тогтоох шалгалт</h1>
        <p className="text-ink-dim">{test.problems.length} бодлого, {test.minutes} минут<br />Багш бодолтыг чинь үзээд аль ангид тохирохыг хэлж өгнө</p>
      </section>

      <section aria-labelledby="how" className="chunky space-y-4 p-5">
        <h2 id="how" className="text-lg font-bold">Бодолтоо хэрхэн илгээх вэ</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {HOW.map(({ icon: Icon, t, d }, i) => (
            <li key={t} className="flex gap-3 rounded-2xl bg-bg p-4 sm:flex-col">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-bright/12 text-brand-soft">
                <Icon className="h-5 w-5" aria-hidden />
                <span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-bright text-[11px] font-bold text-on-brand">{i + 1}</span>
              </span>
              <span><span className="block font-semibold">{t}</span><span className="text-sm text-ink-dim">{d}</span></span>
            </li>
          ))}
        </ol>
        {rules.length > 0 && (
          <ul className="space-y-2 border-t border-line pt-4 text-sm">
            {rules.map((r) => {
              const warn = /чадаагүй/.test(r);
              return (
                <li key={r} className={`flex gap-2 ${warn ? "font-semibold text-warning" : ""}`}>
                  {warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />}
                  {r}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={start} className="chunky space-y-4 p-5" noValidate>
        <h2 className="text-lg font-bold">Мэдээллээ бөглө</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2"><span className="text-sm font-semibold">Овог нэр</span>
            <input className={input} value={f.name} onChange={set("name")} autoComplete="name" required maxLength={100} placeholder="Б. Тэмүүжин" /></label>
          <label className="space-y-1.5"><span className="text-sm font-semibold">Утасны дугаар</span>
            <input className={input} value={f.phone} onChange={set("phone")} inputMode="numeric" autoComplete="tel" required maxLength={9} placeholder="99112233" /></label>
          <label className="space-y-1.5"><span className="text-sm font-semibold">Анги</span>
            <select className={input} value={f.grade} onChange={set("grade")} required>
              <option value="">Сонгох</option>
              {[12, 11, 10, 9, 8, 7, 6].map((g) => <option key={g} value={g}>{g}-р анги</option>)}
            </select></label>
          <label className="space-y-1.5"><span className="text-sm font-semibold">Сургууль <span className="font-normal text-ink-dim">заавал биш</span></span>
            <input className={input} value={f.school} onChange={set("school")} maxLength={120} placeholder="33-р сургууль" /></label>
          <label className="space-y-1.5"><span className="text-sm font-semibold">Эцэг эхийн утас <span className="font-normal text-ink-dim">заавал биш</span></span>
            <input className={input} value={f.parentPhone} onChange={set("parentPhone")} inputMode="numeric" maxLength={9} placeholder="88112233" /></label>
        </div>
        {err && <p role="alert" className="text-sm font-semibold text-error">{err}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Clock aria-hidden />}Шалгалт эхлэх, {test.minutes} минут
        </Button>
        <p className="text-center text-xs text-ink-dim">Эхэлмэгц цаг явж эхэлнэ<br />Хуудас санамсаргүй хаагдвал энэ хөтчөөр дахин нээгээд үргэлжлүүлнэ</p>
      </form>
    </Shell>
  );
}

function ProblemCard({ p, answer, onAnswer, photos, previews, uploading, onAdd, onRemove }: {
  p: PlacementProblem; answer: Answers[string] | undefined; onAnswer: (v: string | Record<string, string>) => void;
  photos: string[]; previews: Record<string, string>; uploading: boolean;
  onAdd: (f: FileList | null) => void; onRemove: (key: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const boxes = (answer && typeof answer === "object" ? answer : {}) as Record<string, string>;
  return (
    <article className="chunky space-y-4 p-4 sm:p-5" aria-labelledby={`p${p.n}`}>
      <div className="flex items-start gap-3">
        <span id={`p${p.n}`} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-bright text-sm font-bold text-on-brand">{p.n}</span>
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden pt-1 pb-1 text-[17px] leading-relaxed"><MathText>{p.statement}</MathText></div>
      </div>

      {p.kind === "choice" ? (
        <div role="radiogroup" aria-label={`${p.n}-р бодлогын хариу`} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {CHOICE_KEYS.filter((k) => p.choices?.[k]).map((k) => {
            const on = answer === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onAnswer(k)}
                className={`flex min-h-12 items-center gap-2 rounded-xl border px-3 py-2 text-left transition ${on ? "border-brand-bright bg-brand-bright/12 text-brand-soft" : "border-line bg-surface hover:border-brand-bright/50"}`}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-bold ${on ? "bg-brand-bright text-on-brand" : "bg-bg text-ink-dim"}`}>{k}</span>
                <span className="min-w-0 text-[16px] leading-normal"><MathText>{p.choices?.[k] ?? ""}</MathText></span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {(p.boxes ?? []).map((b) => (
            <label key={b.key} className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-ink-dim">[{b.key}]</span>
              <input inputMode="numeric" maxLength={b.digits + 1} value={boxes[b.key] ?? ""}
                onChange={(e) => onAnswer({ ...boxes, [b.key]: e.target.value.replace(/[^0-9-]/g, "") })}
                className="min-h-12 rounded-xl border border-line bg-surface text-center font-mono text-lg outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60"
                style={{ width: `${2.6 + b.digits * 0.9}rem` }} aria-label={`[${b.key}] нүд`} />
            </label>
          ))}
        </div>
      )}

      <div className={`space-y-3 rounded-2xl border border-dashed p-3 ${photos.length ? "border-success/50 bg-success/5" : "border-warning/50 bg-warning/5"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || photos.length >= 3}>
            {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <Camera aria-hidden />}Бодолтын зураг
          </Button>
          <span className={`text-sm ${photos.length ? "text-success" : "text-warning"}`}>
            {photos.length ? `${photos.length} зураг орсон` : "Зураг оруулаагүй бол чадаагүй гэж үзнэ"}
          </span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1}
            onChange={(e) => { onAdd(e.target.files); e.target.value = ""; }} />
        </div>
        {photos.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {photos.map((k, i) => (
              <li key={k} className="relative">
                {previews[k]
                  // eslint-disable-next-line @next/next/no-img-element -- хөтөч доторх blob: зураг, next/image хэрэггүй
                  ? <img src={previews[k]} alt={`${p.n}-р бодлогын бодолт ${i + 1}`} className="h-24 w-24 rounded-xl border border-line object-cover" />
                  : <span className="grid h-24 w-24 place-items-center rounded-xl border border-line bg-surface text-xs text-ink-dim">Зураг {i + 1}</span>}
                <button type="button" onClick={() => onRemove(k)} aria-label={`${i + 1}-р зургийг устгах`}
                  className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface text-ink shadow">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

function ConfirmDialog({ missing, unanswered, sending, onCancel, onConfirm }: {
  missing: number[]; unanswered: number; sending: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/40 p-3 sm:place-items-center" onClick={onCancel}>
      <div role="dialog" aria-modal="true" aria-labelledby="send-title" className="w-full max-w-md space-y-4 rounded-2xl bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="send-title" className="text-lg font-bold">Шалгалтаа илгээх үү</h2>
        {missing.length > 0 ? (
          <p className="flex gap-2 rounded-xl bg-warning/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
            <span>{missing.join(", ")}-р бодлогод бодолтын зураг алга, эдгээрийг чадаагүй гэж үзнэ</span>
          </p>
        ) : (
          <p className="text-sm text-ink-dim">Бүх бодлогод бодолтын зураг орсон байна</p>
        )}
        {unanswered > 0 && <p className="text-sm text-ink-dim">{unanswered} бодлогод хариу сонгоогүй байна</p>}
        <p className="text-sm text-ink-dim">Илгээсний дараа засах боломжгүй</p>
        <div className="flex gap-2">
          <Button ref={first} variant="outline" className="flex-1" onClick={onCancel}>Үргэлжлүүлэн бодох</Button>
          <Button className="flex-1" onClick={onConfirm} disabled={sending}>{sending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}Илгээх</Button>
        </div>
      </div>
    </div>
  );
}
