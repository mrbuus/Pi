"use client";

import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { api, fileUrl, uploadFile } from "@/lib/api";

export interface ProfileMe {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/* Профайл зураг байршуулах — POST /uploads (uploadFile()) → POST
   /auth/me/avatar урсгал аль хэдийн API дээр байгааг зөвхөн энд холбов, шинэ
   endpoint үүсгээгүй. IdentityBadge (app/layout.tsx)-ийн адил дугуй, initials
   fallback-той харагдана — зөвхөн энд том хэмжээтэй. */
export default function ProfilePhoto({
  me,
  onUpdated,
}: {
  me: ProfileMe;
  onUpdated: (avatarUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зургийн файл (JPG, PNG гэх мэт) сонгоно уу");
      return;
    }
    setUploading(true);
    try {
      const { key } = await uploadFile(file);
      const res = await api<{ avatarUrl: string }>("/auth/me/avatar", {
        method: "POST",
        body: { key },
      });
      onUpdated(res.avatarUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Зураг байршуулахад алдаа гарлаа");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-brand-bright/20 text-xl font-bold text-brand-soft">
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl(me.avatarUrl)}
            alt={`${me.firstName} ${me.lastName} профайл зураг`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials(me.firstName, me.lastName)
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/40 text-xs font-semibold text-on-brand">
            …
          </span>
        )}
      </span>
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="sr-only"
          id="avatar-upload-input"
        />
        <label
          htmlFor="avatar-upload-input"
          aria-disabled={uploading}
          className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-panel ${
            uploading ? "pointer-events-none opacity-50" : ""
          }`}
        >
          <Camera className="h-4 w-4 shrink-0" aria-hidden="true" strokeWidth={1.7} />
          {me.avatarUrl ? "Зураг солих" : "Зураг нэмэх"}
        </label>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
