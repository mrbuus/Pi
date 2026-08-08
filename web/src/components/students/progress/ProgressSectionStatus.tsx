"use client";

import { LoadingState, ErrorState } from "@/components/ui/StateBlock";

// Сурагчийн явцын хуудасны хэсгүүдэд ХАМТ ашиглагдах ачаалж
// байна/алдаа/хоосон төлвүүд — StateBlock компонентаар орлуулагдсан.

export function SectionLoading({ label }: { label: string }) {
  return <LoadingState rows={3} label={label} />;
}

export function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return <ErrorState message={message} onRetry={onRetry} />;
}

export function SectionEmpty({ text }: { text: string }) {
  return <p className="text-sm text-ink-dim">{text}</p>;
}
