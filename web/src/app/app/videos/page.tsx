"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getRole } from "@/lib/api";

/* ============================================================================
 * Онлайн хичээл — бичлэг үзэх хуудас (Videos MVP).
 *
 * - Сурагч/бүх хэрэглэгч: ном → сэдэв сонгоод бичлэгээ үзнэ (YouTube-aware:
 *   YouTube холбоосыг iframe embed болгож, бусдыг шууд <video>-ээр тоглуулна)
 * - Багш/Багш+/Админ: дээр нь "Бичлэг нэмэх" жижиг форм харагдана
 * ========================================================================== */

interface ChapterOpt {
  id: string;
  title: string;
  book?: { code: string; title: string } | null;
  _count?: { videos: number };
}
interface Video {
  id: string;
  title: string;
  s3Key: string;
  duration?: number | null;
  createdAt: string;
}
interface Chapter {
  id: string;
  title: string;
  book?: { code: string; title: string } | null;
}

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
  } catch {
    /* буруу URL — доор нь шууд video tag-аар оролдоно */
  }
  return null;
}

function VideoPlayer({ video }: { video: Video }) {
  const embed = youtubeEmbedUrl(video.s3Key);
  return (
    <div className="overflow-hidden rounded-xl border border-white/8 bg-black">
      <div className="aspect-video w-full">
        {embed ? (
          <iframe
            src={embed}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video controls src={video.s3Key} className="h-full w-full" />
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold">{video.title}</p>
        {video.duration ? (
          <p className="text-xs text-ink-dim">
            {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function VideosPage() {
  const role = typeof window !== "undefined" ? getRole() : null;
  const canManage = role === "ADMIN" || role === "TEACHER" || role === "TEACHER_PLUS";

  const [chaptersWithVideos, setChaptersWithVideos] = useState<ChapterOpt[]>([]);
  const [activeChapter, setActiveChapter] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState("");

  // Багшийн "Бичлэг нэмэх" формд зориулсан бүх сэдвийн жагсаалт
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [form, setForm] = useState({ chapterId: "", title: "", url: "" });
  const [msg, setMsg] = useState("");

  function loadChaptersWithVideos() {
    api<ChapterOpt[]>("/videos/chapters")
      .then((rows) => {
        setChaptersWithVideos(rows);
        setActiveChapter((cur) => cur || rows[0]?.id || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Алдаа"));
  }
  useEffect(loadChaptersWithVideos, []);

  useEffect(() => {
    if (canManage) {
      api<Chapter[]>("/chapters?take=500")
        .then(setAllChapters)
        .catch(() => {});
    }
  }, [canManage]);

  useEffect(() => {
    if (!activeChapter) {
      setVideos([]);
      return;
    }
    api<Video[]>(`/videos?chapterId=${activeChapter}`)
      .then(setVideos)
      .catch(() => setVideos([]));
  }, [activeChapter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChapterOpt[]>();
    for (const c of chaptersWithVideos) {
      const key = c.book?.code ?? "Бусад";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()];
  }, [chaptersWithVideos]);

  async function addVideo() {
    setMsg("");
    if (!form.chapterId || !form.title.trim() || !form.url.trim()) {
      setMsg("Сэдэв, нэр, холбоосоо бөглөнө үү");
      return;
    }
    try {
      await api("/videos", { method: "POST", body: form });
      setMsg("✓ Бичлэг нэмэгдлээ");
      setForm({ chapterId: form.chapterId, title: "", url: "" });
      loadChaptersWithVideos();
      if (form.chapterId === activeChapter) {
        api<Video[]>(`/videos?chapterId=${activeChapter}`).then(setVideos);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Онлайн хичээл</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Сэдвээ сонгоод онолын бичлэгээ үзнэ.
        </p>
      </div>

      {canManage && (
        <section className="rounded-2xl border border-brand-bright/25 bg-brand-bright/5 p-5">
          <h2 className="mb-3 font-bold text-brand-soft">Бичлэг нэмэх</h2>
          <div className="flex flex-wrap gap-2">
            <select
              value={form.chapterId}
              onChange={(e) => setForm({ ...form, chapterId: e.target.value })}
              className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm outline-none focus:border-brand-bright"
            >
              <option value="">Сэдэв сонгох…</option>
              {allChapters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.book?.code ? `[${c.book.code}] ` : ""}
                  {c.title}
                </option>
              ))}
            </select>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Бичлэгийн нэр"
              className="min-w-[160px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
            />
            <input
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="YouTube эсвэл видео холбоос (URL)"
              className="min-w-[220px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
            />
            <button
              onClick={addVideo}
              className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
            >
              Нэмэх
            </button>
          </div>
          {msg && <p className="mt-2 text-sm text-teal-300">{msg}</p>}
        </section>
      )}

      {error && (
        <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {chaptersWithVideos.length === 0 && !error && (
        <p className="rounded-2xl border border-white/8 bg-[#0b142e] p-6 text-center text-sm text-ink-dim">
          Одоогоор бичлэг оруулаагүй байна.
        </p>
      )}

      {chaptersWithVideos.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            {grouped.map(([bookCode, chapters]) => (
              <div key={bookCode}>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-dim">
                  {bookCode}
                </p>
                <div className="space-y-1">
                  {chapters.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveChapter(c.id)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        activeChapter === c.id
                          ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                          : "border-white/8 text-ink-dim hover:border-white/25"
                      }`}
                    >
                      {c.title}
                      <span className="ml-1.5 text-xs opacity-70">
                        ({c._count?.videos ?? 0})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <section className="grid gap-4 sm:grid-cols-2">
            {videos.length === 0 && (
              <p className="text-sm text-ink-dim">Энэ сэдэвт бичлэг алга</p>
            )}
            {videos.map((v) => (
              <VideoPlayer key={v.id} video={v} />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
