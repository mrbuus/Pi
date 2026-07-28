"use client";

import { useEffect, useState } from "react";
import ChangePasswordSection from "@/components/profile/ChangePasswordSection";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfilePhoto from "@/components/profile/ProfilePhoto";
import { api } from "@/lib/api";

interface Me {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  teacherCode?: string | null;
  studentCode?: string | null;
  role: string;
  avatarUrl?: string | null;
}

/* "Миний мэдээлэл" — эзний хүсэлтээр (SPEC) багшийн код, нэр/утас/имэйл,
   профайл зураг, нууц үг солих 4 хэсгийг НЭГ хуудсанд цуглуулав. Өмнө нь
   "Нууц үг солих" ганцаараа тод, гарцаагүй цэсийн зүйл байсныг эндэж
   шилжүүлсэн — @/components/nav/nav-data.ts-ийн PROFILE_LINK-ийг үз. */
export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Me>("/auth/me")
      .then(setMe)
      .catch((err) => setError(err instanceof Error ? err.message : "Алдаа гарлаа"));
  }, []);

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
        {error}
      </p>
    );
  }

  if (!me) {
    return (
      <p className="animate-pulse text-sm text-ink-dim" role="status">
        Ачаалж байна…
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Миний мэдээлэл</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Хувийн мэдээлэл, профайл зураг, нууц үгээ эндээс удирдана.
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold text-ink">Профайл зураг</h2>
        <div className="mt-4">
          <ProfilePhoto
            me={me}
            onUpdated={(avatarUrl) => setMe((prev) => (prev ? { ...prev, avatarUrl } : prev))}
          />
        </div>
      </section>

      <ProfileInfo me={me} role={me.role} />

      <ChangePasswordSection />
    </div>
  );
}
