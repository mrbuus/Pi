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
 * ⏰ RENDER-ИЙН "СЭРЭХ" АСУУДАЛ + JITTER.
 *
 * Render-ийн үнэгүй багц ~15 минут идэвхгүй байвал сервисээ УНТРААДАГ. Дараа нь
 * ирсэн ЭХНИЙ хүсэлт серверийг сэрээх хугацааг (ихэвчлэн 30–60 секунд) бүтнээр нь
 * хүлээдэг.
 *
 * 2000 ХЭРЭГЛЭГЧ АСУУДАЛ: 2000 хэрэглэгч нэг зэрэг ирвэл БҮГД ижил мөчид timeout
 * болж, БҮГД дахин оролдоно → 60с timeout-той 2000 хүсэлт < 100мс дотор цохилно
 * → холболтын нөөц шууд дуусна.
 *
 * ЗАСВАР: дахин оролдохын өмнө САНАМСАРГҮЙ саатал (full jitter) нэм.
 * Экспоненциал ухралт + jitter: sleep = random(0, base * 2^n)
 * → 2000 оролдлогыг 30-90 секундэд жигд тарааж, нөөцийн багтаамжид багтана.
 *
 * ⚠️ Энэ бол зөвхөн зөөлрүүлэлт. Жинхэнэ засвар нь Render-ийн ТӨЛБӨРТЭЙ багц
 * (DEPLOY.md-ийг үз) — тэнд сервис унтардаггүй.
 */
const FIRST_TRY_TIMEOUT_MS = 12_000;
const WAKE_TRY_TIMEOUT_MS = 60_000;

/** Full jitter стратеги: дахин оролдохын өмнөх санамсаргүй саатал */
function jitterBackoff(attempt: number): number {
  const baseMs = 500; // эхний retry сугалаа 0-1000ms
  const maxMs = Math.min(baseMs * Math.pow(2, attempt), 30_000); // max 30s
  return Math.random() * maxMs;
}

/** Offline-ыг шалга */
function isOnline(): boolean {
  if (typeof navigator === "undefined") return true; // SSR дүрэм
  return navigator.onLine ?? true;
}

async function fetchWithWakeRetry(
  url: string,
  init: RequestInit,
): Promise<Response> {
  // Offline шалга — сүлжээгүйтэй байхад 12с хүлээхгүй
  if (!isOnline()) {
    throw new Error(
      "Интернэт холболтогүй. Сүлжээний холболтоо шалгаан дахин оролдоно уу.",
    );
  }

  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FIRST_TRY_TIMEOUT_MS),
    });
  } catch (error) {
    // Сүлжээний алдаа/timeout — сервер унтсан байж болзошгүй тул
    // житер-ээр саатаатаж дахин оролдоно.
    await new Promise((resolve) => {
      setTimeout(resolve, jitterBackoff(0));
    });

    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(WAKE_TRY_TIMEOUT_MS),
      });
    } catch {
      // Хоёр дахь оролдлога сүтэвэл — сервер үнэхээр унтарсан
      // эсвэл сүлжээ нь эвдэрсэн байна
      if (!isOnline()) {
        throw new Error(
          "Интернэт холболтогүй. Сүлжээний холболтоо шалгаан дахин оролдоно уу.",
        );
      }
      throw new Error(
        "Сервер хариу өгсөнгүй. Сервер удаан идэвхгүй байсан бол сэрэхэд " +
          "1 минут хүртэл хугацаа шаардагдана — хуудсаа шинэчилж дахин оролдоно уу.",
      );
    }
  }
}

/** In-flight GET хүсэлтийг dedupe хийх (ижил GET олон дор хийгдохыг сэргийл) */
const inflight = new Map<string, Promise<unknown>>();

/**
 * Сервер алдааны мессеж монгол бол түүнийг буцаа, англи бол өөрөө орчуул.
 * 503 (сервер идэвхгүй), 429 (хэт олон оролдлого), 401 (эрх гуй) —
 * өөр ойлгомжтой мессеж.
 */
function formatErrorMessage(status: number, serverMsg: string | null): string {
  // Сервер талын мессеж монгол үсэг агуулж байвал шууд буцаа
  if (serverMsg && /[Ѐ-ӿ]/.test(serverMsg)) {
    return serverMsg;
  }

  // Статус кодыг ялгах
  if (status === 503) {
    return "Сервер одоо сэргээгдэж байна. 1 минутын дараа дахин оролдоно уу.";
  }
  if (status === 429) {
    return "Хэт олон оролдлога. Хэсэг хугацаа хүлээсэний дараа дахин оролдоно уу.";
  }
  if (status === 401 || status === 403) {
    return "Эрх хүрэхгүй. Сэргээхэд нэвтрэх дахин оролдоно уу.";
  }
  if (status === 404) {
    return "Хайж байгаа өгөгдөл олдсонгүй.";
  }
  if (status >= 500) {
    return "Серверийн алдаа. Хүлээгээрэй, дахин оролдоно уу.";
  }

  // Сервер талын англи мессеж байвал орчуул
  if (serverMsg) {
    const lower = serverMsg.toLowerCase();
    if (lower.includes("unauthorized"))
      return "Эрх хүрэхгүй. Сэргээхэд нэвтрэх дахин оролдоно уу.";
    if (lower.includes("not found"))
      return "Хайж байгаа өгөгдөл олдсонгүй.";
    if (lower.includes("password"))
      return "Нууц үгийн алдаа.";
    // Ерөнхий англи мессеж мөн монгол үгийн аль нэгийг оруул (өөр нь байхгүй)
    return `Сервер: ${serverMsg}`;
  }

  return `Алдаа ${status}`;
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
  const method = opts.method ?? "GET";
  const init: RequestInit = {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  };

  // In-flight dedupe: GET хүсэлтийн боломж (POST/PUT/DELETE үл oруулах)
  if (method === "GET" && inflight.has(path)) {
    return (await inflight.get(path)) as T;
  }

  let res: Response;
  const fetchPromise = (async () => {
    try {
      return await fetchWithWakeRetry(`${API_URL}${path}`, init);
    } catch (e) {
      // fetch эсэргүүцвэл (сүлжээгүй, сервер унтарсан гэх мэт)
      // монгол, ойлгомжтой мессежээр хариу өг
      throw new Error(
        e instanceof Error && e.message
          ? e.message
          : "Сүлжээний алдаа — интернэт холболтоо шалгаад дахин оролдоно уу.",
      );
    }
  })();

  // GET нь in-flight dedupe-д оруул
  if (method === "GET") {
    inflight.set(path, fetchPromise);
  }

  try {
    res = await fetchPromise;
  } finally {
    // Promise дуусмагц dedupe-ээс хас
    if (method === "GET") {
      inflight.delete(path);
    }
  }

  const data = (await res.json().catch(() => null)) as T & {
    message?: string | string[];
  };
  if (!res.ok) {
    const msg = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message;
    const formatted = formatErrorMessage(res.status, msg ?? null);
    throw new Error(formatted);
  }
  return data;
}

/**
 * Файл (жишээ нь профайл зураг) сервер рүү явуулж key-г нь буцаана.
 * api()-аас тусдаа — FormData-д Content-Type-ийг браузер өөрөө тохируулна.
 * Том файл дээр нийтлэг timeout ба jitter нь хүрэхгүй байж болох учир
 * uploadFile нь илүү урт timeout (30с) ашигладаг.
 */
export async function uploadFile(
  file: File,
): Promise<{ key: string; size: number; mime: string }> {
  // Offline шалга
  if (!isOnline()) {
    throw new Error(
      "Интернэт холболтогүй. Сүлжээний холболтоо шалгаан дахин оролдоно уу.",
    );
  }

  const form = new FormData();
  form.append("file", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}/uploads`, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(30_000), // 30с file upload-д
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = data?.message;
      const formatted = formatErrorMessage(res.status, msg ?? null);
      throw new Error(formatted);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.message) {
      throw error;
    }
    if (!isOnline()) {
      throw new Error(
        "Интернэт холболтогүй. Сүлжээний холболтоо шалгаан дахин оролдоно уу.",
      );
    }
    throw new Error("Файл байршуулахад алдаа гарлаа.");
  }
}

// Хадгалсан файлын key-гээс шууд харах URL үүсгэнэ (профайл зураг, imageKey гэх мэт)
//
// GET /files/:key одоо JWT шаарддаг (аюулгүй байдлын засвар — өмнө нь
// хамгаалалтгүй байсан), гэвч энэ URL ихэвчлэн <img src="..."> дотор
// ашиглагддаг тул Authorization header дамжуулах боломжгүй. Тиймээс аль
// хэдийн байгаа access token-оо ?token= query параметраар хавсаргана —
// сервер тал үүнийг Bearer header-тэй яг адилхан баталгаажуулна
// (api/src/storage/files-auth.guard.ts-ийг үз).
export function fileUrl(key?: string | null): string | undefined {
  if (!key) return undefined;
  const token = getToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_URL}/files/${key}${query}`;
}

export function homeForRole(role: string): string {
  if (role === "ADMIN") return "/app/admin";
  if (role === "TEACHER" || role === "TEACHER_PLUS") return "/app/teacher";
  if (role === "STUDENT") return "/app/student";
  if (role === "PARENT") return "/app/parent";
  return "/app/buyer";
}

/**
 * Сервер хүрэлцэхүйц эсэхийг шалгана — шалгалтын өмнөх бэлтгэлийн дэлгэцэд.
 *
 * ⚠️ ЯАГААД ЭНЭ ФУНКЦ ХЭРЭГТЭЙ ВЭ (2026-08-08):
 * ExamIntro нь `fetch("/api/health")` гэж дуудаж байсан бөгөөд хоёр алдаатай:
 *   1. ХАРЬЦАНГУЙ зам — вэб Vercel, API Render дээр тул прод дээр 404.
 *   2. `/health` гэсэн маршрут API-д ОГТ БАЙХГҮЙ (app.controller дээр зөвхөн
 *      үндэс `@Get()` бий → `GET /api`).
 * Улмаас сурагчид ҮРГЭЛЖ «сүлжээ холбогдоогүй» гэж харагдах байсан.
 *
 * `navigator.onLine` нь зөвхөн сүлжээний КАРТ асаалттай эсэхийг мэднэ —
 * WiFi-д холбогдсон ч интернэт байхгүй байж болно. Тиймээс бодит хүсэлт явуулна.
 */
export async function pingApi(timeoutMs = 5000): Promise<boolean> {
  if (!isOnline()) return false;
  try {
    const res = await fetch(API_URL, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok;
  } catch {
    return false;
  }
}
