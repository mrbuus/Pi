// online багц дотор ашиглах формат хэрэгслүүд — бусад feature-ийн
// dependency болгохгүйн тулд тусад нь.

export function formatDate(d?: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(d));
}

export function formatDateTime(d?: string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(d));
}

// "3 өдрийн өмнө", "Дөнгөж сая" гэх мэт харьцангуй хугацаа — сүүлд идэвхтэй
// байсан огноог шууд огноогоор бус, ойлгомжтой хэлбэрээр харуулахад хэрэгтэй.
export function formatRelative(d?: string | null): string {
  if (!d) return "Хэзээ ч идэвхжиж байгаагүй";
  const now = Date.now();
  const then = new Date(d).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Дөнгөж сая";
  if (diffMin < 60) return `${diffMin} минутын өмнө`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} цагийн өмнө`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} өдрийн өмнө`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} сарын өмнө`;
  return formatDate(d);
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.lastName} ${p.firstName}`.trim();
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Тодорхойгүй алдаа гарлаа";
}
