"use client";

import MathText from "@/components/MathText";
import { fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Сонголтын агуулга: LaTeX текст ба/эсвэл зураг (график хариу).
 * Зурагтай сонголтын текст хоосон байж болно — тэр үед зөвхөн зураг.
 */
export default function ChoiceContent({
  text,
  image,
  className,
  imageClassName,
}: {
  text: string;
  image?: string | null;
  className?: string;
  imageClassName?: string;
}) {
  if (!image) return <MathText>{text}</MathText>;
  return (
    <span className={cn("flex flex-col items-start gap-2", className)}>
      {text.trim() && <MathText>{text}</MathText>}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fileUrl(image)}
        alt="Сонголтын зураг"
        loading="lazy"
        className={cn("max-h-56 w-auto max-w-full rounded-lg bg-white object-contain", imageClassName)}
      />
    </span>
  );
}
