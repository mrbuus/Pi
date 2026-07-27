const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pi_token");
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("pi_role");
}

export function setAuth(token: string, role: string) {
  localStorage.setItem("pi_token", token);
  localStorage.setItem("pi_role", role);
}

export function clearAuth() {
  localStorage.removeItem("pi_token");
  localStorage.removeItem("pi_role");
}

/**
 * ⏰ RENDER-ИЙН "СЭРЭХ" АСУУДАЛ.
 *
 * Render-ийн үнэгүй багц ~15 минут идэвхгүй байвал сервисээ УНТРААДАГ. Дараа нь
 * ирсэн ЭХНИЙ хүсэлт серверийг сэрээх хугацааг (ихэвчлэн 30–60 секунд) бүтнээр нь
 * хүлээдэг. Өмнө нь fetch дээр ямар ч timeout байгаагүй тул хэрэглэгч тодорхойгүй
 * удаан өлгөгдөөд эцэст нь "ачаалж чадсангүй" маягийн алдаа хардаг байв.
 *
 * Хамгийн зальтай нь: хөгжүүлэгчийн машин дээр сервер аль хэдийн сэрсэн байдаг тул
 * асуудал ХАРАГДДАГГҮЙ — зөвхөн өөр компьютер дээр, эсвэл удаан ашиглаагүй үед л
 * илэрдэг. Сонгодог "миний машин дээр ажиллаж байна" тохиолдол.
 *
 * Шийдэл: эхний оролдлогод богино (12с) timeout тавина. Хэрэв сүлжээний түвшинд
 * унавал — сервер унтарсан байх магадлалтай гэж үзээд НЭГ удаа урт (60с) timeout-той
 * дахин оролдоно. Эхний хүсэлт нь ихэвчлэн серверийг сэрээчихсэн байдаг тул хоёр дахь
 * нь амжилттай болдог.
 *
 * ⚠️ Энэ бол зөвхөн зөөлрүүлэлт. Жинхэнэ засвар нь Render-ийн ТӨЛБӨРТЭЙ багц
 * (DEPLOY.md-ийг үз) — тэнд сервис унтардаггүй.
 */
const FIRST_TRY_TIMEOUT_MS = 12_000;
const WAKE_TRY_TIMEOUT_MS = 60_000;

async function fetchWithWakeRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FIRST_TRY_TIMEOUT_MS),
    });
  } catch {
    // Сүлжээний алдаа/timeout — сервер унтсан байж болзошгүй тул урт хүлээлттэйгээр
    // ганц удаа дахин оролдоно.
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(WAKE_TRY_TIMEOUT_MS),
      });
    } catch {
      throw new Error(
        "Сервер хариу өгсөнгүй. Сервер удаан идэвхгүй байсан бол сэрэхэд " +
          "1 минут хүртэл хугацаа шаардагдана — хуудсаа шинэчилж дахин оролдоно уу.",
      );
    }
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  let res: Response;
  try {
    res = await fetchWithWakeRetry(`${API_URL}${path}`, init);
  } catch (e) {
    // fetch эсэргүүцвэл (сүлжээгүй, сервер унтарсан гэх мэт) англи "Failed to
    // fetch" гараад ирдэг байсныг монгол, ойлгомжтой мессежээр сольсон.
    throw new Error(
      e instanceof Error && e.message
        ? e.message
        : "Сүлжээний алдаа — интернэт холболтоо шалгаад дахин оролдоно уу.",
    );
  }
  const data = (await res.json().catch(() => null)) as T & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join(", ")
      : (data?.message ?? `Алдаа ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

// Файл (жишээ нь профайл зураг) сервер рүү явуулж key-г нь буцаана.
// api()-аас тусдаа — FormData-д Content-Type-ийг браузер өөрөө тохируулна.
export async function uploadFile(
  file: File,
): Promise<{ key: string; size: number; mime: string }> {
  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers,
    body: form,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.message ?? `Байршуулах алдаа ${res.status}`);
  }
  return data;
}

// Хадгалсан файлын key-гээс шууд харах URL үүсгэнэ (профайл зураг, imageKey гэх мэт)
export function fileUrl(key?: string | null): string | undefined {
  if (!key) return undefined;
  return `${API_URL}/files/${key}`;
}

export function homeForRole(role: string): string {
  if (role === "ADMIN") return "/app/admin";
  if (role === "TEACHER" || role === "TEACHER_PLUS") return "/app/teacher";
  if (role === "STUDENT") return "/app/student";
  if (role === "PARENT") return "/app/parent";
  return "/app/buyer";
}
