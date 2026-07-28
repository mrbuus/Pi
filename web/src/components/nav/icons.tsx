import type { SVGProps } from "react";

// Зүүн самбарын жижиг шугаман дүрсний нэгдсэн сан. Бүгд `currentColor`
// ашигладаг тул идэвхтэй/идэвхгүй өнгө нь эцэг элементийн text-* классаас
// автоматаар удамшина — тусад нь fill өгөх шаардлагагүй.
export type IconName =
  | "home"
  | "book-open"
  | "layers"
  | "play-circle"
  | "edit"
  | "target"
  | "calendar"
  | "list-checks"
  | "file-text"
  | "users"
  | "user-plus"
  | "clipboard-list"
  | "shield-check"
  | "shield"
  | "credit-card"
  | "key"
  | "user"
  | "chevron-down"
  | "panel-left"
  | "menu"
  | "x"
  | "logout"
  | "teacher";

const PATHS: Record<IconName, React.ReactNode> = {
  home: (
    <path d="M4 11.5 12 4l8 7.5M6 9.5V20h5v-5.5h2V20h5V9.5" />
  ),
  "book-open": (
    <path d="M12 6.2C10.4 5 8 4.5 4 4.5v14c4 0 6.4.5 8 1.7 1.6-1.2 4-1.7 8-1.7v-14c-4 0-6.4.5-8 1.7Zm0 0V20" />
  ),
  layers: (
    <path d="m12 3 9 4.7-9 4.7-9-4.7L12 3ZM3 12l9 4.7 9-4.7M3 16.3 12 21l9-4.7" />
  ),
  "play-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M10 8.6 15.5 12 10 15.4V8.6Z" />
    </>
  ),
  edit: (
    <path d="M4 20h4.2L18.8 9.4a2 2 0 0 0 0-2.8L17.4 5.2a2 2 0 0 0-2.8 0L4 15.8V20ZM13.3 6.7l4 4" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="0.6" fill="currentColor" />
    </>
  ),
  calendar: (
    <path d="M5 9.5h14M7.5 4v3M16.5 4v3M6 6h12a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7.5A1.5 1.5 0 0 1 6 6Z" />
  ),
  "list-checks": (
    <path d="M9 6.5h10M9 12h10M9 17.5h10M4 6.2l1 1 1.8-2M4 11.7l1 1 1.8-2M4 17.2l1 1 1.8-2" />
  ),
  "file-text": (
    <path d="M8 4.5h6l4 4V19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Zm5.5-.2V9h4.3M9.5 13h5M9.5 16.3h5" />
  ),
  users: (
    <path d="M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Zm-6 8.5c0-3.3 2.7-5.6 6-5.6s6 2.3 6 5.6M16.2 5.3a3.2 3.2 0 0 1 0 6.2M19.5 19.5c0-2.7-1.9-4.9-4.5-5.4" />
  ),
  "user-plus": (
    <path d="M10.5 11a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8ZM4 19.5c0-3.4 2.9-6 6.5-6s6.5 2.6 6.5 6M18.5 8.5v6M21.5 11.5h-6" />
  ),
  "clipboard-list": (
    <path d="M9 4.5h6a1 1 0 0 1 1 1V6h1.5A1.5 1.5 0 0 1 19 7.5V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V7.5A1.5 1.5 0 0 1 6.5 6H8v-.5a1 1 0 0 1 1-1Zm-.3 8.3h.01M8.7 16.3h.01M11 12.8h5M11 16.3h5" />
  ),
  "shield-check": (
    <path d="M12 3.8 5 6.5v5.4c0 4.6 3 7.4 7 9.3 4-1.9 7-4.7 7-9.3V6.5L12 3.8Zm-2.8 8.4 2 2 4-4.2" />
  ),
  shield: (
    <path d="M12 3.8 5 6.5v5.4c0 4.6 3 7.4 7 9.3 4-1.9 7-4.7 7-9.3V6.5L12 3.8Z" />
  ),
  "credit-card": (
    <path d="M4.5 7A1.5 1.5 0 0 1 6 5.5h12A1.5 1.5 0 0 1 19.5 7v10A1.5 1.5 0 0 1 18 18.5H6A1.5 1.5 0 0 1 4.5 17V7ZM4.5 10h15M8 14.3h3" />
  ),
  key: (
    <path d="M14 9.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Zm0 0L6 17.5m0 0v3h3m-3-3 2.2-2.2m1.5 1.5 2-2" />
  ),
  user: (
    <path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.9 3.1-6.6 7-6.6s7 2.7 7 6.6" />
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "panel-left": (
    <path d="M4.5 5.5h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1ZM9.5 5.5v13" />
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  logout: (
    <path d="M9 4.5H6A1.5 1.5 0 0 0 4.5 6v12A1.5 1.5 0 0 0 6 19.5h3M15.5 16l4-4-4-4M19 12H9" />
  ),
  teacher: (
    <path d="M4.5 5h15v10.5h-15V5Zm5 14.5 2.5-3 2.5 3M8.5 15.5v-2M15.5 15.5v-2" />
  ),
};

export function NavIcon({
  name,
  className = "h-[18px] w-[18px]",
  ...rest
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
