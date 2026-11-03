/**
 * Хэрэглээний бүртгэлд агуулга орохоос сэргийлэх цэвэрлэгээ. Клиент аль хэдийн
 * цэвэрлэдэг ч серверт ДАХИН хийнэ — клиентэд найдвал хуучин/өөрчилсөн хувилбар
 * нэр, ID бичиж мэднэ.
 */

// cuid (c + 24), uuid, тоо, огноо, тоо агуулсан урт токеныг ID гэж үзнэ (тоогүй урт
// slug — «homework-practice» гэх мэт — хэвээр).
const ID_SEGMENT =
  /^(c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f-]{27,}|\d+|(?=[A-Za-z_-]*\d)[A-Za-z0-9_-]{16,}|lt[a-z]+_[a-z0-9_]+|\d{4}-\d{2}-\d{2})$/;

export function normalizePath(raw: string): string | null {
  const path = raw.split(/[?#]/)[0].trim();
  if (!path.startsWith('/')) return null;
  const segments = path
    .split('/')
    .filter(Boolean)
    .slice(0, 8)
    .map((s) => {
      let seg = s;
      try {
        seg = decodeURIComponent(s);
      } catch {
        /* эвдэрхий кодчилол — байгаагаар нь */
      }
      return ID_SEGMENT.test(seg) ? ':id' : seg.slice(0, 40);
    });
  return `/${segments.join('/')}`.slice(0, 160);
}

// Товчны түлхүүр: «төрөл:утга». Төрөл тогтсон жагсаалтаас, утга нь богино бичвэр
// (data-track нь кодонд бичигдсэн тогтмол тул нэр агуулахгүй) эсвэл зам.
const TARGET_KINDS = new Set(['track', 'link', 'icon']);
const SAFE_VALUE = /^[\p{L}\p{N} _.\-/:«»+]{1,60}$/u;

export function normalizeTarget(raw: string | undefined): string | null {
  if (!raw) return null;
  const idx = raw.indexOf(':');
  if (idx <= 0) return null;
  const kind = raw.slice(0, idx);
  const value = raw.slice(idx + 1).trim();
  if (!TARGET_KINDS.has(kind)) return null;
  if (kind === 'link') {
    const p = normalizePath(value);
    return p ? `link:${p}` : null;
  }
  return SAFE_VALUE.test(value) ? `${kind}:${value}` : null;
}
