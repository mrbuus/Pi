"use client";

import { useEffect, useState } from "react";
import ChangePasswordSection from "@/components/profile/ChangePasswordSection";
import ProfileInfo from "@/components/profile/ProfileInfo";
import ProfilePhoto from "@/components/profile/ProfilePhoto";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";

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
      .catch((err) => setError(err instanceof Error ? err.message : "Профайл ачаалахад алдаа гарлаа"));
  }, []);

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setError("");
          setMe(null);
          api<Me>("/auth/me")
            .then(setMe)
            .catch((err) => setError(err instanceof Error ? err.message : "Профайл ачаалахад алдаа гарлаа"));
        }}
      />
    );
  }

  if (!me) {
    return (
      <LoadingState rows={3} label="Ачаалж байна" />
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
