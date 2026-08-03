"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * Сүлжээ тасарсныг ХЭРЭГЛЭГЧИД шууд хэлэх туузан мэдэгдэл.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ (эзний шаардлага: "интернэтийн гацалтад нөлөөлөх ёсгүй"):
 * сүлжээ тасрахад товч дарсан ч юу ч болохгүй, эсвэл ойлгомжгүй алдаа гарна.
 * Тэгэхэд хэрэглэгч "энэ вэб эвдэрсэн" гэж дүгнэдэг — үнэндээ интернэт нь
 * тасарсан байхад. Шалтгааныг нь тодорхой хэлбэл итгэл алдагдахгүй.
 *
 * Хэрэгжүүлэлт нь ЗӨВХӨН браузерын `online`/`offline` эвентээс хамаарна —
 * нэмэлт сүлжээний шалгалт (ping) ЯВУУЛАХГҮЙ. Учир нь удаан холболт дээр
 * тийм шалгалт өөрөө нөөц идэж, байдлыг улам мууруулна.
 */
export default function ConnectionStatus() {
  // Сервер дээр `navigator` байхгүй тул эхлэлийн утга нь ҮРГЭЛЖ "онлайн".
  // Ингэснээр hydration зөрчил гарахгүй — бодит утгыг эффект дотор авна.
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="enter-fade fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 border-t border-warning/40 bg-warning/15 px-4 py-2 text-sm font-semibold text-warning backdrop-blur-sm"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      Интернэт холболт тасарлаа. Холбогдмогц үргэлжлүүлэх боломжтой.
    </div>
  );
}
