import type { SVGProps } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Home,
  KeyRound,
  Library,
  ListChecks,
  LogOut,
  Menu,
  PanelLeft,
  PlayCircle,
  Shield,
  ShieldCheck,
  Target,
  User,
  Users,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

// Зүүн самбарын шугаман дүрсний нэгдсэн сан — lucide-react ашигладаг тул
// tree-shake хийгддэг (зөвхөн доор жагсаасан icon-ууд bundle-д орно). Бүгд
// `currentColor` ашигладаг тул идэвхтэй/идэвхгүй өнгө нь эцэг элементийн
// text-* классаас автоматаар удамшина — тусад нь fill өгөх шаардлагагүй.
export type IconName =
  | "home"
  | "book-open"
  | "layers"
  | "play-circle"
  | "clipboard-check"
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

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  "book-open": BookOpen,
  layers: Library,
  "play-circle": PlayCircle,
  "clipboard-check": ClipboardCheck,
  target: Target,
  calendar: CalendarDays,
  "list-checks": ListChecks,
  "file-text": FileText,
  users: Users,
  "user-plus": UserPlus,
  "clipboard-list": ClipboardList,
  "shield-check": ShieldCheck,
  shield: Shield,
  "credit-card": CreditCard,
  key: KeyRound,
  user: User,
  "chevron-down": ChevronDown,
  "panel-left": PanelLeft,
  menu: Menu,
  x: X,
  logout: LogOut,
  teacher: GraduationCap,
};

export function NavIcon({
  name,
  className = "h-[18px] w-[18px]",
  ...rest
}: { name: IconName } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[name];
  return (
    <Icon
      strokeWidth={1.7}
      aria-hidden="true"
      className={`shrink-0 ${className}`}
      {...rest}
    />
  );
}
