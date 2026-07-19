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
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
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
  return "/app/buyer";
}
