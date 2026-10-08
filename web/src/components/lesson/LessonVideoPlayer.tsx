"use client";
import { useState } from "react";
import { AlertTriangle, Play } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { youtubeId, allowedDirect } from "./media-source";
export interface LessonVideo {
  id: string;
  title: string;
  s3Key: string;
  duration?: number | null;
  media?: {
    kind: "YOUTUBE" | "DIRECT";
    url: string;
    embedUrl: string | null;
  } | null;
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = activeId === video.id,
    id = youtubeId(video.s3Key);
  const direct = !id && allowedDirect(video.s3Key);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="aspect-video min-h-[200px] w-full">
        {!id && !direct ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertTriangle aria-hidden />
            <p>Бичлэгийн эх сурвалжийг багш шалгах шаардлагатай.</p>
          </div>
        ) : !active ? (
          <div className="flex h-full items-center justify-center">
            <Button
              onClick={() => {
                setActiveId(video.id);
              }}
            >
              <Play aria-hidden /> Бичлэг нээх
            </Button>
          </div>
        ) : id ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=0&playsinline=1`}
            title={video.title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <video
            controls
            preload="none"
            onPlay={() => onStart?.()}
            src={video.s3Key}
            onEnded={() => onComplete?.()}
            className="h-full w-full"
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="text-sm font-semibold">{video.title}</p>
        {id && (
          <p className="text-xs text-ink-dim">
            YouTube нээгдэнэ. Unlisted холбоосыг мэдсэн хүн бусдад дамжуулж
            болно.
          </p>
        )}
      </div>
    </div>
  );
}
