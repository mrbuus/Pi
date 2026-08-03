"use client";

import { AlertTriangle } from "lucide-react";

/**
 * Хичээлийн алхам 2 (ВИДЕО)-д зориулсан аюулгүй видео embed.
 *
 * АЮУЛГҮЙ БАЙДАЛ: /app/videos хуудасны логиктой ижил зарчим (тэндхийн
 * VideoPlayer component экспортлогдоогүй тул энд зориудаар давхардуулсан —
 * тухайн хуудас энэ ажлын хамрах хүрээнд биш тул засаагүй). Багш (эсвэл
 * эвдэрсэн багш аккаунт) дурын URL оруулбал шууд <video src> болгон ямар ч
 * гуравдагч этгээдийн сервер рүү сурагчийг чиглүүлэх эрсдэлтэй тул зөвхөн
 * YouTube embed, эсвэл мэдэгдэж буй найдвартай хостоос (API-гийн files/
 * uploads зам) ирсэн URL-ыг шууд тоглуулна. Бусад бол "дэмжигдэхгүй холбоос"
 * гэсэн аюулгүй төлөвийг үзүүлнэ.
 */

const ALLOWED_VIDEO_HOSTS = [
  ...(() => {
    try {
      return [
        new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api")
          .hostname,
      ];
    } catch {
      return [];
    }
  })(),
  "localhost",
];

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
    /* буруу URL — доор нь хост шалгаж үзнэ */
  }
  return null;
}

function isAllowedDirectVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_VIDEO_HOSTS.some(
      (host) => u.hostname === host || u.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export interface LessonVideo {
  id: string;
  title: string;
  s3Key: string;
  duration?: number | null;
}

export default function LessonVideoPlayer({
  video,
  onStart,
  onComplete,
}: {
  video: LessonVideo;
  onStart?: () => void;
  onComplete?: () => void;
}) {
  const embed = youtubeEmbedUrl(video.s3Key);
  const directAllowed = !embed && isAllowedDirectVideoUrl(video.s3Key);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-brand-navy">
      <div className="aspect-video w-full">
        {embed ? (
          <iframe
            src={embed}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={() => onStart?.()}
            className="h-full w-full"
          />
        ) : directAllowed ? (
          <video
            controls
            src={video.s3Key}
            onPlay={() => onStart?.()}
            onEnded={() => onComplete?.()}
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 px-4 text-center text-brand-soft">
            <AlertTriangle className="h-8 w-8" aria-hidden="true" />
            <p className="text-sm font-semibold">Дэмжигдэхгүй холбоос</p>
            <p className="text-xs text-brand-soft/80">
              Энэ бичлэгийн эх сурвалж танигдаагүй тул аюулгүй байдлын үүднээс
              шууд ачаалахгүй.
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="text-sm font-semibold">{video.title}</p>
        {video.duration ? (
          <p className="shrink-0 text-xs text-ink-dim">
            {Math.floor(video.duration / 60)}:
            {String(video.duration % 60).padStart(2, "0")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
