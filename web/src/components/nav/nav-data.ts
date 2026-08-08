import type { IconName } from "./icons";

export interface NavLink {
  href: string;
  label: string;
  icon: IconName;
}

export type GroupKey = "learn" | "class" | "admin" | "personal";

// Бүлгийн монгол шошго — эзний хүсэлтээр чиг үүргээр нь бүлэглэсэн.
export const GROUP_LABEL: Record<GroupKey, string> = {
  learn: "Сургалт",
  class: "Анги",
  admin: "Удирдлага",
  personal: "Хувийн",
};

export const GROUP_ICON: Record<GroupKey, IconName> = {
  learn: "book-open",
  class: "calendar",
  admin: "shield",
  personal: "user",
};

// Role бүрийн НҮҮР (dashboard) холбоос — самбарын дээд хэсэгт бүлэглэлгүй,
// тод байдлаар харагдана.
export const HOME: Record<string, NavLink> = {
  STUDENT: { href: "/app/student", label: "Миний самбар", icon: "home" },
  TEACHER: { href: "/app/teacher", label: "Багшийн самбар", icon: "home" },
  TEACHER_PLUS: { href: "/app/teacher", label: "Багшийн самбар", icon: "home" },
  ADMIN: { href: "/app/admin", label: "Удирдлага", icon: "home" },
  BUYER: { href: "/app/buyer", label: "Миний эрхүүд", icon: "home" },
  PARENT: { href: "/app/parent", label: "Хүүхдийн явц", icon: "home" },
};

// Role бүрийн бүрэн цэс — өмнөх хэвтээ цэстэй ЯГ ижил маршрут, зөвхөн
// бүлэглэж, самбарт зориулж дахин зохион байгуулав. Шинэ маршрут ОРУУЛААГҮЙ.
const NAV_BY_ROLE: Record<string, NavLink[]> = {
  STUDENT: [
    HOME.STUDENT,
    { href: "/app/learn", label: "Хичээл үзэх", icon: "book-open" },
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/goals", label: "Миний зорилго", icon: "target" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/student/payments", label: "Миний төлбөр", icon: "credit-card" },
  ],
  TEACHER: [
    HOME.TEACHER,
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/planner", label: "Төлөвлөгч", icon: "list-checks" },
    { href: "/app/admin/theory", label: "Онолын агуулга", icon: "file-text" },
  ],
  TEACHER_PLUS: [
    HOME.TEACHER_PLUS,
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/payments", label: "Төлбөр", icon: "credit-card" },
    { href: "/app/admin/leads", label: "Хүсэлтүүд", icon: "user-plus" },
    { href: "/app/admin/enrollment", label: "Элсэлтийн удирдлага", icon: "clipboard-list" },
    { href: "/app/admin/reconcile", label: "Банкны тулгалт", icon: "building" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/planner", label: "Төлөвлөгч", icon: "list-checks" },
    { href: "/app/admin/theory", label: "Онолын агуулга", icon: "file-text" },
    { href: "/app/admin/students", label: "Сурагчид", icon: "users" },
    { href: "/app/admin/audit", label: "Аудит", icon: "shield-check" },
    { href: "/app/admin/analytics", label: "Аналитик", icon: "bar-chart" },
    { href: "/app/sms", label: "Дугаарлуу мессеж", icon: "message-square" },
  ],
  ADMIN: [
    HOME.ADMIN,
    { href: "/app/teacher", label: "Багшийн самбар", icon: "teacher" },
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/tests", label: "Шалгалт", icon: "clipboard-check" },
    { href: "/app/admin/leads", label: "Хүсэлтүүд", icon: "user-plus" },
    { href: "/app/admin/enrollment", label: "Элсэлтийн удирдлага", icon: "clipboard-list" },
    { href: "/app/admin/reconcile", label: "Банкны тулгалт", icon: "building" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
    { href: "/app/planner", label: "Төлөвлөгч", icon: "list-checks" },
    { href: "/app/admin/theory", label: "Онолын агуулга", icon: "file-text" },
    { href: "/app/admin/students", label: "Сурагчид", icon: "users" },
    { href: "/app/admin/audit", label: "Аудит", icon: "shield-check" },
    { href: "/app/admin/analytics", label: "Аналитик", icon: "bar-chart" },
    { href: "/app/sms", label: "Дугаарлуу мессеж", icon: "message-square" },
  ],
  BUYER: [
    HOME.BUYER,
    { href: "/app/library", label: "Бодлогын сан", icon: "layers" },
    { href: "/app/videos", label: "Онлайн хичээл", icon: "play-circle" },
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
  ],
  PARENT: [
    HOME.PARENT,
    { href: "/app/schedule", label: "Хуваарь", icon: "calendar" },
  ],
};

// Маршрут бүрийг аль бүлэгт харьяалагдахыг тодорхойлно (нүүр хуудсуудаас бусад).
const ITEM_GROUP: Record<string, GroupKey> = {
  "/app/learn": "learn",
  "/app/library": "learn",
  "/app/videos": "learn",
  "/app/tests": "learn",
  "/app/teacher": "class",
  "/app/schedule": "class",
  "/app/planner": "class",
  "/app/admin/leads": "admin",
  "/app/admin/enrollment": "admin",
  "/app/admin/reconcile": "admin",
  "/app/admin/theory": "admin",
  "/app/admin/students": "admin",
  "/app/admin/audit": "admin",
  "/app/admin/analytics": "admin",
  "/app/payments": "admin",
  "/app/sms": "admin",
  "/app/goals": "personal",
  "/app/student/payments": "personal",
};

// Өмнө нь "Нууц үг солих" тусдаа, гарцаагүй тод цэсийн зүйл байсан — эзний
// хүсэлтээр /app/profile дотор нэг хэсэг болгон шилжүүлж, оронд нь энд зөвхөн
// "Миний мэдээлэл"-руу орох ганц холбоос үлдээв. Role бүрт нийтлэг тул
// автоматаар Хувийн бүлэгт нэмэгдэнэ.
const PROFILE_LINK: NavLink = { href: "/app/profile", label: "Миний мэдээлэл", icon: "user" };

export interface NavGroup {
  key: GroupKey;
  label: string;
  icon: IconName;
  items: NavLink[];
}

export interface RoleNav {
  home: NavLink | null;
  groups: NavGroup[];
}

const GROUP_ORDER: GroupKey[] = ["learn", "class", "admin", "personal"];

export function getRoleNav(role: string | null): RoleNav {
  const items = role ? NAV_BY_ROLE[role] ?? [] : [];
  const home = items[0] ?? null;
  const rest = items.slice(1);

  const buckets: Record<GroupKey, NavLink[]> = {
    learn: [],
    class: [],
    admin: [],
    personal: [],
  };
  for (const item of rest) {
    const group = ITEM_GROUP[item.href] ?? "learn";
    buckets[group].push(item);
  }
  buckets.personal.push(PROFILE_LINK);

  const groups = GROUP_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    label: GROUP_LABEL[key],
    icon: GROUP_ICON[key],
    items: buckets[key],
  }));

  return { home, groups };
}

// Дээд самбарт харуулах хуудасны гарчиг — идэвхтэй маршрутын шошгыг
// цэсний өгөгдлөөс олж ашиглана (шинэ мэдээлэл зохиохгүй).
export function getPageTitle(role: string | null, pathname: string): string {
  const { home, groups } = getRoleNav(role);
  if (home?.href === pathname) return home.label;
  for (const group of groups) {
    const hit = group.items.find((item) => item.href === pathname);
    if (hit) return hit.label;
  }
  return "";
}
