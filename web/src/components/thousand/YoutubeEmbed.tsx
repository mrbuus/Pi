"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";

/**
 * YouTube бодолтын бичлэг. Сүлжээ хэмнэх дүрмээр (STATUS §3.8) хуудас ачаалахад
 * юу ч татахгүй — сурагч дарсны дараа л youtube-nocookie iframe нээгдэнэ.
 */
export default function YoutubeEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-panel">
      {open ? (
        <div className="aspect-video w-full">
          <iframe
            src={`${embedUrl}?autoplay=1&playsinline=1&rel=0`}
            title={title}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-brand hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <PlayCircle className="h-5 w-5 shrink-0" aria-hidden />
          Бодолтын бичлэг үзэх
        </button>
      )}
    </div>
  );
}
