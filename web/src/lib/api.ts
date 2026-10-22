const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

/**
 * «Намайг сана» (эзэн 2026-10-22). Чагталсан бол токен localStorage-д (хөтөч
 * хаасан ч үлдэнэ, сервер 30 хоног), эс бол sessionStorage-д (хөтөч/таб хаахад
 * устана, сервер 12 цаг). Уншихдаа sessionStorage-ийг түрүүлж харна.
 */
const TOKEN_KEY = "pi_token";
const ROLE_KEY = "pi_role";

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null; // Зарим хувийн горимд хандах эрхгүй
  }
}

function readAuth(key: string): string | null {
  if (typeof window === "undefined") return null;
  return sessionStore()?.getItem(key) ?? localStorage.getItem(key);
}

export function getToken(): string | null {
  return readAuth(TOKEN_KEY);
}

export function getRole(): string | null {
  return readAuth(ROLE_KEY);
}

/**
 * remember: true → localStorage, false → sessionStorage. Заагаагүй бол (нууц
 * үг сольсны дараах шинэ токен гэх мэт) одоогийн хадгалах газраа хэвээр.
 */
export function setAuth(token: string, role: string, remember?: boolean) {
  sessionVersion += 1;
  inflight.clear();
  const session = sessionStore();
  const persistent = remember ?? !session?.getItem(TOKEN_KEY);
  const target = persistent || !session ? localStorage : session;
  const other = target === localStorage ? session : localStorage;
  other?.removeItem(TOKEN_KEY);
  other?.removeItem(ROLE_KEY);
  target.setItem(TOKEN_KEY, token);
  target.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  sessionVersion += 1;
  inflight.clear();
  for (const store of [localStorage, sessionStore()]) {
    store?.removeItem(TOKEN_KEY);
    store?.removeItem(ROLE_KEY);
  }
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
 * (STATUS.md §4-ийг үз) — тэнд сервис унтардаггүй.
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
  } catch {
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
let sessionVersion = 0;

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
  if (status === 401) {
    return "Нэвтрэлт дууссан байна. Дахин нэвтэрнэ үү.";
  }
  if (status === 403) {
    return "Энэ хэсэгт таны эрх хүрэхгүй байна. Шаардлагатай бол админаас эрх хүснэ үү.";
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

/** HTTP failures retain their status without changing existing Error/message callers. */
export class ApiError extends Error {
  /** body — серверийн задалсан хариу (ж: 409 VERSION_CONFLICT-ийн changedBy, currentVersion). */
  constructor(message: string, public readonly status: number, public readonly body?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; responseType?: "json" | "text" } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  const token = opts.auth === false ? null : getToken();
  const requestSession = sessionVersion;
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const method = (opts.method ?? "GET").toUpperCase();
  // Keys stay in memory and include identity/representation; never persist or log them.
  const requestKey = JSON.stringify([path, opts.responseType ?? "json", headers, requestSession]);
  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    body: opts.body === undefined ? undefined : isFormData ? opts.body as FormData : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body),
  };

  // In-flight dedupe: ижил GET зэрэг хийгдвэл нэг л хүсэлт явна.
  //
  // ⚠️ ЗАССАН (2026-08-08): өмнө нь dedupe нь ЗАДЛААГҮЙ Response обьектын
  // promise-ийг хадгалдаг байв. Хоёр дахь дуудагч JSON-ий оронд Response
  // авч, `.map`/`.filter`/`for..of` бүгд шууд унадаг байсан. React-ийн dev
  // горим effect бүрийг ХОЁР удаа ажиллуулдаг тул бараг ХУУДАС БҮР унаж
  // байв (leads.filter is not a function, chaptersWithVideos is not
  // iterable…). Прод дээр ч нэг endpoint-ийг хоёр компонент зэрэг дуудвал
  // мөн адил унана. Одоо dedupe нь ЭЦСИЙН задалсан өгөгдлийн promise-ийг
  // хадгална — хэн ч авсан ижил, зөв үр дүн.
  if (method === "GET" && inflight.has(requestKey)) {
    return (await inflight.get(requestKey)) as T;
  }

  const resultPromise = (async () => {
    let res: Response;
    try {
      res = await fetchWithWakeRetry(`${API_URL}${path}`, init);
    } catch (e) {
      // fetch эсэргүүцвэл (сүлжээгүй, сервер унтарсан гэх мэт)
      // монгол, ойлгомжтой мессежээр хариу өг
      throw new Error(
        e instanceof Error && e.message
          ? e.message
          : "Сүлжээний алдаа — интернэт холболтоо шалгаад дахин оролдоно уу.",
      );
    }

    const data = (opts.responseType === "text" ? await res.text().catch(() => "") : await res.json().catch(() => null)) as T & {
      message?: string | string[];
    };
    if (opts.auth !== false && (requestSession !== sessionVersion || token !== getToken())) {
      throw new ApiError("Нэвтрэх төлөв өөрчлөгдсөн. Хуудсаа дахин нээнэ үү.", 401);
    }
    if (!res.ok) {
      const msg = Array.isArray(data?.message)
        ? data.message.join(", ")
        : data?.message;
      const formatted = formatErrorMessage(res.status, msg ?? null);
      throw new ApiError(formatted, res.status, data);
    }
    return data;
  })();

  if (method === "GET") {
    inflight.set(requestKey, resultPromise);
    // Дуусмагц (амжилт/алдаа аль аль нь) dedupe-ээс хасна. `.catch(() => {})`
    // нь энэ ТУСЛАХ гинжийг unhandled rejection болгохоос сэргийлнэ —
    // жинхэнэ алдаа нь доорх return-ээр дуудагч бүрт хэвээр очно.
    resultPromise
      .finally(() => {
        if (inflight.get(requestKey) === resultPromise) inflight.delete(requestKey);
      })
      .catch(() => {});
  }

  return resultPromise;
}

/**
 * Файл (жишээ нь профайл зураг) сервер рүү явуулж key-г нь буцаана.
 * api()-аас тусдаа — FormData-д Content-Type-ийг браузер өөрөө тохируулна.
 * Том файл дээр нийтлэг timeout ба jitter нь хүрэхгүй байж болох учир
 * uploadFile нь илүү урт timeout (30с) ашигладаг.
 */
/**
 * Файлын зориулалт — хадгалах хугацааг тодорхойлно (эзэн 2026-10-22):
 * `homework` 7 хоногийн дараа устна, `theory` болон бусад нь байнга.
 */
export type UploadPurpose = "homework" | "theory" | "general";

type Uploaded = { key: string; size: number; mime: string };

/** Хөтчийн мэдэгдэх mime хоосон байж болно (HEIC) — өргөтгөлөөс нөхнө */
function guessMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "application/pdf";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return ext ? `image/${ext}` : "application/octet-stream";
}

/**
 * S3 руу ШУУД илгээх: presign → PUT (сервер байт дамжуулахгүй) → complete.
 * Сервер S3-гүй бол null буцаана — дуудагч хуучин multipart зам руу шилжинэ.
 */
async function uploadDirect(file: File, purpose: UploadPurpose): Promise<Uploaded | null> {
  const mime = guessMime(file);
  const plan = await api<{
    direct: boolean;
    url?: string;
    ticket?: string;
    headers?: Record<string, string>;
  }>("/uploads/presign", {
    method: "POST",
    body: { name: file.name, mime, size: file.size, purpose },
  });
  if (!plan.direct || !plan.url || !plan.ticket) return null;
  const put = await fetch(plan.url, {
    method: "PUT",
    headers: plan.headers ?? { "Content-Type": mime },
    body: file,
    signal: AbortSignal.timeout(120_000), // утасны сүлжээнд 10 хуудас PDF
  });
  if (!put.ok) throw new Error("Файл байршуулахад алдаа гарлаа.");
  return api<Uploaded>("/uploads/complete", {
    method: "POST",
    body: { ticket: plan.ticket },
  });
}

export async function uploadFile(
  file: File,
  opts: { purpose?: UploadPurpose } = {},
): Promise<Uploaded> {
  // Offline шалга
  if (!isOnline()) {
    throw new Error(
      "Интернэт холболтогүй. Сүлжээний холболтоо шалгаан дахин оролдоно уу.",
    );
  }
  const purpose = opts.purpose ?? "general";

  // 1) S3 руу шууд — серверийн ачаалал хамгийн бага. Серверийн шалгалтын алдаа
  //    (төрөл, хэмжээ) бол шууд хэрэглэгчид; сүлжээ/CORS алдаа бол 2) руу.
  try {
    const direct = await uploadDirect(file, purpose);
    if (direct) return direct;
  } catch (error) {
    // 404 = хуучин API (presign маршрутгүй) — хуучин зам руу шилжинэ
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 404)
      throw error;
  }

  // 2) Хуучин зам: сервер дамжуулж хадгална. purpose-ийг файлаас ӨМНӨ — multer
  //    body-г файлын өмнөх талбараас уншина.
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", file);
  const headers: Record<string, string> = {};
  const token = getToken();
  const requestSession = sessionVersion;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_URL}/uploads`, {
      method: "POST",
      headers,
      body: form,
      signal: AbortSignal.timeout(30_000), // 30с file upload-д
    });
    const data = await res.json().catch(() => null);
    if (requestSession !== sessionVersion || token !== getToken()) {
      throw new ApiError("Нэвтрэх төлөв өөрчлөгдсөн. Хуудсаа дахин нээнэ үү.", 401);
    }
    if (!res.ok) {
      const msg = data?.message;
      const formatted = formatErrorMessage(res.status, msg ?? null);
      throw new ApiError(formatted, res.status);
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
/** API-ийн бүтэн хаяг — нийтийн (токенгүй) зурагт, ж: үнэгүй тестийн бодлогын зураг */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

export function fileUrl(key?: string | null): string | undefined {
  if (!key) return undefined;
  const token = getToken();
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${API_URL}/files/${key}${query}`;
}

/**
 * Нэвтэрсний дараа буцах зам (?next=). Зөвхөн сайтын дотоод, «/»-ээр эхэлсэн зам —
 * «//evil.com», «http://…», «/login» зэргийг хүлээж авахгүй (open redirect-ээс сэргийлнэ).
 */
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || /[\\\s]/.test(raw)) return null;
  if (/^\/(login|register|forgot-password)(\/|\?|#|$)/.test(raw)) return null;
  return raw;
}

/** Одоогийн хаягийн ?next= утгыг аюулгүй уншина (нэвтрэх/бүртгүүлэх хуудас) */
export function nextFromLocation(): string | null {
  if (typeof window === "undefined") return null;
  return safeNext(new URLSearchParams(window.location.search).get("next"));
}

export function homeForRole(role: string): string {
  if (role === "GROUP_TEACHER") return "/app/groups";
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
