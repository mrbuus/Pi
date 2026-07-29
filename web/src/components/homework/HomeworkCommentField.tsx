"use client";

import { useEffect, useRef, useState } from "react";

interface HomeworkCommentFieldProps {
  id: string;
  /** screen reader-д зориулсан sr-only label */
  label: string;
  value: string;
  onSave: (value: string) => void;
  disabled?: boolean;
}

const DEBOUNCE_MS = 700;

/**
 * Гэрийн даалгаврын тэмдэглэгээний чөлөөт тайлбар (тайлбар) — багш ямар ч
 * зүйл бичиж болно. Бичих үед шууд хариу үзүүлж (локал төлөв), гэхдээ
 * сервер рүү debounce хийж хадгална (`onSave` DEBOUNCE_MS-ийн дараа л
 * дуудагдана) — товшилт бүрд API дуудахгүй.
 */
export default function HomeworkCommentField({
  id,
  label,
  value,
  onSave,
  disabled,
}: HomeworkCommentFieldProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Гаднаас (жишээ нь өдөр сольсноор) шинэ утга ирвэл локал төлвийг sync
  // хийнэ — гэхдээ дан ганц бичих явцад дундуур дарагдахгүй, учир нь
  // эцэг компонент амжилттай хадгалсны дараа ЛОКАЛ утгаа шууд ашигладаг
  // (дахин fetch хийхгүй), зөвхөн `value` prop өөрчлөгдөх нь өдөр/анги
  // солигдоход л тохиолдоно.
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleChange(next: string) {
    setLocal(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(next), DEBOUNCE_MS);
  }

  function handleBlur() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (local !== value) onSave(local);
  }

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={local}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Тайлбар (сонголтоор)…"
        className="w-full rounded-lg border border-info/40 bg-info/10 px-3 py-2 text-sm text-ink outline-none placeholder:text-info/60 focus:border-info"
      />
    </div>
  );
}
